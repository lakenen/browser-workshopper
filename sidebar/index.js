var remove   = require('remove-element')
var escape   = require('escape-html')
var css      = require('insert-css')
var inherits = require('inherits')
var Emitter  = require('events').EventEmitter
var domify   = require('domify')
var fs       = require('fs')

module.exports = BrowserWorkshopperSidebar

var style  = fs.readFileSync(__dirname + '/sidebar.css', 'utf8')
var markup = fs.readFileSync(__dirname + '/sidebar.html', 'utf8')

inherits(BrowserWorkshopperSidebar, Emitter)
function BrowserWorkshopperSidebar() {
  if (!(this instanceof BrowserWorkshopperSidebar)) {
    return new BrowserWorkshopperSidebar()
  }

  Emitter.call(this)

  this._enabled = false
  this._statusColor = null
  this._status = ''
  this._amount = 1

  this.el = document.body.appendChild(domify(markup))
  this.content  = this.el.querySelector('.browser-workshopper-content')
  this.statmsg  = null

  if (style) css(style)
  style = null

  var status = this.el.querySelector('.browser-workshopper-status')
  var range  = this.el.querySelector('.browser-workshopper-amount')
  var hide   = this.el.querySelector('.browser-workshopper-hide')
  var test   = this.el.querySelector('.browser-workshopper-test')
  var self   = this

  this.elTest   = test
  this.elStatus = status

  hide.addEventListener('click', function(e) {
    self.enabled = !self.enabled
  }, false)

  test.addEventListener('click', function(e) {
    self.emit('test')
  }, false)

  // Prevents a weird quirk in chrome where the sidebar would
  // transition its transform property from translate(0) to
  // translate(-100%) on page load.
  setTimeout(function() {
    self.el.classList.remove('preloading')
  }, 50)
}

Object.defineProperty(BrowserWorkshopperSidebar.prototype, 'enabled', {
  get: function() { return this._enabled },
  set: function(value) {
    if ((value = !!value) === this._enabled) return
    if (this._enabled = value) {
      this.el.classList.add('enabled')
    } else {
      this.el.classList.remove('enabled')
    }
  }
})

Object.defineProperty(BrowserWorkshopperSidebar.prototype, 'status', {
  get: function() { return this._status },
  set: function(value) {
    this._status = value = value ? String(value) : ''

    if (this.statmsg) {
      var prev = this.statmsg
      this.statmsg.style.top = '-50%'
      this.statmsg.style.opacity = 0
      this.statmsg = null

      setTimeout(function() {
        remove(prev)
      }, 500)
    }

    if (!value) return

    var msg = this.statmsg = document.createElement('div')
    msg.innerHTML = escape(value)
    msg.classList.add('browser-workshopper-message')
    msg.classList.add('adding')
    this.elStatus.appendChild(msg)

    setTimeout(function() {
      msg.classList.remove('adding')
    })
  }
})

Object.defineProperty(BrowserWorkshopperSidebar.prototype, 'statusColor', {
  get: function() { return this._statusColor },
  set: function(value) {
    this._statusColor = value = value ? String(value) : null
    this.elStatus.style.backgroundColor = value
  }
})
