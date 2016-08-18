# express-[lembro](https://translate.google.com/#pt/en/lembro) #

`express-lembro` is a package that provides in-memory express-session storage that isn't meant to scale and doesn't leak memory. Because sometimes that's exactly what you need.

[![NPM](https://nodei.co/npm/express-lembro.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/express-lembro/)

```
$ npm install express-lembro
```

## Usage ##

When you require it in, you'll need to pass it the `session`.

```javascript
var session = require('express-session');
var lembro = require('express-lembro')(session);
```

If you want to configure any event listeners, you'll want to create a store first.

```javascript
var store = new lembro();
store.on('error', function(error)
{
  assert.ifError(error);
  assert.ok(false);
});
```

Then pass that store to the `session` middle-ware.

```javascript
app.use(session({ store : store }));
```

Or you can just new one up on the fly.

```javascript
app.use(session({ store : new lembro() }));
```

### Options ###

The constructor takes an `options` object and a `callback` that will be executed once the store has been set up.

```javascript
new lembro({ interval: 360000, maxSize : '4M' }, function ()
{
	console.log('session store ready, captain.');
});
```

This example will purge expired sessions every hour and allow a cache size of 4 megabytes.

| Option   | Default | Description |
|----------|---------|-------------|
| interval | 360000  | Number of milliseconds between purging expired sessions |
| maxSize  | 4M      | Maximum (approximate) cache size |

The [sizeomatic](https://www.npmjs.com/package/sizeomatic) module is used to determine the cache size and parse the value of the `maxSize` property - hence the *approximate* caveat.

## Methods ##

In addition to the methods below, `express-lembro` exposes **all required and optional** methods for a [session store implementation](https://www.npmjs.com/package/express-session#session-store-implementation).

### store.reduce(callback) ###

This method call will reduce the amount of memory being utilized to 75% of the configured maximum (`options.maxSize`). It will be called automatically whenever the session store cache size **exceeds** the configured maximum, so it is not necessary to call it directly.

This is the only method instrumented for debugging using the [`debug`](https://www.npmjs.com/package/debug) module. Messages displayed include a message with the starting cache size and another with the ending cache size.
