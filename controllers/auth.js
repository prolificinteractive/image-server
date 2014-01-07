var express = require('express'),
    config = require('../config.json');
    
var basicAuth = express.basicAuth(config.auth.username, config.auth.password);

module.exports = {
	basic: basicAuth
};