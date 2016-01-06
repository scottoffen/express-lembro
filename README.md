# express-[lembro](https://translate.google.com/#pt/en/lembro) #

*It's not meant to scale and it doesn't leak memory.*

If you've used [express-session](https://www.npmjs.com/package/express-session), they you've likely already seen this from their documentation:

> **Warning** The default server-side session storage, `MemoryStore`, is *purposely* not designed for a production environment. It will leak memory under most conditions, does not scale past a single process, and is meant for debugging and developing.

You likely tried to run it production anyway, and you go this error:

```
Warning: connection.session() MemoryStore is not
designed for a production environment, as it will leak
memory, and obviously only work within a single process.
```

And if you are looking at this module, you are likely asking: what do I do if I need server-side in-memory session storage that **doesn't need to scale** past a single process?

Answer: Use `express-lembro`.

```
$ npm install express-lembro
```

### Comparison ###

This module aims to fill the niche where you want production-ready in-memory session storage that doesn't need to scale - which is probably a small niche. Use this comparison chart to help determine if you are in that niche.

| `MemoryStore` | `express-lembro` |
|---------------|------------------|
| Will not scale past a single process | Will not scale past a single process |
| Sessions lost on server restart | Sessions lost on server restart |
| Leaks memory by not purging expired sessions | Purges expired sessions at a configurable interval |
| Unbounded cache size | Configurable cache size restrictions |

- If you need something that will scale beyond a single process, use a database.
- If you really need to scale *and* store sessions in memory, take a look at [connect-redis](https://www.npmjs.com/package/connect-redis).

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
app.use(session({ store : store}));
```

Or you can just new one up on the fly.

```javascript
app.use(session({ store : new lembro() }));
```

### Options ###

The constructor takes an options object and a callback that will be executed once the store has been set up.

```javascript
new lembro({ interval: 360000, maxSize : '4M' }, function ()
{
	console.log('session store ready, captain.');
});
```

This example will purge expired sessions every hour and allow a cache size of 4 megabytes.

| Option   | Default | Description |
|----------|---------|-------------|
| interval | 60000   | Number of milliseconds between purging expired sessions
| maxSize  | 1M      | Maximum (approximate) cache size

The [sizeomatic](https://www.npmjs.com/package/sizeomatic) module is used to determine the cache size and parse the value of the `maxSize` property - hence the *approximate* caveat.

## Methods ##

`express-lembro` exposes **all required and optional** methods for a [session store implementation](https://www.npmjs.com/package/express-session#session-store-implementation) - recreated below in case `express-session` changes it's expected interface in the future.

### store.all(callback) ###

**Optional**

This optional method is used to get all sessions in the store as an array. The `callback` should be called as `callback(error, sessions)`.

### store.destroy(sid, callback) ###

**Required**

This required method is used to destroy/delete a session from the store given a session ID (`sid`). The `callback` should be called as `callback(error)` once the session is destroyed.

### store.clear(callback) ###

**Optional**

This optional method is used to delete all sessions from the store. The `callback` should be called as `callback(error)` once the store is cleared.

### store.length(callback) ###

**Optional**

This optional method is used to get the count of all sessions in the store. The `callback` should be called as `callback(error, len)`.

### store.get(sid, callback) ###

**Required**

This required method is used to get a session from the store given a session ID (`sid`). The `callback` should be called as `callback(error, session)`.

The `session` argument should be a session if found, otherwise `null` or `undefined` if the session was not found (and there was no error). A special case is made when `error.code === 'ENOENT'` to act like `callback(null, null)`.

### store.set(sid, session, callback) ###

**Required**

This required method is used to upsert a session into the store given a session ID (`sid`) and session (`session`) object. The callback should be called as `callback(error)` once the session has been set in the store.

### store.touch(sid, session, callback) ###

**Recommended**

This recommended method is used to "touch" a given session given a session ID (`sid`) and session (`session`) object. The `callback` should be called as `callback(error)` once the session has been touched.

This is primarily used when the store will automatically delete idle sessions and this method is used to signal to the store the given session is active, potentially resetting the idle timer.

## Acknowledgments ##

I used [`MemoryStore`](https://github.com/expressjs/session/blob/master/session/memory.js) as the basis for this module, referenced [`connect-mongo-session`](https://www.npmjs.com/package/connect-mongodb-session) and [this stackoverflow.com question](http://stackoverflow.com/questions/10760620/using-memorystore-in-production) to produce this solution.