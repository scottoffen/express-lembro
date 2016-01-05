var util = require('util')
var sizeomatic = require('sizeomatic');

var defer = (typeof setImmediate === 'function') ? setImmediate : function(fn){ process.nextTick(fn.bind.apply(fn, arguments)) };

module.exports = function (connect)
{
  var Store = connect.Store || connect.session.Store;
  var defaults = { interval : 60000, maxSize : 1048576 };

  function Lembro (options, callback)
  {
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
    this.sessions = Object.create(null);

    this._cleanup = setInterval(function (store) { store.all(); }, options.interval, this);
    this._size = 0;

    return callback && callback();
  }

  util.inherits(Lembro, Store);

  Lembro.prototype.all = function (callback)
  {
    var sessionIds = Object.keys(this.sessions);
    var sessions = Object.create(null);

    for (var i = 0, l = sessionIds.length; i < l; i += 1)
    {
      var sessionId = sessionIds[i];
      var session = getSession.call(this, sessionId);

      if (session)
      {
        sessions[sessionId] = session;
      }
    }

    this._size = sizeomatic.getSize(this.sessions);

    callback && defer(callback, null, sessions)
  };

  Lembro.prototype.clear = function clear(callback)
  {
    this.sessions = Object.create(null);
    this._size = 0;
    callback && defer(callback);
  };

  Lembro.prototype.destroy = function destroy(sessionId, callback)
  {
    var size = sizeomatic.getSize(this.sessions[sessionId]);
    delete this.sessions[sessionId];
    this._size = this._size - size;
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
      if (err) return callback(err);

      var count = 0;
      for (var key in sessions)
      {
        ++count;
      }

      callback(null, count);
    });
  };

  Lembro.prototype.set = function set(sessionId, session, callback)
  {
    var sessionData = JSON.stringify(session);

    var currentSessionSize = sizeomatic.getSize(this.sessions[sessionId]);
    var newSessionSize = sizeomatic.getSize(sessionData);

    if ((this.options.maxSize > 0) && (newSessionSize > currentSessionSize))
    {
      var self = this;
      this.all(function(err, sessions)
      {
        reduce.call(self, sessions, newSessionSize - currentSessionSize);
        self.sessions[sessionId] = sessionData;
        callback && defer(callback);
      });
    }
    else
    {
      this.sessions[sessionId] = sessionData;
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

function getSession(sessionId)
{
  var session = this.sessions[sessionId];

  if (!session) { return; }

  session = JSON.parse(session);

  var expires = (typeof session.cookie.expires === 'string') ? new Date(session.cookie.expires) : session.cookie.expires;

  if (expires && expires <= Date.now())
  {
    delete this.sessions[sessionId];
    return;
  }

  return session;
}

function reduce (sessions, reduceBy)
{
  var sessionAges = getSessionAges(sessions);

  while ((sessionAges.length > 0) && (this.options.maxSize < (this._size + reduceBy)))
  {
    var oldestSession = sessionAges.pop();
    this.destroy(oldestSession.id);
  }
}

function getSessionAges (sessions)
{
  var sessionAges = [];

  for (var key in sessions)
  {
    sessionAges.push({ id : key, age : sessions[key].expires });
  }

  sessionAges.sort(function (a,b)
  {
    if (a.age > b.age) return 1;
    else if (a.age < b.age) return -1;
    return 0;
  });

  return sessionAges;
}