var commander = require('commander');

commander
	.option('-p, --port [port]', 'port to run service on [8001]', 8001)
	.option('-i, --images [images]', 'base directory where images live', 'test_images')
	.parse(process.argv);

module.exports = {
	getPort: function () {
		return commander.port;
	},
	
	getImageDirectory: function () {
		return commander.images;
	}
};