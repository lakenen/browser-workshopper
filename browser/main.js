var getScript = require('script-load')
var console = require('./console')

try {
  var exerciseName = getExerciseName()
  if (exerciseName) {
    var exerciseData = require(exerciseName)
    require('./exercise')(exerciseData)
    require('./realtime')(loadExerciseFiles)
    document.querySelector('.exercise').style.display = ''
  } else {
    showMenu()
  }
} catch (err) {
  showMenu()
}

function getExerciseName() {
  var paths = location.pathname.split('/').filter(Boolean)
  return paths[paths.length - 1]
}

function loadExerciseFiles() {
  console.info('RELOADING SOLUTION...')
  getScript(getExerciseName() + '.js', function () {
    if (window.LOAD_FAILED) {
      delete window.LOAD_FAILED
      return
    }
    console.info('DONE!')
  })
}

function showMenu() {
  require('./menu')({
      exercises: require(process.env.exercises)
    , title: process.env.title || ''
  })
}
