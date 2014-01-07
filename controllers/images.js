var path = require('path'),
    fs = require('fs'),
    exec = require('child_process').exec,
	Image = require('../lib/Image'),
	sizes = require('../sizes.json'),
	options = require('../lib/options'),
	log = require('../lib/log');

module.exports = {
	IMAGE_ROUTE: '/images/:size/:fileName',
    UPLOAD_ROUTE: '/images/:fileName',
    
    uploadImage: function (req, resp) {
		var fileName = req.param('fileName'),
            sourcePath = req.files.image.path,
			targetPath = path.resolve(options.getImageDirectory(), fileName);
            
        exec(['mv', sourcePath, targetPath].join(' '), function (output) {
            var err = output;
            
            if (err) {
                resp.send(500, err);
            } else {
                resp.send(200);
            }
        });
    },
	
	getProcessed: function (req, resp) {
		var fileName = req.param('fileName'),
			imagePath = path.resolve(options.getImageDirectory(), fileName),
			size = req.param('size'),
			image = new Image(imagePath),
			dimensions = sizes[size];
			
		if (typeof dimensions === 'undefined') {
			if (size.indexOf('x') > 0) {
				size = size.split('x');
				dimensions = {
					width: size[0],
					height: size[1]
				};
			} else {
				resp.send('Error: image size "' + size + '" does not exist');
                return;
			}
		}
		
		image.process(dimensions, function (err, processedFile, flags) {
			if (err) {
                resp.send(404, err.toString());
				return;
			}
		
			if (flags.bad)  {
				log.badImage(imagePath, dimensions);
			}
		
            if (req.query.wait) {
                setTimeout(function () {
                    resp.sendfile(processedFile);
                }, req.query.wait);
            } else {
                resp.sendfile(processedFile);
            }
		});
	}
};