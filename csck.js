var width = 600,
    height = 600;

var points;

var showArrows = false;
var showDots = true;
var showLabels = false;
var showGrid = false;

var DAGRIDSIZE = height/9;

var PADX = 40;
var PADY = 20;

var commonScales = true;

var connected = {
	svg: null,
	background: null,
	foreground: null
};

var dualAxes = {
	svg: null,
	background: null,
	foreground: null,
	blueCircles: null,
	greenCircles: null
}


var datasets;

var pointsToDraw;

var timeScale = d3.time.scale()
	.range([0, width]);

var xScale = d3.scale.linear()
	.range([width, 0]);

var yScale = d3.scale.linear()
	.range([height, 0]);

var draggedIndex = -1,
	draggingBlue = true,
    selectedIndex = -1;

var lineConnected = d3.svg.line()
    .x(function(d) { return width-xScale(d.value1); })
    .y(function(d) { return yScale(d.value2); })
    .interpolate('cardinal');

var lineDA1 = d3.svg.line()
	.x(function(d) { return timeScale(d.date); })
	.y(function(d) { return xScale(d.value1); })
	.interpolate('cardinal');

var lineDA2 = d3.svg.line()
	.x(function(d) { return timeScale(d.date); })
	.y(function(d) { return yScale(d.value2); })
	.interpolate('cardinal');


function makeDataSets() {

	var parallelSines = [];
	var increasingSines = [];
	var freqSines = [];
	var spiral = [];

	var d = new Date();
	for (var i = 0; i < Math.PI*6; i += Math.PI/10) {
		var p = {
			date: d,
			value1: Math.sin(i)*2,
			value2: Math.sin(i)
		}
		parallelSines.push(p);

		p = {
			date: d,
			value1: Math.sin(i)+i/4,
			value2: Math.sin(i)+i/3
		}
		increasingSines.push(p);

		p = {
			date: d,
			value1: Math.sin(i),
			value2: Math.cos(i*1.5)
		}
		freqSines.push(p);

		d = new Date(d.getTime()+24*3600*1000);
	}

	d = new Date();
	for (var i = 0; i < Math.PI*15; i += Math.PI/10) {
		var p = {
			date: d,
			value1: Math.sin(i)*i,
			value2: Math.cos(i)*i
		}
		spiral.push(p);

		d = new Date(d.getTime()+24*3600*1000);
	}

	datasets.push({"name":"parallel", "display":"Parallel Sines", "data": parallelSines, "commonScales":true});
	datasets.push({"name":"increasing", "display":"Increasing Sines", "data": increasingSines, "commonScales":true});
	datasets.push({"name":"spiral", "display":"Spiral", "data": spiral, "commonScales":true});
	datasets.push({"name":"frequency", "display":"Different Frequency", "data": freqSines, "commonScales":true});
}


function initialSetup() {

	makeDataSets();

	d3.select('#dataset').selectAll('option')
		.data(datasets)
		.enter().append('option')
			.attr('value', function(d, i) { return i; })
			.attr('class', function(d) { return 'data-'+d.name; })
			.text(function(d) { return d.display; });

	points = datasets[datasets.length-1].data;

	d3.select('option.data-'+datasets[datasets.length-1].name).attr('selected', true);

	scaleScales();

	// Dual-Axes Line Chart

	dualAxes.svg = d3.select('#linechart').append('svg')
		.attr('width', width+2*PADX)
		.attr('height', height+2*PADY)
		.attr('tabindex', 1);

	dualAxes.background = dualAxes.svg.append('g');

	dualAxes.foreground = dualAxes.svg.append('g')
		.attr('transform', 'translate('+PADX+' '+PADY+')');

	dualAxes.foreground.append('path')
		.datum(points)
		.attr('class', 'line line1');

	dualAxes.foreground.append('path')
		.datum(points)
		.attr('class', 'line line2');

	redrawDualAxes(true);

	dualAxes.foreground
	    .on('mousemove', mousemoveDALC)
	    .on('mouseup', mouseup);

	// Connected Scatterplot

	connected.svg = d3.select('#connectedscatter').append('svg')
	    .attr('width', width+1.5*PADX)
	    .attr('height', height+2*PADY)
	    .attr('tabindex', 2);

	connected.background = connected.svg.append('g');

	connected.foreground = connected.svg.append('g')
		.attr('transform', 'translate('+PADX+' '+PADY+')');

	// marker triangle from http://www.w3.org/TR/SVG/painting.html#Markers
	connected.foreground.append('defs')
		.append('marker')
		.attr('id', 'arrow')
		.attr('viewBox', '0 0 10 6')
		.attr('refX', 10)
		.attr('refY', 3)
		.attr('markerUnits', 'strokeWidth')
		.attr('markerWidth', 8)
		.attr('markerHeight', 5)
		.attr('orient', 'auto')
		.attr('stroke', 'none')
		.attr('fill', 'purple')
		.append('polygon')
			.attr('points', '0,0 10,3 0,6');

	connected.foreground.append('rect')
	    .attr('width', width)
	    .attr('height', height);

	connected.foreground.append('path')
		.datum(points)
		.attr('class', 'line')
		.attr('marker-mid', showArrows?'url(#arrow)':'none')
		.attr('marker-end', showArrows?'url(#arrow)':'none');

	connected.foreground
	    .on('mousemove', mousemoveCS)
	    .on('mouseup', mouseup);

	pointsToDraw = points.length;
	$('.slider').slider('option', 'max', points.length);
	$('#shiftSlider').slider('value', 0);
	$('#drawSlider').slider('value', points.length);

	redraw(true);
}

