'using strict;'

var chai = require('chai');
var expect = chai.expect;
chai.should();

var sessions = require('express-session');
var sizeomatic = require('sizeomatic');
var Lembro = require('./index.js')(sessions);

function generateSession(expires)
{
	expires = expires || 60000;

	var session =
	{
		"cookie":
		{
			"path": "/",
			"httpOnly": true,
			"secure": true,
			"maxAge": 600000,
			"expires": (Date.now() + expires).toString(10)
		},

		"name": "sid"
	};

	return session;
};

describe('express-lembro', function ()
{
	describe('constructor', function ()
	{
		var lembro;

		afterEach(function()
		{
			if (lembro) lembro.advanced.stop = true;
		});

		it('should accept no arguments', function ()
		{
			lembro = new Lembro();
			expect(lembro).to.exist;
		});

		it('should accept an options object as the first parameter', function ()
		{
			lembro = new Lembro({ maxSize : '4m' });
			expect(lembro).to.exist;
		});

		it('should accept a callback as the first parameter', function (done)
		{
			lembro = new Lembro(function () { done(); });
		});

		it('should accept a callback as the second parameter', function (done)
		{
			lembro = new Lembro({ maxSize : '4m' }, function () { done(); });
		});
	});

	it('should store sessions', function ()
	{
		var lembro = new Lembro();

		lembro.set(1, generateSession());
		lembro.set(2, generateSession());
		lembro.set(3, generateSession());

		expect(Object.keys(lembro.sessions).length).to.equal(3);

		lembro.advanced.stop = true;
	});

	it('should get number of sessions in store', function ()
	{
		var lembro = new Lembro();

		lembro.set(1, generateSession());
		lembro.set(2, generateSession());
		lembro.set(3, generateSession());
		lembro.set(4, generateSession());

		lembro.length(function (err, count)
		{
			expect(count).to.equal(4);
		});

		lembro.advanced.stop = true;
	});

	it('should retrieve a specified session', function (done)
	{
		var lembro = new Lembro();

		var tsession = generateSession();
		tsession.extraValue = true;

		lembro.set(1, generateSession());
		lembro.set(2, tsession);
		lembro.set(3, generateSession());

		lembro.get(2, function (err, session)
		{
			expect(session).to.exist;
			session.extraValue.should.be.true;

			lembro.get(3, function (err, session)
			{
				expect(session).to.exist;
				expect(session.extraValue).to.be.undefined;
				done();
			});
		});

		lembro.advanced.stop = true;
	});

	it('should replace an existing session', function (done)
	{
		var lembro = new Lembro();

		var tsession = generateSession();
		tsession.extraValue = true;

		lembro.set(1, generateSession());
		lembro.set(2, generateSession());
		lembro.set(3, generateSession());
		lembro.set(2, tsession);

		lembro.length(function (err, count)
		{
			expect(count).to.equal(3);

			lembro.get(2, function (err, session)
			{
				expect(session).to.exist;
				session.extraValue.should.be.true;
				done();
			});
		});

		lembro.advanced.stop = true;
	});

	it('should clear all sessions', function (done)
	{
		var lembro = new Lembro();

		lembro.set(1, generateSession());
		lembro.set(2, generateSession());
		lembro.set(3, generateSession());

		lembro.length(function (err, count)
		{
			expect(count).to.equal(3);
			lembro.clear(function ()
			{
				lembro.length(function (err, count)
				{
					expect(count).to.equal(0);
					done();
				});
			});
		});

		lembro.advanced.stop = true;
	});

	it('should destroy a specified session', function (done)
	{
		var lembro = new Lembro();

		lembro.set(1, generateSession());
		lembro.set(2, generateSession());
		lembro.set(3, generateSession());

		lembro.length(function (err, count)
		{
			expect(count).to.equal(3);
			lembro.destroy(2, function ()
			{
				lembro.get(2, function (err, session)
				{
					expect(session).to.be.undefined;
					done();
				});
			});
		});

		lembro.advanced.stop = true;
	});

	it('should touch an existing session', function (done)
	{
		var lembro = new Lembro();

		var fsession = generateSession();
		var expires = Date.now() + 65000
		fsession.cookie.expires = expires;

		lembro.set(1, generateSession());
		lembro.set(2, generateSession());

		lembro.touch(2, fsession, function (err)
		{
			lembro.get(2, function (err, session)
			{
				expect(session.cookie.expires).to.equal(expires);
				done();
			});
		});

		lembro.advanced.stop = true;
	});

	it('should delete expired sessions', function (done)
	{
		var lembro = new Lembro();

		var expiredSession = generateSession();
		expiredSession.cookie.expires = Date.now() - 1;

		lembro.set(1, expiredSession);
		lembro.set(2, generateSession());

		lembro.all(function (err, sessions)
		{
			expect(Object.keys(sessions).length).to.equal(1);
			expect(sessions['2']).to.exist;
			done();
		});

		lembro.advanced.stop = true;
	});

	it('should remove older sessions to make room for newer ones', function (done)
	{
		var s1 = generateSession(50002);
		var s2 = generateSession(50001);
		var s3 = generateSession(50003);
		var s4 = generateSession(50004);
		var s5 = generateSession(50005);

		var size = sizeomatic.getSize(JSON.stringify(s1));

		var lembro = new Lembro({ maxSize: size * 4 });

		lembro.set(1, s1);
		lembro.set(2, s2);
		lembro.set(3, s3);
		lembro.set(4, s4);

		expect(lembro._size).to.equal(size * 4);
		expect(Object.keys(lembro.sessions).length).to.equal(4);

		lembro.set(5, s5);

		expect(lembro._size).to.equal(size * 3);
		expect(Object.keys(lembro.sessions).length).to.equal(3);

		done();

		lembro.advanced.stop = true;
	});
});