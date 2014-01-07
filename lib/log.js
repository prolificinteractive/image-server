var fs = require('fs');

module.exports = {
	write: function (payload, callback) {
		fs.appendFile('server.log', payload + "\n", callback || function () {});
		return this;
	},
	
	badImage: function (src, dims) {
		this.write('Bad image: ' + src + ' (target size: ' + dims.width + 'x' + dims.height + ')');
		return this;
	}
};