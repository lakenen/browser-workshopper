var fs         = require('fs')

var container  = document.getElementById('container')
var readme     = fs.readFileSync(__dirname + '/README.md', 'utf8')

require('../common')({
  dirname: process.env.dirname
  , description: readme
  , test: test
})

// do something with the lesson anwser file(s)
require(process.env.file_lesson_code_js);

// test function to call to determine whether the user has passed the lession
function test(done) {
  // always pass
  return done(null, true)
}
