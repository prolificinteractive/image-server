var http = require('http'),
	express = require('express'),
	controllers = {
		images: require('../controllers/images'),
        auth: require('../controllers/auth')
	};

var ImageService = function (options) {
	var server;
	
	options = options || {};
	
	this.setPort(options.port || null);
	server = this._server = express();
    
    server
        .use(express.bodyParser());
	
	server
		.get(
			controllers.images.IMAGE_ROUTE,
			controllers.images.getProcessed
		)
        .post(
            controllers.images.UPLOAD_ROUTE,
            controllers.auth.basic,
            controllers.images.uploadImage
        );
};

ImageService.prototype = {
	start: function (callback) {
		var service = this,
			port = this.getPort();
		
		if (port === null) {
			throw new Error('no port specified to run ImageService on');
			return;
		}
		
		http.createServer(this._server).listen(port, function () {
			callback && callback.call(service);
		});
		
		return this;
	},
	
	setPort: function (port) {
		this._port = port;
		return this;
	},
	
	getPort: function () {
		return this._port;
	},
	
	constructor: ImageService
};

module.exports = ImageService;