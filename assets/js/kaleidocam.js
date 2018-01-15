$(function() {

	// kaleidoscope is a circle inscribed in a regular polygon with n sides, where each side is the base of an isosceles triangle
	// every other triangle gets reflected, so n must be even

	// destination canvas and context -  visible canvas that final kaleidoscope is drawn on
	var canvas = document.getElementById('canvas');
	var ctx = canvas.getContext('2d');

	// source canvas and context - hidden canvas that source is drawn and manipulated on
	var srcCanvas = document.getElementById('src-canvas');
	var srcCtx = srcCanvas.getContext('2d');

	// video element to use as source
	var video = document.getElementById('video');
	// var video = new Video();
	var source;

	var dpr = window.devicePixelRatio || 1;

	var r = getRadius(); // circle radius, also polygon apothem (distance from center to midpoint of side)
	var n = $('#sides').val(); // number of polygon sides

	// triangle dimensions
	var triangle = getTriangleDimensions(r, n);

	// controls
	var rotate = document.getElementById('rotate');
	var rotation = 0; // rotation in degrees

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
	$('#canvas').removeClass('hidden');

	// calculate radius of circle
	function getRadius() {
		// make it fit within the screen
		var wOffset = 20 + 20; // left padding + right padding
		var hOffset = 45 + 60 + 20 + 80; // header + controls + padding + footer
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

	// start video stream
	function start() {

		// hide button
		$('#start').hide();

		// add loading message
		$('.circle-wrap .message').append('<p class="loading">Loading...</p>');

		var constraints = {
			video: {
				'facingMode': 'environment'
			}
		};

		if (navigator.mediaDevices.getUserMedia) {
			navigator.mediaDevices.getUserMedia(constraints).then(userMediaSuccess).catch(userMediaFail);
		}
		else {
			// error message
			$('.circle-wrap .message').append('<p class="error">Sorry, your browser is not supported. Try using the latest version of Chrome, Firefox, Safari, or Edge.</p>');
		}
	}


	// success callback for getUserMedia
	function userMediaSuccess(stream) {
		video.srcObject = stream;
	}


	// error callback for getUserMedia
	function userMediaFail(error) {
		// error message
		$('.circle-wrap .message').append('<p class="error">Camera access is required. Please check your device and browser permissions.</p>');
	}


	// fallback file upload
	function fileUpload(e) {
		// get file
		var file = e.target.files[0];

		// make sure file is an image
		if (file.type.match('image.*')) {

			var fr = new FileReader();

			// when file is loaded
			fr.onload = function(e){

				// create new image and use as source
				var img = new Image();
				img.onload = function(e){
					source = img;
					sourceLoaded();
				}
				img.src = fr.result;
			};

			// read file
			fr.readAsDataURL(file);
		}
	}


	// source video (or fallback image) loaded
	function sourceLoaded() {

		// clip canvas to a circle
		circleClip();

		// hide messages and remove loading and error elements
		$('.circle-wrap .message').hide().find('.loading, .error').remove();

		// enable clicking canvas to save images
		$('#canvas').removeClass('disabled').attr('title', 'Tap or click anywhere in the circle to take a picture.').on('click', saveImage);

		// show controls
		$('.controls, .camera-controls').removeClass('hidden');

		var srcSize = getSourceDimensions(source);

		// todo: change to requestAnimationFrame
		// draw video frames on source canvas
		setInterval(function() {

			// draw source
			drawSource();

			// draw kaleidoscope
			drawKaleidoscope();

			// increment rotation
			if (rotate.checked) {
				rotation++;
			}

		}, 1000/30);
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
		srcCtx.translate(triangle.h/2, triangle.h/2);
		srcCtx.rotate(rotation * Math.PI/180); // convert degrees to radians
		srcCtx.translate(-triangle.h/2,-triangle.h/2);

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


	// create png data image from canvas and add to image viewer
	function saveImage() {
		var imgdata = canvas.toDataURL('image/png');
		$('#thumbs .thumb').removeClass('active');
		$('#thumbs').prepend('<img class="thumb active" src="' + imgdata + '"/></a>');
		$('#img-main').html('<img class="thumb" src="' + imgdata + '"/>');
		$('#download').attr('href', imgdata);
		$('#img-viewer-open').html('<img class="thumb" src="' + imgdata + '"/>');
	}


	// start button
	$('#start').on('click', start);

	// fallback file upload
	$('#fallback-file').on('change', fileUpload);

	// video loaded
	$('#video').on('loadeddata', function() {
		source = video;
		video.play();
		sourceLoaded();
	});

	//change the number of sides
	$('#sides').change(function() {

		var numSides = $('#sides').val();

		// number of sides must be even and greater than 6
		if (!(numSides%2) && numSides >= 6) {
			// get new values
			n = numSides;
			triangle = getTriangleDimensions(r, n);
		}
	});

	// show image viewer modal
	$('body').on('click', '#img-viewer-open .thumb', function(){
		$('#img-viewer-overlay').show();
		$('body').addClass('no-scroll');
	});

	// save images from canvas
	$('body').on('click', '#save', saveImage);

	// view a thumbnail
	$('body').on('click', '#thumbs .thumb', function(){
		var src = $(this).attr('src');
		$('#img-main .thumb').attr('src', src);
		$('#thumbs .thumb').removeClass('active');
		$(this).addClass('active');
	});

	// hide image viewer modal
	$('.overlay').click(function(e){
		if (e.target == e.currentTarget) {
			$(this).hide();
			$('body').removeClass('no-scroll');
		}
	});

	// close
	$('.overlay .close').click(function(e){
		$(this).closest('.overlay').hide();
		$('body').removeClass('no-scroll');
	})

});
