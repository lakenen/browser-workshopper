var fs = require('fs')
var readme = fs.readFileSync(__dirname + '/README.md', 'utf8')
var files = fs.readdirSync(__dirname + '/files')

module.exports = {
    dirname: __dirname
  , description: readme
  , files: files
  , test: test
  , setup: setup
}

function test(done) {
  // always pass
  return done(null, true)
}

function setup(done) {
  window.beep = 'bop'
  require(files[0])
  return done()
}
