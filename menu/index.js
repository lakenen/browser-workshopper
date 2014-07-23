require('browser-workshopper-menu')({
    exercises: require(process.env.exercises)
  , title: process.env.title || ''
})
