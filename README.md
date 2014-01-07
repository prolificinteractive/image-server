image-server
============

## Configuring

Copy config.default.json to config.json and set up a password

## Starting/Stopping

	make start
	make stop

It will start an http server running on port 80 and pulling images from /opt/images. You can also run it using forever:

	sudo node_modules/.bin/forever start index.js -p 80 -i /opt/images

##Endpoints

GET	/images/{width}x{height}/{source}?skip={milliseconds}

- *source* - The URL of the image to be resized
- *width* - The target width
- *height* - The target height
- *skip* (optional) - Artificial latency for testing purposes, in milliseconds

PUT	/post/images/{source}
- *source* -
