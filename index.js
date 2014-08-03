var browserify= require('browserify')
var watchify  = require('watchify')
var answers   = require('./lib/create-answers')
var through   = require('through')
var styles    = require('./style')
var extend    = require('extend')
var inject    = require('./lib/inject-script')
var opener    = require('opener')
var mkdirp    = require('mkdirp')
var beefy     = require('beefy')
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
  path.join(__dirname, 'lib/close-window.html')
)

module.exports = createServer

function createServer(opt) {
  opt = opt || {}
  mainPort = opt.port || mainPort
  var exercises = opt.exercises || {}
    , exercisesDir = opt.exercisesDir || 'exercises'
    , root = opt.root || process.cwd()
    , lastUpdate = 0
    , tmpDir = path.resolve(root, '.tmp')
    , events = through()

  opt.mainBundler = opt.mainBundler || function () {}

  mkdirp.sync(tmpDir)

  printIntro(opt.title)

  answers(exercises, exercisesDir, root, function(err) {
    console.error('Done!')
    console.error('Booting up the workshop in your browser in just a second...')
    console.error('')
    setTimeout(loadedAnswers, 1000)
  })

  function loadedAnswers(err) {
    if (err) throw err
    var exNames  = Object.keys(exercises)
    var exLinks  = exNames.map(function(k) { return exercises[k] })
    var exFiles  = exLinks.map(function(link) {
      var dir = path.resolve(root, link)

      return fs.readdirSync(dir).map(function(name) {
        return path.resolve(dir, name)
      })
    })
    var exFileBundles = exLinks.map(function (link, i) {
      var bundlerPath = path.join(exercisesDir, link, 'bundler.js')
      if (fs.existsSync(bundlerPath)) {
        // console.log(bundlerPath)
        return require(bundlerPath)
      }
      return function () {}
    })

    var exBundles = exLinks.map(function(link, i) {
      var exPath = path.join(exercisesDir, link, 'index.js')
      // return ['-r', exPath+':'+link]
      // return [exPath, {expose: link}]
      return function (b) {
        // console.log(link)
        b.require(exPath, { expose: link })
        exFileBundles[i](b)
      }
    })
    // .reduce(function (a, b) {
    //   return a.concat(b)
    // })
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
      exFileBundles.forEach(function (fn) {
        fn(w)
      })
      w.on('update', function (file) {
        console.log('file updated', file)
        lastUpdate = Date.now()
        events.queue(path.basename(file))
      })
      return function (req, res) {
        console.log('bundling', link)
        res.setHeader('content-type', 'text/javascript')
        w.bundle().on('error', function (e) {
          console.error(e)
        }).pipe(res)
      }
      // return beefy({
      //     cwd: path.join(root, link)
      //   , entries: exFiles[i].map(path.basename)
      //   , live: true
      //   , watchify: false
      //   , quiet: false
      //   , bundlerFlags: exFiles[i].map(function (file) {
      //       return ['-r', file + ':' + path.basename(file)]
      //     }).reduce(function (a, b) { return a.concat(b) })
      // })
    })

    var currentExercise = function (req, res, next) { next() };
    var exercise = function (name, route, req, res) {
      if (/\.js$/.test(req.url)) {
        console.log(req.url)
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
          fs.createReadStream(path.resolve(__dirname, 'lib/index.html'))
            .pipe(inject(name + '.js'))
            .pipe(res)
        })
      }
    }

    var menu = beefy({
        cwd: path.join(__dirname, 'menu')
      , entries: ['index.js']
      , quiet: false
      , watchify: false
      , bundlerFlags: []
        .concat(['-t', require.resolve('brfs')])
        .concat([
          '-t', '['
          , require.resolve('envify')
          , '--title', opt.title
          , '--exercises', exercisesDir
          , ']'
        ])
    })

    var main = beefy({
        cwd: path.join(__dirname, 'lib')
      , entries: ['main.js']
      , quiet: false
      , watchify: false
      , live: true
      , bundler: function (path) {
        var b = browserify(opt.bundlerOpts || {})
        b.add(path)
        b.transform(require.resolve('brfs'))
        opt.mainBundler(b)
        exBundles.forEach(function (fn) {
          fn(b)
        })
        return {stdout: b.bundle(), stderr: through()}
      }
    })

    // var b = browserify([path.resolve(__dirname, 'lib/main.js')])
    // b.transform({global:true},'/Users/clakenen/workspace/lakenen/forked/brfs/')
    // b.transform(require.resolve('html-browserify'))
    // exBundles.forEach(function (args) {
    //   b.require.apply(b, args)
    // })
    // b.bundle().pipe(fs.createWriteStream(path.resolve(tmpDir, 'main.js')))

    var server = http.createServer(function(req, res) {
      var uri = url.parse(req.url).pathname
      var paths = uri.split('/').filter(Boolean)

      if (uri === '/style.css') {
        res.setHeader('content-type', 'text/css')
        res.end(styles())
        return
      }

      if (uri === '/main.js') {
        // res.setHeader('content-type', 'text/javascript')
        // fs.createReadStream(path.resolve(tmpDir, 'main.js'))
        //   .pipe(res)
        main(req, res)
        return
      }
      if (uri === '/live-reload') {
        res.setHeader('content-type', 'application/json')
        return res.end(JSON.stringify({ lastUpdate: lastUpdate }))
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
        menu(req, res)
      })
    }).listen(mainPort, function(err) {
      if (err) throw err

      var url = 'http://localhost:'+mainPort
      opener(url)
      console.log(chalk.yellow('WORKSHOP URL:'), chalk.underline.blue(url))
      console.log()
    })

    sse.install(server)

    sse.on('connection', function (client) {
      events.pipe(client)
    })
  }
}


function printIntro(title) {
  var defaultTitle = 'browser workshopper'
  var center = require('center-text')
  title = center(title, { columns: defaultTitle.length })
  console.error(fs.readFileSync(
    __dirname + '/intro.txt', 'utf8'
  ).replace(defaultTitle, title))
}
