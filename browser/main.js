var getScript = require('script-load')
try {
  var exerciseName = getExerciseName()
  if (exerciseName) {
    var exerciseData = require(exerciseName)
    require('browser-workshopper-exercise')(exerciseData)
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
  getScript(getExerciseName() + '.js', function () {
    console.log('loaded script!')
  })
}

function showMenu() {
  require('./menu')({
      exercises: require(process.env.exercises)
    , title: process.env.title || ''
  })
}
