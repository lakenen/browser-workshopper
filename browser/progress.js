var slugify = require('slugify')
  , ls = window.localStorage
  , id = slugify(process.env.title || 'browser workshopper')

module.exports = getProgress
module.exports.set = set
module.exports.get = get
module.exports.unset = unset
module.exports.setProgress = setProgress
module.exports.getProgress = getProgress

function get(key) {
  key = id + '.' + key
  return ls.getItem(key)
}

function set(key, val) {
  if (val === null) {
    return unset(key)
  }
  key = id + '.' + key
  return ls.setItem(key, val)
}

function unset(key) {
  key = id + '.' + key
  return ls.removeItem(key)
}

function getProgress(name) {
  var key = 'progress:' + name
  return name && !!get(key)
}

function setProgress(name, value) {
  var key = 'progress:' + name
  return name && set(key, !!value ? '1' : '')
}
