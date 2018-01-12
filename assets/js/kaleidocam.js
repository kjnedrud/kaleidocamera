$(function() {

	var video = document.getElementById('video');
	var canvas = document.getElementById('canvas');
	var ctx = canvas.getContext('2d');

	var vidcanvas = document.getElementById('vidcanvas');
	var vctx = vidcanvas.getContext('2d');

	var dpr = 1;
	if(window.devicePixelRatio !== undefined) {
		dpr = window.devicePixelRatio;
	}

	// start button
	$('#start').on('click', start);

	// start video stream
	function start() {

		// hide button
		$('#start').hide();

		var constraints = {
			video: {
				'facingMode': 'environment'
			}
		};

		if (navigator.mediaDevices.getUserMedia) {
			navigator.mediaDevices.getUserMedia(constraints).then(success).catch(fail);
		}
		else {
			// error message
			$('.main .container').append('<p class="error">Sorry, your browser is not supported. Try using the latest version of Chrome, Firefox, Safari, or Edge.</p>');
		}
	}

	function success(stream) {
		video.srcObject = stream;
	}

	function fail(error) {
		// error message
		$('.main .container').append('<p class="error">Camera access is required. Please check your device and browser permissions.</p>');
	}

	var rotate = document.getElementById('rotate');
	var reverse = document.getElementById('reverse');

	//var r = 300;
	var r; //radius - distance from center of polygon to vertex

	//make it fit within the screen
	var winW = $(window).width();
	var winH = $(window).height();
	if (winW > winH) {
		r = (winH-80)/2;
	}
	else {
		r = winW/2-10;
	}

	if (dpr > 1) {
		r = dpr*r;
	}

	var n = 6; //number of sides
	var a = 2*Math.PI/n; //inner angle of triangle in radians
	var h = r*Math.cos(a/2); //height of triangle
	var b = 2*r*Math.sin(a/2); //base of triangle
	var odd = n%4; //odd number of sides to reflect (half the number of sides)?

	var s = Math.floor(Math.sqrt(b*b+h*h));

	//set video dimensions
	//fit in window while keeping the same aspect ratio
	$('#video').on('loadeddata', function() {

		$('.instructions, .controls').show();

		video.play();

		var vidW = this.videoWidth;
		var vidH = this.videoHeight;
		var vs;

		if (vidW > vidH) {
			vs = vidH;
		}
		else {
			vs = vidW;
		}

		/*
		console.log('winW:'+winW);
		console.log('winH:'+winH);
		console.log('r:'+r);
		console.log('h:'+h);
		console.log('b:'+b);
		console.log('vs:'+vs);
		console.log('s:'+s);
		*/

		//set canvas dimensions
		/*if (odd) {
			canvas.width = 2*r;
		}
		else {
		*/	canvas.width=2*h;
		//}
		canvas.height = 2*h;

		if (dpr > 1) {
			$('#canvas').css('width',2*h/dpr);
			$('#canvas').css('height',2*h/dpr);
		}

		//set videcanvas dimensions
		vidcanvas.width = s;
		vidcanvas.height = s;

		circleClip();

		//change the number of sides
		$('#sides').change(function() {
			var sideSelect = $(':selected','#sides').val();
			//number of sides - must be even and greater than 4
			if (!(sideSelect%2) && sideSelect >= 6) {
				//set new values
				n = sideSelect;
				a = 2*Math.PI/n;
				h = r*Math.cos(a/2);
				b = 2*r*Math.sin(a/2);
				odd = n%4;
				//clear canvas and set new dimensions
				/*if (odd) {
					canvas.width = 2*r;
				}
				else {
				*/	canvas.width=2*h;
				//}
				canvas.height = 2*h;
				circleClip();
			}
		});

		function triangleClip() {
			ctx.beginPath();
			//if (reverse.checked) {
				ctx.moveTo(0, 0);
				ctx.lineTo(b, 0);
				ctx.lineTo(b/2, h);
			/*}
			else {
				ctx.moveTo(b/2, 0);
				ctx.lineTo(b, h);
				ctx.lineTo(0, h);
			}*/

			ctx.clip();
		}

		//mask the canvas with a circle
		function circleClip() {

			ctx.beginPath();
			ctx.arc(canvas.width/2, canvas.height/2, h, 2*Math.PI, 0);
			ctx.clip();
		}


		var i = 0;

		//send video frames to canvas
		setInterval(function() {

			//draw video onto video canvas and rotate
			vctx.save();
			vctx.translate(s/2, s/2);
			vctx.rotate(Math.PI*i/180);
			vctx.translate(0,0);
			vctx.drawImage(video, vidW/2-vs/2, vidH/2-vs/2, vs, vs, -s/2, -s/2, s, s);
			vctx.restore();

			//draw kaleidoscope

			ctx.save();
			//if (reverse.checked) {
				ctx.translate(canvas.width/2-b/2, 0);
			/*}
			else {
				ctx.translate(b/2, h);
			}*/

			//loop through
			for (var j=0; j<n; j++) {

					//odd
					if (j%2) {
						//ctx.scale(1, -1);
						ctx.save();
						triangleClip();
						ctx.drawImage(vidcanvas, vidcanvas.width/2-b/2, vidcanvas.height/2-h/2, b, h, 0, 0, b, h);
						ctx.restore();

					}
					//even
					else {
						ctx.save();
						ctx.translate(b, 0);
						ctx.scale(-1, 1);
						triangleClip();
						ctx.drawImage(vidcanvas, vidcanvas.width/2-b/2, vidcanvas.height/2-h/2, b, h, 0, 0, b, h);
						ctx.restore();
					}

					ctx.translate(b,0);
					ctx.rotate(a);

			}

			ctx.restore();

			if (rotate.checked) {
				i++;
			}

		}, 1000/30);

	}); //loadedmetadata

	//save images as png data and display thumbnails with links to full imgs
	$('#canvas').click(function() {
		var imgdata = canvas.toDataURL('image/png');
		//var img = document.createElement('img');
		var img = $('<img class="thumb" alt="thumbnail" />');
		img.attr('src',imgdata);
		var imglink = $('<a title="Full Image" target="_blank"></a>');
		imglink.append(img);
		imglink.attr('href',imgdata);
		$('#pictures').append(imglink);
	});

});

/*
features to add:
save images
record and save video?
automatically resize on window resize
fullscreen?
filters?
reverse (when not rotating)
rotation speed control?
*/
