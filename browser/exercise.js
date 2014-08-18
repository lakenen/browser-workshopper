var progress    = require('./progress')
  , highlight   = require('highlight.js').highlight
  , apprise     = require('apprise')
  , remove      = require('remove-element')
  , fonts       = require('google-fonts')
  , slice       = require('sliced')
  , marked      = require('marked')
  , xhr         = require('xhr')

var renderer = new marked.Renderer()
var anchorRender = {
    options:{
      sanitize: true
    }
  , render: marked.Renderer.prototype.link
}
// open links in new window
renderer.link = function(href, title, text){
  var anchor = anchorRender.render(href, title, text)
  return anchor.replace('<a', '<a target="_blank"')
}
marked.setOptions({
    renderer: renderer
  , highlight: function(code, lang) {
      if (!lang) return code

      code = highlight(lang, code).value
      return code
    }
})

var DEFAULT_TEST_TIMEOUT = 10000

module.exports = function(ex) {
  setupPage(ex)
  setupNotifications()
  setupButtons()
  setupSliders()

  console.log('LOADING EXERCISE...')

  fonts.add({
      'Source Code Pro': [200, 600]
    , 'Share Tech Mono': [400]
  })

  var sidebarEl = document.querySelector('.sidebar')

  document.title = ex.title || process.env.title
  document.body.classList.add('exercise__' + ex.dirname)

  if (ex.description) {
    sidebarEl.innerHTML = marked(ex.description)
    openHook(sidebarEl)
  }

  if (ex.success) {
    var success = document.querySelector('.success-msg')
    success.innerHTML = marked(ex.success)
  } else {
    remove(document.querySelector('.success-container'))
  }
  var verifyButton = document.querySelector('.verify-btn')
    , retryButton = document.querySelector('.retry-btn')
    , successButton = document.querySelector('.success-btn')
    , continueLink = document.querySelector('.continue-link')
    , quitLink = document.querySelector('.quit-link')

  function showContinueScreen(ev) {
    document.body.classList.remove('success')
    document.body.classList.add('continue')
    ev.preventDefault()
  }

  function init() {
    console.log('DONE!')
    verifyButton.addEventListener('click', runTest)
    retryButton.addEventListener('click', runTest)
    continueLink.addEventListener('click', showContinueScreen)
    successButton.addEventListener('click', showContinueScreen)
  }

  function runTest() {
    var timeoutTID

    if (!ex.test) {
      return console.warn('No test function specified for this lesson yet...')
    }

    setState('testing')
    console.warn('TESTING...')

    clearTimeout(timeoutTID)
    ex.test(function(err, result) {
      clearTimeout(timeoutTID)
      if (result) {

        setState('passed')
        console.ok('PASSED!')
        progress.setProgress(ex.dirname, true)
        timeoutTID = setTimeout(function () {
          document.body.classList.add('success')
          quitLink.addEventListener('click', showContinueScreen)
        }, 1000)
      } else {
        // TRY AGAIN?
        setState('failed')
        setTimeout(function () {
          retryButton.focus()
        }, 150)
      }
      if (err) throw (err.message ? err : new Error(err))
    })
    if (ex.testTimeout !== false) {
      timeoutTID = setTimeout(function () {
        setState('failed')
        console.error('TIMEOUT')
      }, ex.testTimeout || DEFAULT_TEST_TIMEOUT)
    }
  }

  if (ex.setup) {
    ex.setup(init)
  } else {
    init()
  }
}

function setState(state) {
  document.body.classList.remove('failed', 'passed', 'testing')
  document.body.classList.add(state)
}