function scaleScales() {
	points.forEach(function (d) {
		d.date = new Date(d.date);
	});

	timeScale.domain([points[0].date, points[points.length-1].date]);
	if (commonScales) {
		var e1 = d3.extent(points, function(d) { return d.value1; });
		var e2 = d3.extent(points, function(d) { return d.value2; });
		var extent = [Math.min(e1[0], e2[0]), Math.max(e1[1], e2[1])];
		xScale.domain(extent);
		yScale.domain(extent);
	} else {
		xScale.domain(d3.extent(points, function(d) { return d.value1; }));
		yScale.domain(d3.extent(points, function(d) { return d.value2; }));
	}
}

function redrawConnected(recreate) {
	if (recreate) {
		connected.foreground.select('path').datum(points.slice(0, pointsToDraw)).attr('d', lineConnected);

		connected.foreground.selectAll('text').remove();

		connected.background.selectAll('g').remove();

		var xAxis = d3.svg.axis()
			.scale(xScale)
			.orient('bottom');

		connected.background.append('g')
			.attr('class', 'axis1')
			.attr('transform', 'translate('+PADX+' '+(PADY+height)+')')
			.call(xAxis);

		var yAxis = d3.svg.axis()
			.scale(yScale)
			.orient('left');

		connected.background.append('g')
			.attr('class', 'axis2')
			.attr('transform', 'translate('+PADX+' '+PADY+')')
			.call(yAxis);

		if (showDots) {

			var circle = connected.foreground.selectAll('circle')
				.data(points.slice(0, pointsToDraw));

			circle.enter().append('circle')
				.attr('r', 3)
				.on('mousedown', function(d, i) { selectedIndex = draggedIndex = i; redraw(false); })

			circle
				.classed('selected', function(d, i) { return i === selectedIndex; })
				.attr('cx', function(d) { return width-xScale(d.value1); })
				.attr('cy', function(d) { return yScale(d.value2); });

			circle.exit().remove();

			if (showLabels) {
				var text = connected.foreground.selectAll('text')
					.data(points.slice(0, pointsToDraw));

				text.enter()
					.append('text')
						.text(function(d) { return (d.date.getFullYear()%5==0)?d.date.getFullYear():''; })
						.attr('x', function(d) { return width-xScale(d.value1); })
						.attr('y', function(d) { return yScale(d.value2) + 12; });

				text.exit().remove();
			}
		} else {
			connected.foreground.selectAll('circle').remove();
			connected.foreground.selectAll('text').remove();
		}
	} else {
		connected.foreground.select('path').attr('d', lineConnected);

		connected.foreground.selectAll('circle')
			.data(points.slice(0, pointsToDraw))
			.classed('selected', function(d, i) { return i === selectedIndex; })
			.attr('cx', function(d) { return width-xScale(d.value1); })
			.attr('cy', function(d) { return yScale(d.value2); });

		connected.foreground.selectAll('text')
			.data(points.slice(0, pointsToDraw))
			.attr('x', function(d) { return width-xScale(d.value1); })
			.attr('y', function(d) { return yScale(d.value2) + 12; });
	}

	if (d3.event) {
		d3.event.preventDefault();
		d3.event.stopPropagation();
	}
}

