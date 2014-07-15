var progress    = require('../lib/progress')
var Sidebar     = require('../sidebar')

var highlight   = require('highlight.js').highlight
var remove      = require('remove-element')
var fonts       = require('google-fonts')
var slice       = require('sliced')
var marked      = require('marked')
var xhr         = require('xhr')
var fs          = require('fs')

var notify = require('apprise')({
  top: false,
  right: true
}).on('enter', function(node) {
  node.classList.add('notification')
}).on('exit', function(node) {
  previous = null
  node.classList.add('closing')
  setTimeout(function() {
    remove(node)
  }, 1000)
})

var markedOpts = {
  highlight: function(code, lang) {
    if (!lang) return code

    code = highlight(lang, code).value
    return code
  }
}

module.exports = function(opts) {
  opts = opts || {}

  fonts.add({
    'Source Code Pro': [200, 600]
  })

  var sidebar = new Sidebar();

  if (opts.description) {
    sidebar.content.innerHTML = marked(opts.description, markedOpts)
    openHook(sidebar.content)
  }

  var hamburger = sidebar.el.querySelector('.browser-workshopper-hide')

  hamburger.classList.add('flashing')
  hamburger.addEventListener('click', function() {
    hamburger.classList.remove('flashing')
  }, false)

  sidebar.on('test', function() {
    if (!opts.test) {
      return console.warn('No test function specified for this lesson yet...')
    }

    opts.test(function(err, result) {
      if (err) throw err

      if (result) {
        progress.set(opts.dirname, true)
        sidebar.status = 'passed!'
        sidebar.statusColor = '#57FF8A'
        home.classList.add('flashing')
      } else {
        sidebar.status = 'try again?'
        sidebar.statusColor = '#FF6E57'
      }
    })
  })
}

var previous = null
window.onerror = function(message, source, line, ch, err) {
  if (err.message === previous) return
  var error = notify(10000)
  error.innerHTML = previous = String(err.message)
  setTimeout(function() {
    error.classList.add('opening')
  }, 1)
}

// For opening directory links cleanly without requiring a temporary
// window: override the click event to send an XHR request to the page
// instead. Will still be fine if opened through other means, but slightly
// cleaner.
function openHook(content) {
  var links = slice(content.querySelectorAll('a[href^="/open/"]'))

  links.forEach(function(link) {
    return link.addEventListener('click', function(e) {
      var href = link.getAttribute('href')
      xhr(href, function(err) {
        if (err) throw err
      })

      e.preventDefault()
      e.stopPropagation()
      return false
    }, false)
  })
}

// Home/Open Buttons
var buttons = document.body.appendChild(document.createElement('ul'))
var home = buttons.appendChild(document.createElement('li'))
var open = buttons.appendChild(document.createElement('li'))

buttons.classList.add('buttons')
home.classList.add('button-home')
open.classList.add('button-open')

home.setAttribute('title', 'Return to menu')
home.addEventListener('click', function(e) {
  window.location = '/'
}, false)

open.setAttribute('title', 'Open exercise shader directory')
open.addEventListener('click', function(e) {
  var src = '/open' + window.location.pathname

  xhr(src, function(err) {
    if (err) throw err
  })
}, false)
