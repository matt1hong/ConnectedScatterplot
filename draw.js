var width = 700;
var height = 700;
var padding = 50; // prevent the line from coming too close to the edges

var points = [];

var steps;

var step = 0;

var svg, scatterLayer, drawingLayer, lineDrawn;

var studyID = "study2";

var resultID;

var startTime;

var presentationTime = 1000;

// mouse vars
var isMouseDown = false;
var lastPoint = null;

function drawSetup() {

	if (window.location.hash === '#test') {
		studyID += '-test';
	}

	steps = d3.range(datasets.length);

	d3.shuffle(steps);

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

	resultID = makeResultID();
}

function drawConnected(datasetnum) {
	var data = datasets[datasetnum].data;

	var xScale = d3.scale.linear()
		.range([padding, width-padding])
		.domain(d3.extent(data, function(d) { return d.value1; }));

	var yScale = d3.scale.linear()
		.range([height-padding, padding])
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
	// prevent weirdness
	if (isMouseDown)
		return;
	isMouseDown = true;

	points.push({x: mouse[0]/width, y: mouse[1]/height});
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
	// if mouse isn't down, do nothing
	if (! isMouseDown)
		return;
	if (lastPoint === null) return;

	distance = Math.sqrt((mouse[0]-lastPoint.x)*(mouse[0]-lastPoint.x)+(mouse[1]-lastPoint.y)*(mouse[1]-lastPoint.y));
	if (distance > DISTANCE_THRESHOLD) {
		points.push({x: mouse[0]/width, y: mouse[1]/height});
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
	// prevent weirdness
	if (!isMouseDown)
		return;
	isMouseDown = false;

	points.push({x: mouse[0]/width, y: mouse[1]/height});
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
	isMouseDown = false;
}

function connectMouseEvents() {
	svg.on('mousedown', mousedown).on('touchstart', touchdown)
		.on('mousemove', mousemove).on('touchmove', touchmove)
		.on('mouseup', mouseup).on('touchend', touchup)
		.on('mouseleave', mouseup);
}

function disconnectMouseEvents() {
	svg.on('mousedown', null).on('touchstart', null)
		.on('mousemove', null).on('touchmove', null)
		.on('mouseup', null).on('touchend', null)
		.on('mouseleave', null);
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
	submitResponse(studyID, resultID+'-'+datasets[steps[step-1]].name, {
		step: step,
		dataset: datasets[steps[step-1]].name,
		time: (new Date()).getTime()-startTime,
		presentationTime: presentationTime,
		platform: navigator.platform,
		points: points
	});
	if (step < steps.length) {
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
	resultID = makeResultID();
}
