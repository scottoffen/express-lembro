# express-[lembro](https://translate.google.com/#pt/en/lembro) #

*It's not meant to scale and it doesn't leak memory.*

```
$ npm install express-lembro
```

If you are looking at this module, you are likely looking for an answer to the question: what if I **_want_** server-side in-memory session storage that doesn't need to scale past a single process?

**You've come to the right place.**

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

## Memory Usage and Scaling ##

### The `MemoryStore` Warning ###
If you've used [express-session](https://www.npmjs.com/package/express-session), then you've likely already seen this warning from their documentation:

> **Warning** The default server-side session storage, `MemoryStore`, is *purposely* not designed for a production environment. It will leak memory under most conditions, does not scale past a single process, and is meant for debugging and developing.

And if you tried to run it production anyway, you saw an error like this:

```
Warning: connection.session() MemoryStore is not
designed for a production environment, as it will leak
memory, and obviously only work within a single process.
```

That sounds ominous, right?

### Except `MemoryStore` Doesn't *Actually* Leak Memory ###

The reality is that `MemoryStore` doesn't [leak memory in the way you might expect](https://en.wikipedia.org/wiki/Memory_leak), but rather has the same effect as a memory leak in that it can diminish the performance of your application by reducing the amount of available memory. This happens in two ways:

1. **Expired sessions** won't get purged unless you restart your application. Until then, data that will almost certainly never get used again continues taking up valuable memory.
2. There is **no limit on the amount of memory** `MemoryStore` can consume. So it continues to grow  in size until your application eventually crashes. How long this takes will depend on a number of factors, but left running long enough it will eventually happen.

Pedantic? Perhaps. But **the distinction is important** if we want to solve the problem.

### And Sometimes You Don't *Really* Need To Scale ###

I know we'd all like to think that our apps are going to run the entire world, but the reality is that there are many cases when our apps will never scale beyond a single process. And that's okay.

The most common case I run across is internal [LOB applications](https://en.wikipedia.org/wiki/Line_of_business) that utilize LDAP for authentication and authorization, and often have less than 100 users. In these cases, a session is generated without the user ever seeing a login screen, so if their session gets dropped on the server side, that's okay. We'll simply generate a new session for them without them ever noticing.

### And That's The Niche `express-lembro` Fills ###

This module aims to fill the niche where you want production-ready in-memory session storage that doesn't need to scale - which is admittedly probably a small niche. Use this comparison chart to help determine if you are okay being in that niche.

| `MemoryStore` | `express-lembro` | Other Session Stores |
|---------------|------------------|----------------------|
| Will not scale past a single process | Will not scale past a single process | Will most likely scale |
| Sessions lost on server restart | Sessions lost on server restart | Might persists sessions across application restarts |
| Leaks memory by not purging expired sessions | Purges expired sessions at a configurable interval | Probably purges sessions |
| Unbounded cache size | Configurable cache size restrictions | Manages it's own session store size |

- If you need something that will scale beyond a single process, use a database.
- If you really need to scale *and* store sessions in memory, take a look at [connect-redis](https://www.npmjs.com/package/connect-redis).

## Acknowledgments ##

I used [`MemoryStore`](https://github.com/expressjs/session/blob/master/session/memory.js) as the basis for this module, referenced [`connect-mongo-session`](https://www.npmjs.com/package/connect-mongodb-session) and [this stackoverflow.com question](http://stackoverflow.com/questions/10760620/using-memorystore-in-production) to produce this solution.