var getScript = require('script-load')
try {
  var exerciseData = require(getExerciseName())
  require('browser-workshopper-exercise')(exerciseData)
  require('./live-reload')(loadExerciseFiles)
} catch (err) {
  require('./menu')({
      exercises: require(process.env.exercises)
    , title: process.env.title || ''
  })
}

function getExerciseName() {
  var paths = location.pathname.split('/').filter(Boolean)
  return paths[paths.length - 1]
}

function loadExerciseFiles() {
  getScript(getExerciseName() + '.js', function () {
    console.log('loaded script!')
  })
}
