var width = 700;
var height = 700;

var points = [];

var datasets = [army, helium, drivingsafety, scorpion, yellen, china, steamship, sofa, sofa2];

var datanames = ['army', 'helium', 'drivingsafety', 'scorpion', 'yellen', 'china', 'steamship', 'sofa', 'sofa2'];

var steps = d3.range(datasets.length);

d3.shuffle(steps);

var step = 0;

var svg, scatterLayer, drawingLayer, lineDrawn;

var studyID = "study1";

var resultID;

var startTime;

var presentationTime = 1000;

function drawSetup() {

	svg = d3.select('#drawingarea').append('svg')
			.attr('width', width)
			.attr('height', height);

	// marker triangle from http://www.w3.org/TR/SVG/painting.html#Markers
	svg.append('defs')
		.append('marker')
		.attr('id', 'arrow')
		.attr('viewBox', '0 0 10 6')
		.attr('refX', 10)
		.attr('refY', 3)
		.attr('markerUnits', 'strokeWidth')
		.attr('markerWidth', 4)
		.attr('markerHeight', 2)
		.attr('orient', 'auto')
		.attr('stroke', 'none')
		.attr('fill', 'black')
		.append('polygon')
			.attr('points', '0,0 10,3 0,6');

	scatterLayer = svg.append('g').style('visibility', 'hidden');;

	drawingLayer = svg.append('g').style('visibility', 'hidden');

	drawingLayer.append('path')
		.attr('class', 'drawn')
		.datum(points);

	makeResultID();
}

function drawConnected(datasetnum) {
	var data = datasets[datasetnum];

	var xScale = d3.scale.linear()
		.range([10, width-10])
		.domain(d3.extent(data, function(d) { return d.value1; }));

	var yScale = d3.scale.linear()
		.range([height-10, 10])
		.domain(d3.extent(data, function(d) { return d.value2; }));

	var lineConnected = d3.svg.line()
	    .x(function(d) { return xScale(d.value1); })
	    .y(function(d) { return yScale(d.value2); })
	    .interpolate('cardinal');

	lineDrawn = d3.svg.line()
		.x(function(d) { return d.x * width; })
		.y(function(d) { return d.y * height; })
		.interpolate('cardinal');

	scatterLayer.select('path').remove();

	scatterLayer.append('path')
		.attr('class', 'line')
		.datum(data)
		.attr('d', lineConnected);

	scatterLayer.style('visibility', 'visible');
}

var lastPoint = null;

function mousedown() {
	var mouse = d3.mouse(svg.node());
	mtDown(mouse);
}

function touchdown() {
	var touches = d3.touches(svg.node());
	mtDown(touches[0]);
	d3.event.preventDefault();
}

function mtDown(mouse) {
	points.unshift({x: mouse[0]/width, y: mouse[1]/height});
	lastPoint = {x: mouse[0], y: mouse[1]};
	redraw();
}

var DISTANCE_THRESHOLD = 20;

function mousemove() {
	var mouse = d3.mouse(svg.node());
	mtMove(mouse);
}

function touchmove() {
	var touches = d3.touches(svg.node());
	mtMove(touches[0]);
	d3.event.preventDefault();
}

function mtMove(mouse) {
	if (lastPoint === null) return;
	distance = Math.sqrt((mouse[0]-lastPoint.x)*(mouse[0]-lastPoint.x)+(mouse[1]-lastPoint.y)*(mouse[1]-lastPoint.y));
	if (distance > DISTANCE_THRESHOLD) {
		points.unshift({x: mouse[0]/width, y: mouse[1]/height});
		lastPoint.x = mouse[0];
		lastPoint.y = mouse[1];
	}
	redraw();
}

function mouseup() {
	var mouse = d3.mouse(svg.node());
	mtUp(mouse);
}

function touchup() {
	var touches = d3.touches(svg.node());
	mtUp(touches[0]);
	d3.event.preventDefault();
}

function mtUp(mouse) {
	points.unshift({x: mouse[0]/width, y: mouse[1]/height});
	drawingMode = false;
	lastPoint = null;
	redraw();
}

function redraw() {
	drawingLayer.select('path')
		.attr('d', lineDrawn);
}

function clearDrawing() {
	points = [];
	drawingLayer.select('path').remove();
	drawingLayer.append('path')
		.attr('class', 'drawn')
		.datum(points);
	drawingMode = true;
}

function connectMouseEvents() {
	svg.on('mousedown', mousedown).on('touchstart', touchdown)
		.on('mousemove', mousemove).on('touchmove', touchmove)
		.on('mouseup', mouseup).on('touchend', touchup);
}

function disconnectMouseEvents() {
	svg.on('mousedown', null).on('touchstart', null)
		.on('mousemove', null).on('touchmove', null)
		.on('mouseup', null).on('touchend', null);
}

function start() {
	d3.select('#startbtn').style('visibility', 'hidden');
	d3.select('#info').style('display', 'none');
	disconnectMouseEvents();
	drawConnected(steps[step]);
	clearDrawing();
	startTime = new Date().getTime();
	window.setTimeout(function() {
		scatterLayer.style('visibility', 'hidden');
		drawingLayer.style('visibility', 'visible');
		d3.select('#donebtn').style('visibility', 'visible');
		connectMouseEvents();
		step += 1;
	}, presentationTime);
}

function done() {
	scatterLayer.style('visibility', 'visible');
	d3.select('#donebtn').style('visibility', 'hidden');
	submitResponse();
	if (step < datasets.length) {
		d3.select('#startbtn').style('visibility', 'visible').text('Next Step');
	} else {
		// done
		d3.select('#infolabel').style('visibility', 'visible');
		d3.select('#restartbtn').style('visibility', 'visible');
	}
}

function restart() {
	d3.select('#restartbtn').style('visibility', 'hidden')
	d3.select('#infolabel').style('visibility', 'hidden');
	d3.select('#startbtn').style('visibility', 'visible').text('Start Experiment');
	clearDrawing();
	scatterLayer.style('visibility', 'hidden');
	step = 0;
	d3.shuffle(steps);
	makeResultID();
}

function submitResponse() {
	d3.xhr('http://draw.eagereyes.org/submit.php')
		.header('content-type', 'application/x-www-form-urlencoded')
		.post('study='+encodeURIComponent(studyID)+'&'+
			'resultID='+encodeURIComponent(resultID+'-'+datanames[steps[step-1]])+'&'+
			'data='+encodeURIComponent(JSON.stringify({
				step: step,
				dataset: datanames[steps[step-1]],
				time: (new Date()).getTime()-startTime,
				presentationTime: presentationTime,
				platform: navigator.platform,
				points: points
			})))
		.on('error', function(error) {
			console.log('ERROR: '+error);
		});
}

function makeResultID() {
	var d = ''+(new Date()).getTime();
	var s = '000000' + Math.floor(Math.random()*1000000);
	resultID = d + '-' + s.substr(s.length-6);
}