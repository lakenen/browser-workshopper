var util = require('util')
  , el = document.querySelector('.console')
  , PREFIX = '$&gt; '

module.exports = {
    info: function () {
      var html = util.format.apply(this, arguments)
      this.print(PREFIX + addClass(html, 'info'))
    }
  , debug: function () {
      var html = util.format.apply(this, arguments)
      this.print(PREFIX + addClass(html, 'debug'))
    }
  , warn: function () {
      var html = util.format.apply(this, arguments)
      this.print(PREFIX + addClass(html, 'warn'))
    }
  , error: function () {
      var html = util.format.apply(this, arguments)
      this.print(PREFIX + addClass(html, 'error'))
    }
  , ok: function () {
      var html = util.format.apply(this, arguments)
      this.print(PREFIX + addClass(html, 'ok'))
    }
  , log: function () {
      var html = util.format.apply(this, arguments)
      this.print(PREFIX + addClass(html, 'log'))
    }
  , print: function (html) {
      el.innerHTML += html + '\n'
      el.scrollTop = el.scrollHeight
    }
}

function addClass(html, c) {
  return '<span class="' + c + '">' + html + '</span>'
}

if (!window._console) {
  window._console = window.console
  window.console = module.exports
}
