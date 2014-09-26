var browserify= require('browserify')
var watchify  = require('watchify')
var answers   = require('./lib/create-answers')
var through   = require('through')
var styles    = require('./style')
var extend    = require('extend')
var inject    = require('inject-script')
var opener    = require('opener')
var mkdirp    = require('mkdirp')
var chalk     = require('chalk')
var brfs      = require('brfs')
var http      = require('http')
var path      = require('path')
var url       = require('url')
var sse       = require('sse-stream')('/sse')
var fs        = require('fs')

var DEV = process.env.NODE_ENV === 'development'

var mainPort = 12492
var closeWindow = fs.readFileSync(
  path.join(__dirname, 'browser/close-window.html')
)

module.exports = init

function init(opt) {
  opt = opt || {}
  mainPort = opt.port || mainPort
  var exercises = opt.exercises || {}
    , exercisesDir = opt.exercisesDir || 'exercises'
    , root = opt.root || process.cwd()
    , lastUpdate = 0
    , tmpDir = path.resolve(root, '.tmp')
    , events = through()

  mkdirp.sync(tmpDir)

  printIntro(opt.title)

  opt.exercisesDir = exercisesDir
  opt.mainBundler = opt.mainBundler || function () {}

  setupSolutions(setupBundles)

  function setupSolutions(cb) {
    answers(exercises, exercisesDir, root, cb)
  }

  function setupBundles() {
    console.log('Done!')
    var exNames  = Object.keys(exercises)
    var exLinks  = exNames.map(function(k) { return exercises[k] }).filter(Boolean)

    var exFiles  = exLinks.map(function(link) {
      var dir = path.resolve(root, link)

      // filter out dotfiles
      return fs.readdirSync(dir).filter(function (name) {
        return name.charAt(0) !== '.'
      }).map(function(name) {
        return path.resolve(dir, name)
      })
    })

    var exFileBundles = exLinks.map(function (link, i) {
      var bundlerPath = path.join(exercisesDir, link, 'bundler.js')
      if (fs.existsSync(bundlerPath)) {
        return require(bundlerPath)
      }
      return function () {}
    })

    var exBundles = exLinks.map(function(link, i) {
      var exPath = path.join(exercisesDir, link, 'index.js')
      return function (b) {
        b.require(exPath, { expose: link })
        // exFileBundles[i](b)
      }
    })

    var exRoutes = exLinks.map(function(link, i) {
      if (exFiles[i].length === 0) {
        return function (req, res) {
          res.end()
        }
      }
      var w = watchify()
      exFiles[i].forEach(function (file) {
        // w.add(file)
        w.require(file, { expose: path.basename(file) })
      })
      // opt.mainBundler(w)
      exFileBundles[i](w)
      w.on('update', function (file) {
        // console.log('file updated', file)
        lastUpdate = Date.now()
        events.queue(path.basename(file))
      })
      return function (req, res) {
        if (DEV) {
          console.log('bundling', link)
        }
        res.setHeader('content-type', 'text/javascript')
        w.bundle().on('error', function (e) {
          if (DEV) {
            console.error('error bundling', link)
            console.error(e)
          }
          res.end('window.LOAD_FAILED = true; throw new Error("'+e.message.replace(/"/g, '\\"')+'")')
        }).pipe(res)
      }
    })

    var currentExercise = function (req, res, next) { next() };
    var exercise = function (name, route, req, res) {
      if (/\.js$/.test(req.url)) {
        route(req, res)
      } else {
        // start this example's server
        if (new RegExp(name+'$').test(req.url) || !currentExercise) {
          // requesting index.html
          try {
            currentExercise = require(path.join(exercisesDir, name, 'server.js'))
          } catch (err) {
            currentExercise = function (req, res, next) {
              next()
            }
          }
        }
        currentExercise(req, res, function () {
          // serve index.html
          res.setHeader('content-type', 'text/html')
          fs.createReadStream(path.resolve(__dirname, 'browser/index.html'))
            .pipe(inject(name + '.js'))
            .pipe(res)
        })
      }
    }

    console.log('Bundling some files for the browser...')
    createMainRoute(opt, tmpDir, exBundles, function (err, main) {
      console.log('Done!')
      createServer(main)
    })

    function createServer(main) {
      var server = http.createServer(function(req, res) {
        var uri = url.parse(req.url).pathname
        var paths = uri.split('/').filter(Boolean)

        if (uri === '/style.css') {
          res.setHeader('content-type', 'text/css')
          res.end(styles())
          return
        }

        if (uri === '/main.js') {
          main(req, res)
          return
        }

        if (paths[0] === 'open') {
          opener(path.join(root, paths[1]))
          return res.end(closeWindow)
        }

        for (var i = 0; i < exLinks.length; i++) {
          if (uri.indexOf(exLinks[i]) === 1) {
            return exercise(exLinks[i], exRoutes[i], req, res)
          }
        }

        currentExercise(req, res, function () {
          main(req, res)
        })
      }).listen(mainPort, function(err) {
        if (err) throw err

        var url = 'http://localhost:'+mainPort

        console.log('Booting up the workshop in your browser in just a second...')
        setTimeout(function () {
          opener(url)
          console.log(chalk.yellow('WORKSHOP URL:'), chalk.underline.blue(url))
          console.log()
        }, 1000)
      })

      sse.install(server)

      sse.on('connection', function (client) {
        events.pipe(client)
      })
    }
  }
}


function printIntro(title) {
  var defaultTitle = 'browser workshopper'
  var center = require('center-text')
  title = center(title, { columns: defaultTitle.length })
  console.log(fs.readFileSync(
    __dirname + '/intro.txt', 'utf8'
  ).replace(defaultTitle, title))

}

function createMainRoute(opt, tmpDir, exBundles, cb) {
  function bundleOpts(b) {
    opt.mainBundler(b)
    exBundles.forEach(function (fn) {
      fn(b)
    })
    b.transform({ global: true }, require('envify/custom')({
        title: opt.title
      , exercises: opt.exercisesDir
    }))
    b.transform(require.resolve('brfs'))
  }

  if (DEV) {
    var beefy = require('beefy')
    return cb(null, beefy({
        cwd: path.join(__dirname, 'browser')
      , entries: ['main.js']
      , quiet: false
      , watchify: false
      , live: true
      , bundler: function (path) {
        var b = browserify(opt.bundlerOpts || {})
        b.add(path)
        bundleOpts(b)
        return {stdout: b.bundle(), stderr: through()}
      }
    }))
  }

  var b = browserify()
  b.add(path.resolve(__dirname, 'browser/main.js'))
  var srcPath = path.resolve(tmpDir, 'main.js')
  var file = fs.createWriteStream(srcPath)
  bundleOpts(b)
  b.bundle().pipe(file).on('finish', function (err) {
    cb(err, function (req, res, next) {
      if (req.url === '/main.js') {
        res.setHeader('content-type', 'text/javascript')
        fs.createReadStream(srcPath).pipe(res)
      } else if (req.url === '/') {
        res.setHeader('content-type', 'text/html')
        fs.createReadStream(__dirname + '/browser/index.html').pipe(res)
      }
      if (next) next()
    })
  })
}
