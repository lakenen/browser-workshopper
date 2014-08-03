var trumpet = require('trumpet')
  , duplexer = require('duplexer')
  , through = require('through');

module.exports = function inject(src) {
  var tr1 = trumpet()
    , tr2 = trumpet()

  var script = '<script type=\"text/javascript\" src="' + src + '"><\/script>\n'

  var bodyTag = tr2.createStream('body')

  bodyTag // insert the script right before </body>
    .pipe(through(
      null,
      function () {
        this.queue(script)
        this.queue(null)
      }))
    .pipe(bodyTag)

  tr1.pipe(tr2)

  return duplexer(tr1, tr2)
}
