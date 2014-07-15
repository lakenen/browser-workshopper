require('browser-workshopper-menu')({
    x: 0, y: 0
  , bg: process.browser ? '#61FF90' : 'green'
  , fg: process.browser ? '#34363B' : 'black'
  , exercises: require('../exercises.json')
  , title: 'BROWSER WORKSHOPPER'
})