function setupNotifications() {
  var notify = apprise({
    top: false,
    right: false
  }).on('enter', function(node) {
    node.classList.add('notification')
  }).on('exit', function(node) {
    previous = null
    node.classList.add('closing')
    setTimeout(function() {
      remove(node)
    }, 1000)
  })

  var previous = null
  window.onerror = function(message, source, line, ch, err) {
    var msg = String(err.message || 'unknown error')
    console.error('ERROR: ' + msg)
    if (err.message === previous) return
    var error = notify(10000)
    error.innerHTML = previous = msg
    if (document.body.classList.contains('testing')) {
      setState('failed')
    }
    setTimeout(function() {
      error.classList.add('opening')
    }, 1)
  }
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

// homeBtn/openBtn Buttons
function setupButtons() {
  var toggleButtons = document.querySelector('.toggle-buttons')
  function togglePane(name, disabled) {
    document.body.classList.toggle(name + '-disabled', disabled)
  }
  toggleButtons.addEventListener('click', function(event) {
    var btn = event.target
    if (btn.classList.contains('toggle')) {
      btn.classList.toggle('disabled')
      togglePane(btn.dataset.toggle, btn.classList.contains('disabled'))
    }
  }, false)
}

function hasClass(el, c) {
  return el.classList.contains(c)
}

function contains(el, child) {
  do {
    if (child === el) return true
  } while ((child = child.parentNode))
  return false
}

function setupPage(ex) {
  var successEl = document.querySelector('.success-container')
    , button = document.querySelector('.success-hide-btn')
    , overlay = document.querySelector('.success-overlay')
    , nextExerciseLink = document.querySelector('.next-exercise-link')
  overlay.addEventListener('click', function (ev) {
    if (contains(successEl, ev.target)) {
      return
    }
    document.body.classList.remove('continue')
  }, false)
  button.addEventListener('click', function (ev) {
    document.body.classList.remove('continue')
  }, false)
  if (ex.next) {
    nextExerciseLink.href = '/' + ex.next
  } else {
    nextExerciseLink.style.display = 'none'
  }
}

// homeBtn/openBtn Buttons
function setupSliders() {
  var sliderColumn = document.querySelector('.slider-column')
    , sliderRow = document.querySelector('.slider-row')
    , sidebar = document.querySelector('.sidebar')
    , display = document.querySelector('.display')

  sliderColumn.addEventListener('mousedown', startColumnSliding, false)
  sliderRow.addEventListener('mousedown', startRowSliding, false)

  sliderColumn.addEventListener('dblclick', resetColumn, false)
  sliderRow.addEventListener('dblclick', resetRow, false)

  var MIN_SIZE = 80

  var minRow = display.offsetTop + MIN_SIZE
    , minCol = MIN_SIZE

  var colPos = progress.get('column-position')
    , rowPos = progress.get('row-position')


  function slideColumnTo(x) {
    if (!x) return
    var max = window.innerWidth - MIN_SIZE
    x = Math.min(max, Math.max(minCol, x))
    sidebar.style.maxWidth = (x - 2) + 'px'
    sidebar.style.minWidth = (x - 2) + 'px'
    colPos = x
    progress.set('column-position', x)
  }
  function slideRowTo(y) {
    if (!y) return
    var max = window.innerHeight - display.offsetTop - MIN_SIZE
    y = Math.min(max, Math.max(minRow, y))
    display.style.maxHeight = (y - 2) + 'px'
    display.style.minHeight = (y - 2) + 'px'
    rowPos = y
    progress.set('row-position', y)
  }

  function resetColumn() {
    sidebar.style.maxWidth = ''
    sidebar.style.minWidth = ''
    progress.unset('column-position')
    colPos = null
  }

  function resetRow() {
    display.style.maxHeight = ''
    display.style.minHeight = ''
    progress.unset('row-position')
    rowPos = null
  }

  slideColumnTo(colPos)
  slideRowTo(rowPos)

  window.addEventListener('resize', function () {
    slideRowTo(rowPos)
    slideColumnTo(colPos)
  })

  function startColumnSliding() {
    function move(event) {
      slideColumnTo(event.clientX)
      event.preventDefault()
    }
    function up(event) {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move, false)
    document.addEventListener('mouseup', up, false)
  }

  function startRowSliding() {
    function move(event) {
      slideRowTo(event.clientY - display.offsetTop)
      event.preventDefault()
    }
    function up(event) {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move, false)
    document.addEventListener('mouseup', up, false)
  }
}
