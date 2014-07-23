var getScript = require('script-load')
try {
  var exercise = require(getExerciseName())
  require('browser-workshopper-exercise')(exercise)
  require('./live-reload')(loadExerciseFiles)
} catch (err) {
  // exercise not found
  // window.location = '/'
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