function redrawDualAxes(recreate) {
	if (recreate) {
		dualAxes.foreground.select('path.line1').datum(points.slice(0, pointsToDraw)).attr('d', lineDA1);
		dualAxes.foreground.select('path.line2').datum(points.slice(0, pointsToDraw)).attr('d', lineDA2);

		dualAxes.background.selectAll('g').remove();

		var timeAxis = d3.svg.axis()
			.scale(timeScale)
			.tickFormat(d3.time.format('%Y'))
			.orient('bottom');

		dualAxes.background.append('g')
			.attr('class', 'axis')
			.attr('transform', 'translate('+PADX+' '+(PADY+height)+')')
			.call(timeAxis);

		var axis1 = d3.svg.axis()
			.scale(xScale)
			.orient('left');

		dualAxes.background.append('g')
			.attr('class', 'axis1')
			.attr('transform', 'translate('+PADX+' '+PADY+')')
			.call(axis1);

		var axis2 = d3.svg.axis()
			.scale(yScale)
			.orient('right');

		dualAxes.background.append('g')
			.attr('class', 'axis2')
			.attr('transform', 'translate('+(PADX+width)+' '+PADY+')')
			.call(axis2);

		if (showDots) {
			dualAxes.foreground.selectAll('circle').remove();

			dualAxes.blueCircles = dualAxes.foreground.selectAll('circle.line1')
				.data(points.slice(0, pointsToDraw));

			dualAxes.blueCircles.enter().append('circle')
				.attr('r', 3)
				.attr('class', 'line1')
				.on('mousedown', function(d, i) {
					selectedIndex = draggedIndex = i;
					draggingBlue = true;
					redraw(false);
				});

			dualAxes.blueCircles
				.classed('selected', function(d, i) { return i === selectedIndex; })
				.attr('cx', function(d) { return timeScale(d.date); })
				.attr('cy', function(d) { return xScale(d.value1); });

			dualAxes.greenCircles = dualAxes.foreground.selectAll('circle.line2')
				.data(points.slice(0, pointsToDraw));

			dualAxes.greenCircles.enter().append('circle')
				.attr('r', 3)
				.attr('class', 'line2')
				.on('mousedown', function(d, i) {
					selectedIndex = draggedIndex = i;
					draggingBlue = false;
					redraw(false);
				});

			dualAxes.greenCircles
				.classed('selected', function(d, i) { return i === selectedIndex; })
				.attr('cx', function(d) { return timeScale(d.date); })
				.attr('cy', function(d) { return yScale(d.value2); });
		} else {
			dualAxes.blueCircles.remove();
			dualAxes.greenCircles.remove();
		}
	} else {
		dualAxes.foreground.select('path.line1').attr('d', lineDA1);
		dualAxes.foreground.select('path.line2').attr('d', lineDA2);

		dualAxes.blueCircles
			.data(points.slice(0, pointsToDraw))
			.classed('selected', function(d, i) { return i === selectedIndex; })
			.attr('cy', function(d) { return xScale(d.value1); });
		dualAxes.greenCircles
			.data(points.slice(0, pointsToDraw))
			.classed('selected', function(d, i) { return i === selectedIndex; })
			.attr('cy', function(d) { return yScale(d.value2); });
	}
}

function redraw(recreate) {
	redrawConnected(recreate);
	redrawDualAxes(recreate);
}

function mousemoveCS() {
	if (draggedIndex < 0) return;
	var m = d3.mouse(connected.foreground.node());
	if (showGrid) {
		m[0] = Math.round(m[0]/(DAGRIDSIZE/2));
		m[1] = Math.round(m[1]/(DAGRIDSIZE/2));
		m[1] = Math.floor(m[1]/2)*2+(m[0] & 1);
		m[0] *= DAGRIDSIZE/2;
		m[1] *= DAGRIDSIZE/2;
	}

	points[draggedIndex].value1 = xScale.invert(Math.max(0, Math.min(width, width-m[0])));
	points[draggedIndex].value2 = yScale.invert(Math.max(0, Math.min(height, m[1])));

	redraw(false);
}

function mousemoveDALC() {
	if (draggedIndex < 0) return;
	var m = d3.mouse(dualAxes.foreground.node());
	var value;
	if (showGrid) {
		m[1] = Math.round(m[1]/DAGRIDSIZE)*DAGRIDSIZE;
	}

	if (draggingBlue) {
		points[draggedIndex].value1 = xScale.invert(Math.max(0, Math.max(0, m[1])));
	} else {
		points[draggedIndex].value2 = yScale.invert(Math.max(0, Math.min(height, m[1])));
	}

	redraw(false);
}

function mouseup() {
	if (draggedIndex < 0) return;
	draggedIndex = -1;
}

function toggleSmooth(checkbox) {
	if (checkbox.checked) {
		lineConnected.interpolate('cardinal');
		lineDA1.interpolate('cardinal');
		lineDA2.interpolate('cardinal');
	} else {
		lineConnected.interpolate('linear');
		lineDA1.interpolate('linear');
		lineDA2.interpolate('linear');
	}

	redraw(false);
}

