var fs = require('fs'),
	path = require('path'),
    exec = require('child_process').exec,
	im = require('imagemagick');
	
var Image = function (source) {
	this.setSource(source);
};

Image.prototype = {
	process: function (options, callback) {
		var image = this,
            isBadImage = false;
		
		var done = function (path) {
			callback && callback(null, path, {
				bad: isBadImage
			});
			
            removeTemporaryFiles();
		};
		
		var error = function (context, err) {
			console.log(context, err);
			if (callback) callback(err, null);
			removeTemporaryFiles();
		};
        
        var removeTemporaryFiles = function () {
            exec('rm ' + image.getTrimmedPath());
            exec('rm ' + image.getSceneTestPath());
			
			//Delay removing resized image so that we can return it
            var log = function (err) { console.log(err); };
            
			setTimeout(function () {
                exec('rm ' + image.getResizedPath(options.width, options.height), log);
                exec('rm ' + image.getCroppedPath(options.width, options.height), log);
                exec('rm ' + image.getTmpPath(), log);
                exec('rm ' + image.getSanitizedPath(), log);
			}, 10000);
        };
        
        //Sanitize images
        this.sanitize(function (sanitizedSource) {
            image.isScene(function (result) {
                if (result === true) {
                    image.getFullFeatures(function (features) {                    
                        //Test if it's feasible to resize and crop it and maintain quality
                        if (features.width / options.width < 0.6 || features.height / options.height < 0.6) {
                            isBadImage = true;
                        }
                    
                        image.crop(options, done, error);
                    }, error);
                } else {
                    image.center(options, done, error);
                }
            }, error);
        }, error);
			
		return this;
	},
    
    sanitize: function (callback, error) {
        var image = this,
            source = this.getSource(),
            tmp = this.getTmpPath(),
            sanitized = this.getSanitizedPath();
        
        exec('cp ' + source + ' ' + tmp, function (err) {
            if (err) {
                if (error) error('copying source to tmp', err);
                return;
            }
            
            exec('mogrify -format png ' + tmp, function (err) {
                if (err) {
                    if (error) error('mogrifying', err);
                    return;
                }
                
                image.setSource(sanitized);
                
                callback(sanitized);
            });
        });
        
        return this;
    },
    
    isScene: function (callback, error) {        
        if (this._isScene) {
            callback(this._isScene);
            return this;
        }
        
        var image = this,
            source = this.getSource(),
            sceneTestPath = this.getSceneTestPath(),
            isScene = true;
            
        this.getFullFeatures(function (source, features) {
            im.convert([
                source,
                '-fill', 'white',
                '-draw', 'rectangle 10,0 ' + (features.width-10)+','+features.height,
                '-draw', 'rectangle 0,10 ' + features.width+','+(features.height-10),
                '-background', 'white',
                '-flatten',
                '-trim',
                '-fuzz', '10%',
                '-format', 'jpg',
                sceneTestPath
            ], function (err) {
                if (err) {
                    if (typeof error === 'function') error('creating scene test image', err);
                    return;
                }
                
                im.identify(sceneTestPath, function (err, features) {
                    if (err) {
                        if (typeof error === 'function') error('getting scene test features', err);
                        return;
                    }
                    
                    if (features.colors < 50) {
                        isScene = false;
                    }
                    
                    image._isScene = isScene;
                    
                    callback(isScene);
                });
            });
        }, error);
    
        return this;
    },
    
    crop: function (options, callback, error) {
        var image = this,
            source = this.getSource(),
            croppedPath = this.getCroppedPath(options.width, options.height);
        
        if (this._isCropped) {
            callback(croppedPath);
            return this;
        }
            
        im.crop({
            srcPath: source,
            dstPath: croppedPath,
            gravity: 'Center',
            width: options.width,
            height: options.height,
            format: 'jpg'
        }, function (err) {
            if (err) {
                error('cropping image', err);
                return;
            }
            
            image._isCropped = true;
            
            callback(croppedPath);
        });
        
        return this;
    },
    
    getFullFeatures: function (callback, error) {        
        var image = this,
            source = this.getSource();
           
        if (this._fullFeatures) {
            callback(source, this._fullFeatures);
            return;
        }
        
        im.identify(source, function (err, fullFeatures) {
            if (err) {
                if (typeof error === 'function') error('reading image features', err);
                return;
            }
            
            image._fullFeatures = fullFeatures;
            
            callback(source, fullFeatures);
        });
    
        return this;
    },
    
    trim: function (callback, error) {
        var image = this,
            source = this.getSource(),
            trimmedPath = this.getTrimmedPath();
            
        if (this._trimmedFeatures) {
            callback(trimmedPath, this._trimmedFeatures);
            return this;
        }
            
        im.convert([
            source,
            '-background', 'white',
            '-flatten',
            '-trim',
            '-fuzz', '3%',
            '-format', 'jpg',
            trimmedPath
        ], function (err) {
            if (err) {
                if (typeof error === 'function') error('trimming image', err);
                return;
            }
            
            im.identify(trimmedPath, function (err, trimmedFeatures) {
                if (err) {
                    if (typeof error === 'function') error('reading trimmed features', err);
                    return;
                }
                
                image._trimmedFeatures = trimmedFeatures;
                
                callback(trimmedPath, trimmedFeatures);
            });
        });
        
        return this;
    },
    
    center: function (options, callback, error) {
        if (this._isCentered) {
            callback();
            return this;
        }
        
        var image = this,
            resizedPath = this.getResizedPath(options.width, options.height),
            dims = options.width + 'x' + options.height;
        
        this.trim(function (trimmedPath, trimmedFeatures) {
            im.convert([
                trimmedPath,
                '-resize', (options.width-10) + 'x' + (options.height-10),
                '-gravity', 'Center',
                '-extent', dims,
                '-format', 'jpg',
                resizedPath
            ], function (err) {
                if (err) {
                    if (typeof error === 'function') error('centering image', err);
                    return;
                }
                
                image._isCentered = true;
                
                callback(resizedPath);
            });
        });
        
        return this;
    },
	
	getResizedPath: function (width, height) {
		return path.resolve('tmp', this.getBasename(true) + '-' + [width, height].join('x') + '.jpg');
	},
	
	getCroppedPath: function (width, height) {
		return path.resolve('tmp', this.getBasename(true) + '-' + [width, height].join('x') + '-cropped.jpg');
	},
	
	getTrimmedPath: function () {
		return path.resolve('tmp', this.getBasename(true) + '-trimmed.jpg');
	},
	
	getSceneTestPath: function () {
		return path.resolve('tmp', this.getBasename(true) + '-scenetest.jpg');
	},
    
    getSanitizedPath: function () {
        return path.resolve('tmp', this.getBasename(true) + '.png');
    },
    
    getTmpPath: function () {
        return path.resolve('tmp', this.getBasename());
    },
	
	setSource: function (source) {
		this._source = source;
		return this;
	},
	
	getSource: function () {
		return this._source;
	},
	
	getBasename: function (withoutExtension) {
		var source = this.getSource();
		
		if (withoutExtension === true) {
			return path.basename(source, this.getExtension());
		} else {
			return path.basename(source);
		}
	},
	
	getExtension: function () {
		return path.extname(this.getSource());
	},
	
	constructor: Image
};

module.exports = Image;