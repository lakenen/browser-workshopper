#!/usr/bin/env node

var answers   = require('./lib/create-answers')
var styles    = require('./style')
var extend    = require('extend')
var opener    = require('opener')
var beefy     = require('beefy')
var chalk     = require('chalk')
var http      = require('http')
var path      = require('path')
var url       = require('url')
var fs        = require('fs')

var mainPort = process.env.WORKSHOPPER_PORT || 12492
var closeWindow = fs.readFileSync(
  path.join(__dirname, 'lib/close-window.html')
)

module.exports = createServer

function createServer(opt) {
  opt = opt || {}
  mainPort = opt.port || mainPort
  var exercises = opt.exercises || {}
    , exercisesDir = opt.exercisesDir
    , root = process.cwd()
    , menuOptions = extend(
      {}
      , opt.menu
      , { exercises: exercises }
    )

  console.error(fs.readFileSync(
    __dirname + '/intro.txt', 'utf8'
  ))

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

    var exRoutes = exLinks.map(function(link, i) {
      var serverPath = path.join(exercisesDir, link, 'server.js')
      return require(serverPath)(exFiles[i])
    })

    var menu = beefy({
        cwd: path.join(__dirname, 'menu')
      , entries: ['index.js']
      , quiet: false
      , watchify: false
      , bundlerFlags: []
        .concat(['-g', require.resolve('brfs')])
        .concat([
          '-t', '['
          , require.resolve('envify')
          , '--menu', JSON.stringify(menuOptions)
          , ']'
        ])
    })

    http.createServer(function(req, res) {
      var uri = url.parse(req.url).pathname
      var paths = uri.split('/').filter(Boolean)

      if (uri === '/style.css') {
        res.setHeader('content-type', 'text/css')
        res.end(styles())
        return
      }

      if (paths[0] === 'open') {
        opener(path.join(root, paths[1]))
        return res.end(closeWindow)
      }

      for (var i = 0; i < exLinks.length; i++) {
        if (uri.indexOf(exLinks[i]) === 1) {
          req.url = req.url
            .replace(exLinks[i], '')
            .replace(/\/+/g, '/')

          return exRoutes[i](req, res)
        }
      }

      return menu(req, res)
    }).listen(mainPort, function(err) {
      if (err) throw err

      var url = 'http://localhost:'+mainPort
      opener(url)
      console.log(chalk.yellow('WORKSHOP URL:'), chalk.underline.blue(url))
      console.log()
    })
  }
}
