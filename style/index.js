var memoize = require('memoize-sync')
var rework  = require('rework')
var rwnpm   = require('rework-npm')
var imprt   = require('rework-import')
var ease    = require('rework-plugin-ease')
var auto    = require('autoprefixer')({ browsers: 'last 2 versions' })
var fs      = require('fs')

module.exports = process.env.NODE_ENV === 'development'
  ? getCSS
  : memoize(getCSS, function(){})

function getCSS() {
  var css = fs.readFileSync(__dirname + '/index.css', 'utf8')

  css = rework(css)
    .use(rwnpm({ root: __dirname }))
    .use(ease())
    .use(imprt({
      path: __dirname + '/../assets'
    }))
    .toString()

  css = auto.process(css).css

  return css
}
