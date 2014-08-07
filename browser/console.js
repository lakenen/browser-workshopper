var el = document.querySelector('.console')
  , PREFIX = '$&gt; '

module.exports = {
    info: function (html) {
      this.log(addClass(html, 'info'))
    }
  , debug: function (html) {
      this.log(addClass(html, 'debug'))
    }
  , warn: function (html) {
      this.log(addClass(html, 'warn'))
    }
  , error: function (html) {
      this.log(addClass(html, 'error'))
    }
  , ok: function (html) {
      this.log(addClass(html, 'ok'))
    }
  , log: function (html) {
      this.print(PREFIX + html)
    }
  , print: function (html) {
      el.innerHTML += html + '\n'
      el.scrollTop = el.scrollHeight
    }
}

function addClass(html, c) {
  return '<span class="' + c + '">' + html + '</span>'
}
