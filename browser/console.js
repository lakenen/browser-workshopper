var util = require('util')
  , el = document.querySelector('.console')
  , PREFIX = '$&gt; '

var console = {
    info: function () {
      var html = info(arguments)
      this.print(PREFIX + addClass(html, 'info'))
    }
  , debug: function () {
      var html = debug(arguments)
      this.print(PREFIX + addClass(html, 'debug'))
    }
  , warn: function () {
      var html = warn(arguments)
      this.print(PREFIX + addClass(html, 'warn'))
    }
  , error: function () {
      var html = error(arguments)
      this.print(PREFIX + addClass(html, 'error'))
    }
  , ok: function () {
      var html = log(arguments)
      this.print(PREFIX + addClass(html, 'ok'))
    }
  , log: function () {
      var html = log(arguments)
      this.print(PREFIX + addClass(html, 'log'))
    }
  , print: function (html) {
      el.innerHTML += html + '\n'
      el.scrollTop = el.scrollHeight
    }
}

if (!window._console) {
  window._console = window.console
  window.console = console
}

function format() {
  return util.format.apply(this, arguments)
}

function error(args) {
  window._console.error.apply(window._console, args)
  return format.apply(null, args)
}
function info(args) {
  window._console.info.apply(window._console, args)
  return format.apply(null, args)
}
function log(args) {
  window._console.log.apply(window._console, args)
  return format.apply(null, args)
}
function warn(args) {
  window._console.warn.apply(window._console, args)
  return format.apply(null, args)
}
function debug(args) {
  window._console.debug.apply(window._console, args)
  return format.apply(null, args)
}

function addClass(html, c) {
  return '<span class="' + c + '">' + html + '</span>'
}
