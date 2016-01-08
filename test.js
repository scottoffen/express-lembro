'using strict;'

var session = require('express-session');
var lembro = require('./index.js')(session);
var chai = require('chai');
chai.should();

describe('express-lembro', function ()
{
	it("doesn't fail to load", function ()
	{
		(true).should.be.true;
	})
});