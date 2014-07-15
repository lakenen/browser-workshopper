var workshopper = require('..')
  , mkdirp = require('mkdirp')
  , path = require('path')

var answers = path.resolve(__dirname, 'answers')
mkdirp.sync(answers)
process.chdir(answers)
workshopper({
  exercises: require('./exercises')
  , exercisesDir: path.resolve(__dirname, 'exercises')
  , menu: {
    title: 'Example Workshopper'
  }
})