function toggleArrows(checkbox) {
	showArrows = checkbox.checked;
	connected.foreground.select('path.line')
		.attr('marker-mid', showArrows?'url(#arrow)':'none')
		.attr('marker-end', showArrows?'url(#arrow)':'none');
	redraw(true);
}

function toggleLabels(checkbox) {
	showLabels = checkbox.checked;
	redraw(true);
}

function toggleDots(checkbox) {
	showDots = checkbox.checked;
	d3.select('#labels').attr('disabled', showDots?null:true);
	redraw(true);
}

function toggleGrid(checkbox) {
	showGrid = checkbox.checked;
	if (showGrid) {
		dualAxes.background.selectAll('line.grid')
			.data(d3.range(DAGRIDSIZE, height, DAGRIDSIZE))
			.enter().append('line')
				.attr('class', 'grid')
				.attr('x1', PADX)
				.attr('y1', function(d) { return PADY+Math.round(d)+.5; })
				.attr('x2', PADX+width)
				.attr('y2', function(d) { return PADY+Math.round(d)+.5; });

		connected.background.selectAll('line.grid1')
			.data(d3.range(-width, width, DAGRIDSIZE))
			.enter().append('line')
				.attr('class', 'grid1')
				.attr('x1', function(d) { return d>0?PADX+width:PADX+width+d; })
				.attr('y1', function(d) { return d>0?PADY+d:PADY; })
				.attr('x2', function(d) { return d>0?PADX+d:PADX; })
				.attr('y2', function(d) { return d>0?PADY+height:PADY+height+d; });

		connected.background.selectAll('line.grid2')
			.data(d3.range(-width, width, DAGRIDSIZE))
			.enter().append('line')
				.attr('class', 'grid2')
				.attr('x1', function(d) { return Math.max(PADX, PADX+d); })
				.attr('y1', function(d) { return d<0?PADY-d:PADY; })
				.attr('x2', function(d) { return Math.min(PADX+d+width, PADX+width); })
				.attr('y2', function(d) { return d<0?PADY+height:PADY+height-d; });

	} else {
		connected.background.selectAll('line.grid1').remove();
		connected.background.selectAll('line.grid2').remove();
		dualAxes.background.selectAll('line.grid').remove();
	}
	redraw(false);
}

function flipH() {
	var min = xScale.domain()[0];
	var max = xScale.domain()[1];
	points.forEach(function(d) {
		d.value1 = max-(d.value1-min);
	});
	redraw(true);
}

function flipV() {
	var min = yScale.domain()[0];
	var max = yScale.domain()[1];
	points.forEach(function(d) {
		d.value2 = max-(d.value2-min);
	});
	redraw(true);
}


function exchangeAxes() {
	points.forEach(function(d) {
		var temp = d.value1;
		d.value1 = xScale.invert(yScale(d.value2));
		d.value2 = yScale.invert(xScale(temp));
	});
}

function rotateCW() {
	exchangeAxes();
	flipH();
}

function rotateCCW() {
	exchangeAxes();
	flipV();
}

function loadData(index) {
  points = datasets[index].data;
  commonScales = !!datasets[index].commonScales;
  afterUpdatePoints();
}

function afterUpdatePoints() {
	scaleScales();

	sliderValue = 0;
	pointsToDraw = points.length;
	$('.slider').slider('option', 'max', points.length);
	$('#shiftSlider').slider('value', 0);
	$('#drawSlider').slider('value', points.length);

	redraw(true);
}

// add a point in between each in the current dataset
function addSamples() {
  // linearly interpolate a pair of values
  function lerp(a, b, proportion) { return a + (b-a)*proportion; }
  function lerpDate(a, b, proportion) { return Math.min(a,b) + (Math.abs(a-b)*proportion); }
  // interpolate a pair of points
  function interpolatePair(a, b, proportion) {
    return {
      date: lerpDate(a.date, b.date, proportion),
      value1: lerp(a.value1, b.value1, proportion),
      value2: lerp(a.value2, b.value2, proportion)
    }
  }

  // make the new samples
  var steps = 2;
  var newSamples = []
  for (var p = 1; p < points.length; p++) {
    for (var s = 1; s <= steps; s++) {
      var proportion = s / (steps+1);
      newSamples.push(interpolatePair(points[p-1], points[p], proportion));
    }
  }

  function sortPointsByDate(data) {
    return data.sort(function (a, b) {
      a = new Date(a.date);
      b = new Date(b.date);
      return a<b?-1 : a>b?1 : 0;
    });
  }

  // combine, sort, and update
  points = points.concat(newSamples);
  points = sortPointsByDate(points);
  afterUpdatePoints();
}