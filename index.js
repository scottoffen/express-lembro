var debug = require('debug')('express-lembro');
var sizeomatic = require('sizeomatic');
var EventEmitter = require('events').EventEmitter;

/* istanbul ignore next */
var defer = (typeof setImmediate === 'function') ? setImmediate : function(fn){ process.nextTick(fn.bind.apply(fn, arguments)) };

module.exports = function (connect)
{
  /* istanbul ignore next */
  var Store = connect.Store || connect.session.Store;
  var defaults = { interval : 360000, maxSize : '4M' };

  function Lembro (options, callback)
  {
    this._emitter = new EventEmitter();
    this._errorHandler = handleError.bind(this);

    if (typeof options === 'function')
    {
      callback = options;
      options = {};
    }
    else
    {
      options = options || {};
    }

    for (var key in defaults)
    {
      options[key] = options[key] || defaults[key];
    }

    options.maxSize = sizeomatic.howManyBytes(options.maxSize);

    Store.call(this, options);
    this.options = options;
    this.sessions = {};

    this._cleanup = setInterval(cleanup.bind(this), options.interval, this);
    this._size = 0;

    this.advanced = { stop: false };

    return callback && callback();
  }

  Lembro.prototype = Object.create(Store.prototype);

  Lembro.prototype.all = function (callback)
  {
    callback && defer(callback, null, getAllSessions.call(this));
  };

  Lembro.prototype.clear = function clear(callback)
  {
    this.sessions = {};
    this._size = 0;
    callback && defer(callback);
  };

  Lembro.prototype.destroy = function destroy(sessionId, callback)
  {
    deleteSession.call(this, sessionId);
    callback && defer(callback);
  };

  Lembro.prototype.get = function get(sessionId, callback)
  {
    defer(callback, null, getSession.call(this, sessionId));
  };

  Lembro.prototype.length = function length(callback)
  {
    this.all(function (err, sessions)
    {
      // all is hardcoded to retun null for err
      // if (err) return callback(err);

      var count = 0;
      for (var key in sessions)
      {
        ++count;
      }

      callback(null, count);
    });
  };

  /* istanbul ignore next */
  Lembro.prototype.on = function()
  {
    this._emitter.on.apply(this._emitter, arguments);
  };

  /* istanbul ignore next */
  Lembro.prototype.once = function()
  {
    this._emitter.once.apply(this._emitter, arguments);
  };

  Lembro.prototype.reduce = function (callback)
  {
    debug('reduce: start ' + sizeomatic.pretty(this._size));

    var sessions = getSessionAges.call(this);
    var target   = (this.options.maxSize * 0.75).toFixed(0);

    while ((sessions.length > 1) && (this._size > target))
    {
      var oldestSession = sessions.pop();
      deleteSession.call(this, oldestSession.id);
    }

    debug('reduce: done ' + sizeomatic.pretty(this._size));

    callback && defer(callback)
  };

  Lembro.prototype.set = function set(sessionId, session, callback)
  {
    if (typeof session !== 'string') session = JSON.stringify(session);
    var sizeDiff = (this.sessions[sessionId]) ? sizeomatic.getSize(session) - this.sessions[sessionId] : sizeomatic.getSize(session);

    this.sessions[sessionId] = session;
    this._size += sizeDiff;

    if ((this.options.maxSize > 0) && (this._size > this.options.maxSize))
    {
      this.reduce(callback);
    }
    else
    {
      callback && defer(callback);
    }
  };

  Lembro.prototype.touch = function touch(sessionId, session, callback)
  {
    var currentSession = getSession.call(this, sessionId);

    if (currentSession)
    {
      currentSession.cookie = session.cookie;
      this.sessions[sessionId] = JSON.stringify(currentSession);
    }

    callback && defer(callback);
  };

  return Lembro;
};

/* istanbul ignore next */
function cleanup ()
{
  if (this.advanced.stop)
  {
    clearInterval(this._cleanup);
  }
  else
  {
    this.all();
  }
};

/* istanbul ignore next */
function getAllSessions ()
{
  var sessionIds = Object.keys(this.sessions);
  var sessions = {};

  for (var i = 0, l = sessionIds.length; i < l; i += 1)
  {
    var sessionId = sessionIds[i];
    var session = getSession.call(this, sessionId);

    if (session)
    {
      sessions[sessionId] = session;
    }
  }

  return sessions;
}

/* istanbul ignore next */
function getSession(sessionId)
{
  var session = this.sessions[sessionId];

  /* istanbul ignore next */
  if (!session) { return; }

  session = JSON.parse(session);

  var expires = (typeof session.cookie.expires === 'string') ? new Date(session.cookie.expires) : session.cookie.expires;

  if (expires && expires <= Date.now())
  {
    deleteSession.call(this, sessionId);
    return;
  }

  return session;
}

/* istanbul ignore next */
function getSessionAges ()
{
  var sessions = getAllSessions.call(this);
  var sessionAges = [];

  for (var key in sessions)
  {
    sessionAges.push({ id : key, age : sessions[key].cookie.expires });
  }

  sessionAges.sort(function (a,b)
  {
    if (a.age > b.age) return -1;
    else if (a.age < b.age) return 1;
    return 0;
  });

  return sessionAges;
}

/* istanbul ignore next */
function deleteSession (sessionId)
{
  if (this.sessions[sessionId])
  {
    this._size = this._size - sizeomatic.getSize(this.sessions[sessionId]);
    delete this.sessions[sessionId];
  }
}

/* istanbul ignore next */
function handleError(error, callback)
{
  if (this._emitter.listeners('error').length)
  {
    this._emitter.emit('error', error);
  }

  if (callback)
  {
    callback(error);
  }

  if (!this._emitter.listeners('error').length && !callback)
  {
    throw error;
  }
}