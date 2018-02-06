$(function() {

	// kaleidoscope is a circle inscribed in a regular polygon with n sides, where each side is the base of an isosceles triangle
	// every other triangle gets reflected, so n must be even

	// destination canvas and context -  visible canvas that final kaleidoscope is drawn on
	var canvas = document.getElementById('canvas');
	var ctx = canvas.getContext('2d');

	// source canvas and context - hidden canvas that source is drawn and manipulated on
	var srcCanvas = document.getElementById('src-canvas');
	var srcCtx = srcCanvas.getContext('2d');

	// source - video or image
	var source;

	// keep track of available video input devices (cameras)
	var cameras = [];
	var cameraIndex = -1;
	// video input constraints
	var constraints = {
		video: {
			'facingMode': 'environment'
		}
	};

	var dpr = window.devicePixelRatio || 1;

	var r = getRadius(); // circle radius, also polygon apothem (distance from center to midpoint of side)
	var n = $('#sides').val(); // number of polygon sides

	// triangle dimensions
	var triangle = getTriangleDimensions(r, n);

	// rotation
	var rotate = document.getElementById('rotate');
	var rotation = 0; // rotation in degrees
	var rotationSpeed = 30; // degrees per second
	var rotationInterval = 1000 / rotationSpeed; // milliseconds per degree of rotation
	var rotationTime = 0; // time of last rotation

	// keep track of requestAnimationFrame
	var drawAnimation;

	// imgur app client id - only thing required for anonymous uploads
	var imgurClientId = '77b3d0df434b643';

	// set canvas dimensions
	srcCanvas.width = triangle.h;
	srcCanvas.height = triangle.h;
	canvas.width = 2 * triangle.h;
	canvas.height = 2 * triangle.h;

	if (dpr > 1) {
		$('#canvas').css('width', 2 * triangle.h / dpr);
		$('#canvas').css('height', 2 * triangle.h / dpr);
	}

	// show canvas once the dimensions are set
	$('.circle-wrap').removeClass('hidden');

	// calculate radius of circle
	function getRadius() {
		// make it fit within the screen
		var wOffset = 20 + 20; // left padding + right padding
		var hOffset = 45 + 60 + 100; // header + controls + video controls
		var w = window.innerWidth - wOffset;
		var h = window.innerHeight - hOffset;
		var r;

		if (w > h) {
			r = h / 2;
		}
		else {
			r = w / 2;
		}

		// adjust for dpr
		if (dpr > 1) {
			r = dpr * r;
		}

		return r;
	}


	// given polygon radius and number of sides, calculate and return the dimensions of the isosceles triangle that make up the polygon
	function getTriangleDimensions(r, n) {

		var a = 2 * Math.PI / n; // inner angle of triangle in radians
		var l = r / Math.cos(a/2); // leg of triangle (also polygon radius)
		var h = l * Math.cos(a/2); // height of triangle (also distance from center to middle of polygon side)
		var b = 2 * l * Math.sin(a/2); // base of triangle (also length of polygon side)

		return {
			a: a,
			l: l,
			h: h,
			b: b
		};
	}


	// get video (or fallback image) dimensions
	function getSourceDimensions(source) {

		var w = source.videoWidth || source.width;
		var h = source.videoHeight || source.height;
		var s; // short side

		if (w > h) {
			s = h;
		}
		else {
			s = w;
		}

		return {
			w: w,
			h: h,
			s: s
		}
	}


	// source loading
	function sourceLoading() {
		// if current source is video
		if (typeof source != 'undefined' && source.nodeName.toLowerCase() == 'video') {
			// stop video stream
			stopVideo(source);
		}

		// reset any old loading/error messages
		$('.circle-wrap .message').find('.loading, .error').remove();
		// hide start button and fallback message
		$('.circle-wrap .message').find('.start, .fallback-message').addClass('hidden');
		// show loading message
		$('.circle-wrap .message').removeClass('hidden').append('<p class="loading">Loading...</p>')
	}


	// start video stream
	function startVideo(constraints) {

		if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
			navigator.mediaDevices.getUserMedia(constraints).then(userMediaSuccess).catch(userMediaFail);
			return true;
		}
		else {
			return false;
		}
	}


	// stop video stream
	function stopVideo(video) {
		var stream = video.srcObject;
		var tracks = stream.getTracks();
		for (var i=0; i<tracks.length; i++) {
			tracks[i].stop();
		}
	}


	// start button
	function start() {

		// set source to loading
		sourceLoading();

		// start video stream
		if (startVideo(constraints)) {
			// check for multiple cameras and enable switching between them
			if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
				navigator.mediaDevices.enumerateDevices().then(getCameras).catch(getCamerasFail);
			}
		}
		// unsupported
		else {
			// remove loading message, add error message, and show fallback file input
			$('.loading').remove();
			$('.circle-wrap .message').prepend('<p class="error">Sorry, your browser is not supported. Try using the latest version of Chrome, Firefox, Safari, or Edge.</p>');
			$('.fallback-message').removeClass('hidden');
		}

	}

	// pause animation and video stream
	function pause() {
		if (source.nodeName.toLowerCase() == 'video') {
			// stop video stream
			stopVideo(source);
		}
		// pause animation
		cancelAnimationFrame(drawAnimation);
	}


	// restart paused animation and video stream
	function restart() {
		if (source.nodeName.toLowerCase() == 'video') {
			// set source to loading
			sourceLoading();
			// start video stream
			startVideo(constraints);
		}
		else {
			// restart animation
			drawAnimation = requestAnimationFrame(draw);
		}
	}


	// set cameraIndex to current video device
	function setCameraIndex(stream) {
		var tracks = stream.getTracks();
		var track = tracks[0];
		// loop through cameras looking device that matches current video track's deviceId
		for (var i=0; i<cameras.length; i++) {
			if (cameras[i].deviceId == track.getSettings().deviceId) {
				cameraIndex = i;
			}
		}
	}


	// success callback for getUserMedia
	function userMediaSuccess(stream) {

		// create video element and use as source
		var video = document.createElement('video');
		video.onloadeddata = function(e) {

			// update source
			source = video;

			// make sure camera index is set
			if (cameraIndex < 0 && cameras.length > 1) {
				setCameraIndex(stream);
			}

			video.play();
			sourceLoaded();
		};
		video.srcObject = stream;
	}


	// error callback for getUserMedia
	function userMediaFail(error) {
		// remove loading message, add error message, and show fallback file input
		$('.loading').remove();
		$('.circle-wrap .message').prepend('<p class="error">Camera access is required. Please check your device and browser permissions.</p>');
		$('.fallback-message').removeClass('hidden');
	}


	// switch input camera
	function switchCamera(e) {

		// set source to loading
		sourceLoading();

		// cycle through cameras
		cameraIndex++;
		if (cameraIndex >= cameras.length) {
			cameraIndex = 0;
		}

		// update contraints to use next camera id
		constraints.video.deviceId = {exact: cameras[cameraIndex].deviceId};

		// start video
		startVideo(constraints);
	}


	// success callback for enumerateDevices
	function getCameras(devices) {

		// get a list of all video input devices (cameras)
		for (var i=0; i<devices.length; i++) {
			if (devices[i].kind == 'videoinput') {
				cameras.push(devices[i]);
			}
		}

		// more than 1 camera detected
		if (cameras.length > 1) {
			// make sure camera index is set
			if (cameraIndex < 0 && typeof source != 'undefined' && source.nodeName.toLowerCase() == 'video') {
				var stream = source.srcObject;
				setCameraIndex(stream);
			}
			// enable camera switching
			$('#switch-camera').removeClass('hidden').on('click', switchCamera);
		}
	}


	// error callback for enumerateDevices
	function getCamerasFail(error) {
		console.log(error);
	}


	// fallback file upload
	function fileUpload(e) {

		// set source to loading
		sourceLoading();

		// get file
		var file = e.target.files[0];

		// make sure file is an image
		if (typeof file != 'undefined' && file.type.match(/image\/(jp(e)?g|png|gif)/g)) {

			var fr = new FileReader();

			// when file is loaded
			fr.onload = function(e){

				// create image element and use as source
				var img = document.createElement('img');
				img.onload = function(e){
					source = img;
					sourceLoaded();
				}
				img.src = fr.result;
			};

			// read file
			fr.readAsDataURL(file);
		}
		else {
			$('.circle-wrap .message').append('<p class="error">Please upload a valid JPG, PNG, or GIF file.</p>');
		}
	}


	// draw frames to canvas
	function draw() {

		if (rotate.checked) {

			// check how long since last rotation
			var now = performance.now();
			var elapsed = now - rotationTime;

			// if enough time has elapsed since previous rotation, increment rotation
			if (elapsed >= rotationInterval) {

				// update rotation time
				rotationTime = now - (elapsed % rotationInterval);

				// increment rotation
				rotation++;
			}
		}

		// draw source
		drawSource();

		// draw kaleidoscope
		drawKaleidoscope();

		// request next frame
		drawAnimation = requestAnimationFrame(draw);

	}


	// source video (or fallback image) loaded
	function sourceLoaded() {

		// clip canvas to a circle
		circleClip();

		// hide messages and remove start button, loading, and error elements
		$('.circle-wrap .message').addClass('hidden').find('.start, .loading, .error').remove();
		$('.fallback-message').addClass('hidden');

		// enable clicking canvas to save images
		$('#canvas').removeClass('disabled').attr('title', 'Tap or click anywhere in the circle to take a picture.');

		// show controls
		$('.controls, .camera-controls').removeClass('hidden');

		var srcSize = getSourceDimensions(source);

		// cancel old draw animation request
		cancelAnimationFrame(drawAnimation);
		// start drawing to canvas
		drawAnimation = requestAnimationFrame(draw);
	}


	// mask source within a triangle
	function triangleClip() {
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(triangle.b, 0);
		ctx.lineTo(triangle.b / 2, triangle.h);
		ctx.closePath();
		ctx.clip();
	}


	// mask canvas within a circle
	function circleClip() {
		ctx.beginPath();
		ctx.arc(canvas.width/2, canvas.height/2, triangle.h, 2 * Math.PI, 0);
		ctx.clip();
	}


	// draw triangular section of polygon to canvas
	function drawTriangle(flip) {

		ctx.save();

		// flip to make mirror image
		if (flip) {
			ctx.translate(triangle.b, 0);
			ctx.scale(-1, 1);
		}

		// clip to triangle shape
		triangleClip();

		ctx.drawImage(srcCanvas, srcCanvas.width/2 - triangle.b/2, srcCanvas.height/2 - triangle.h/2, triangle.b, triangle.h, 0, 0, triangle.b, triangle.h);

		ctx.restore();

		ctx.translate(triangle.b, 0);
		ctx.rotate(triangle.a);
	}


	// draw video (or fallback image) to source canvas
	function drawSource() {
		var srcSize = getSourceDimensions(source);
		srcCtx.save();

		// translate to set rotation point in center, then translate back
		if (rotation > 0) {
			srcCtx.translate(triangle.h/2, triangle.h/2);
			srcCtx.rotate(rotation * Math.PI/180); // convert degrees to radians
			srcCtx.translate(-triangle.h/2,-triangle.h/2);
		}

		// this works to crop, center image, and rotate around the center
		srcCtx.drawImage(
			source,
			(srcSize.w - srcSize.s) / 2,
			(srcSize.h - srcSize.s) / 2,
			srcSize.s,
			srcSize.s,
			0,
			0,
			triangle.h,
			triangle.h
		);

		srcCtx.restore();
	}


	// draw whole kaleidoscope
	function drawKaleidoscope() {
		ctx.save();

		// center
		ctx.translate(canvas.width/2 - triangle.b/2, 0);

		// loop through sides and draw each triangle, flipping every other one
		for (var side=0; side<n; side++) {
			drawTriangle(side%2);
		}

		ctx.restore();
	}


	// set the active image in the image viewer
	function setActiveImage($thumb) {

		var imgdata = $thumb.attr('src');

		// switch active thumb
		$('#thumbs .thumb').removeClass('active');
		$thumb.addClass('active');

		// update main image
		$('#img-main').html('<img class="thumb" src="' + imgdata + '"/>');

		// update download link
		$('#download').attr('href', imgdata).attr('download', $thumb.attr('alt'));
	}


	// create png data image from canvas and add to image viewer
	function saveImage() {

		// get image data from canvas
		var imgdata = canvas.toDataURL('image/png');

		// build image file name with a random 4-digit number
		var random = Math.floor(Math.random() * 9000) + 1000;
		var name = 'kaleidocamera-' + random + '.png';

		// create new image and add to list of thumbnails
		var $thumb = $('<img class="thumb" src="' + imgdata + '" alt="' + name + '" />');

		// add to list of thumbnails
		$('#thumbs').prepend($thumb);

		// set new image to active
		setActiveImage($thumb);

		// set image viewer open to new image
		$('#img-viewer-open').html('<img class="thumb" src="' + imgdata + '"/>');
	}


	// wrapper to get/set localStorage
	function storage(key, val) {

		// get (no val passed)
		if (typeof val === 'undefined') {

			var data = window.localStorage.getItem(key);

			if (data == null) {
				data = {};
			}
			else {
				data = JSON.parse(data);
			}

			return data;
		}

		// set
		else {
			window.localStorage.setItem(key, JSON.stringify(val));
		}
	}


	// show modal overlay
	function showOverlay($overlay) {
		// show overlay
		$overlay.removeClass('hidden');
		// disable scrolling
		$('body').addClass('no-scroll');
		// pause video / animation
		pause();
	}


	// hide modal overlay
	function hideOverlay($overlay) {
		// hide overlay
		$overlay.addClass('hidden');
		// enable scrolling
		$('body').removeClass('no-scroll');
		// restart video / animation
		restart();
	}


	/**
	 * Event Handlers
	 */

	// start button click
	$('#start').on('click', start);

	// fallback file upload
	$('#fallback-file').on('change', fileUpload);

	// change number of sides
	$('#sides').change(function() {

		var numSides = $('#sides').val();

		// number of sides must be even and greater than 6
		if (!(numSides%2) && numSides >= 6) {
			// get new values
			n = numSides;
			triangle = getTriangleDimensions(r, n);
		}
	});

	// image viewer click - show modal overlay
	$('body').on('click', '#img-viewer-open .thumb', function(){
		// make sure browse step is visible
		$('.img-viewer').removeClass('share success').addClass('browse');
		// show overlay
		showOverlay($('#img-viewer-overlay'));
	});

	// save images from canvas
	$('body').on('click', '#canvas:not(.disabled), #save', saveImage);

	// thumbnail click - update active image
	$('body').on('click', '#thumbs .thumb', function(){
		setActiveImage($(this));
	});

	// overlay click - hide modal overlay
	$('.overlay').click(function(e){
		if (e.target == e.currentTarget) {
			hideOverlay($(this));
		}
	});

	// close icon click - hide modal overlay
	$('.overlay .close').click(function(e){
		hideOverlay($(this).closest('.overlay'));
	})

	// share step
	$('#imgur-share').click(function(e){

		// if already shared, go straight to success
		if ($('.img-viewer .thumb.active').data('imgur-url')) {

			var $thumb = $('.img-viewer .thumb.active');

			var url = $thumb.data('imgur-url');
			var deleteHash = $thumb.data('imgur-delete-hash');

			// add imgur link, url input, and delete link
			$('#imgur-link').attr('href', url);
			$('#imgur-url').val(url);
			$('#imgur-delete').data('delete-hash', deleteHash);

			// switch to success
			$('.img-viewer').removeClass('browse').addClass('success');
		}
		else {
			// switch modal from browse to share
			$('.img-viewer').removeClass('browse').addClass('share');
			// clear and focus input
			$('#imgur-title').val('').focus();
		}

	});

	// cancel share (back to browse step)
	$('#cancel').click(function(e){
		e.preventDefault();
		$('.img-viewer').removeClass('share').addClass('browse');
	});

	// back (from success step to browse step)
	$('#back').click(function(e){
		e.preventDefault();
		$('.img-viewer').removeClass('success').addClass('browse');
	});

	// upload image to imgur
	$('body').on('click', '#imgur-upload:not(.disabled)', function(e){

		$(this).addClass('disabled loading');

		var $thumb = $('.img-viewer .thumb.active');
		var name = $thumb.attr('alt');
		var title = $('#imgur-title').val() || 'Kaleidoscope Camera Image';
		// split base64 tring - need to get everything after "base64,"
		var base64 = $thumb.attr('src').split('base64,')[1];

		// ajax post
		$.ajax({
			url: 'https://api.imgur.com/3/image',
			method: 'POST',
			headers: {
				Authorization: 'Client-ID ' + imgurClientId
			},
			data: {
				image: base64,
				type: 'base64',
				name: name,
				title: title,
				description: 'Made with https://kaleidocamera.com'
			},
			success: function(result) {

				var url = 'https://imgur.com/' + result.data.id;
				var deleteHash = result.data.deletehash;

				// save url and delete hash as data attribute
				$thumb.data('imgur-id', result.data.id);
				$thumb.data('imgur-url', url);
				$thumb.data('imgur-delete-hash', deleteHash);

				// save to local storage
				var imgurData = storage('imgur');
				// add/update object with matching id
				imgurData[result.data.id] = {
					id : result.data.id,
					url : url,
					deletehash : deleteHash
				};
				// save updated data
				storage('imgur', imgurData);

				// add imgur link and url input
				$('#imgur-link').attr('href', url);
				$('#imgur-url').val(url);

				// switch to success
				$('.img-viewer').removeClass('share').addClass('success');

				// reset upload button
				$('#imgur-upload').removeClass('disabled loading');
			},
			error: function(result) {
				console.log(result);
			}

		});
	});

	// delete image from imgur
	$('#imgur-delete').click(function(e){
		e.preventDefault();

		if (window.confirm('Are you sure? This will permanently delete the image from Imgur.')) {

			var $thumb = $('.img-viewer .thumb.active');
			var id = $thumb.data('imgur-id');
			var deleteHash = $thumb.data('imgur-delete-hash');

			// ajax delete
			$.ajax({
				url: 'https://api.imgur.com/3/image/' + deleteHash,
				method: 'DELETE',
				headers: {
					Authorization: 'Client-ID ' + imgurClientId
				},
				success: function(result) {

					// remove imgur data attributes
					$('.img-viewer .thumb.active').removeData('imgur-id imgur-url imgur-delete-hash');

					// remove from local storage
					var imgurData = storage('imgur');
					// remove object with matching id
					delete imgurData[id];
					// save updated data
					storage('imgur', imgurData);

					// switch to share
					$('.img-viewer').removeClass('success').addClass('share');
				},
				error: function(result) {
					console.log(result);
				}
			});
		}
	});

});
