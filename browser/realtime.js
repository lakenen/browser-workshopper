
module.exports = function (cb) {
  var source = new EventSource('/sse')

  source.addEventListener('message', function (event) {
    if (event.data) {
      cb(event.data)
    }
  })
}
