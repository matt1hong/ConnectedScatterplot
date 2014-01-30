var width = 600,
    height = 600;

var points;

var showArrows = false;
var showDots = true;
var showLabels = false;

var commonScales = true;

var svgConnected;
var svgDualAxes;

var blueCircles;
var greenCircles;

var datasets;

var pointsToDraw;

var timeScale = d3.scale.linear()
	.range([5, width-5]);

var xScale = d3.scale.linear()
	.range([10, width-10]);

var yScale = d3.scale.linear()
	.range([height-10, 10]);

var draggedIndex = -1,
	draggingBlue = true,
    selectedIndex = -1;

var lineConnected = d3.svg.line()
    .x(function(d) { return xScale(d.value1); })
    .y(function(d) { return yScale(d.value2); })
    .interpolate('cardinal');

var lineDA1 = d3.svg.line()
	.x(function(d) { return timeScale(d.date); })
	.y(function(d) { return height-xScale(d.value1); })
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

	svgDualAxes = d3.select('#linechart').append('svg')
		.attr('width', width)
		.attr('height', height)
		.attr('tabindex', 1);

	svgDualAxes.append('path')
		.datum(points)
		.attr('class', 'line line1');

	svgDualAxes.append('path')
		.datum(points)
		.attr('class', 'line line2');

	redrawDualAxes(true);

	svgDualAxes
	    .on('mousemove', mousemoveDALC)
	    .on('mouseup', mouseup);

	// Connected Scatterplot

	svgConnected = d3.select('#connectedscatter').append('svg')
	    .attr('width', width)
	    .attr('height', height)
	    .attr('tabindex', 2);

	// marker triangle from http://www.w3.org/TR/SVG/painting.html#Markers
	svgConnected.append('defs')
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

	// svgConnected.selectAll('line.grid1')
	// 	.data(d3.range(-width, width, 50))
	// 	.enter().append('line')
	// 		.attr('class', 'grid1')
	// 		.attr('x1', function(d) { return d; })
	// 		.attr('y1', height)
	// 		.attr('x2', function(d) { return d+height; })
	// 		.attr('y2', 0);

	// svgConnected.selectAll('line.grid2')
	// 	.data(d3.range(-width, width, 50))
	// 	.enter().append('line')
	// 		.attr('class', 'grid2')
	// 		.attr('x1', function(d) { return d; })
	// 		.attr('y1', 0)
	// 		.attr('x2', function(d) { return d+height; })
	// 		.attr('y2', height);


	svgConnected.append('line')
		.attr('x1', 0)
		.attr('x2', width)
		.attr('y1', height-1)
		.attr('y2', height-1)
		.attr('class', 'line1');

	svgConnected.append('line')
		.attr('x1', 1)
		.attr('x2', 1)
		.attr('y1', 0)
		.attr('y2', height)
		.attr('class', 'line2');

	svgConnected.append('rect')
	    .attr('width', width)
	    .attr('height', height);

	svgConnected.append('path')
		.datum(points)
		.attr('class', 'line')
		.attr('marker-mid', showArrows?'url(#arrow)':'none')
		.attr('marker-end', showArrows?'url(#arrow)':'none');

	svgConnected
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
		svgConnected.select('path').datum(points.slice(0, pointsToDraw)).attr('d', lineConnected);

		svgConnected.selectAll('text').remove();

		if (showDots) {

			var circle = svgConnected.selectAll('circle')
				.data(points.slice(0, pointsToDraw));

			circle.enter().append('circle')
				.attr('r', 3)
				.on('mousedown', function(d, i) { selectedIndex = draggedIndex = i; redraw(false); })

			circle
				.classed('selected', function(d, i) { return i === selectedIndex; })
				.attr('cx', function(d) { return xScale(d.value1); })
				.attr('cy', function(d) { return yScale(d.value2); });

			circle.exit().remove();

			if (showLabels) {
				var text = svgConnected.selectAll('text')
					.data(points.slice(0, pointsToDraw));

				text.enter()
					.append('text')
						.text(function(d) { return (d.date.getFullYear()%5==0)?d.date.getFullYear():''; })
						.attr('x', function(d) { return xScale(d.value1); })
						.attr('y', function(d) { return yScale(d.value2) + 12; });

				text.exit().remove();
			}
		} else {
			svgConnected.selectAll('circle').remove();
			svgConnected.selectAll('text').remove();
		}
	} else {
		svgConnected.select('path').attr('d', lineConnected);

		svgConnected.selectAll('circle')
			.data(points.slice(0, pointsToDraw))
			.classed('selected', function(d, i) { return i === selectedIndex; })
			.attr('cx', function(d) { return xScale(d.value1); })
			.attr('cy', function(d) { return yScale(d.value2); });

		svgConnected.selectAll('text')
			.data(points.slice(0, pointsToDraw))
			.attr('x', function(d) { return xScale(d.value1); })
			.attr('y', function(d) { return yScale(d.value2) + 12; });
	}

	if (d3.event) {
		d3.event.preventDefault();
		d3.event.stopPropagation();
	}
}

function redrawDualAxes(recreate) {
	if (recreate) {
		svgDualAxes.select('path.line1').datum(points.slice(0, pointsToDraw)).attr('d', lineDA1);
		svgDualAxes.select('path.line2').datum(points.slice(0, pointsToDraw)).attr('d', lineDA2);

		if (showDots) {
			svgDualAxes.selectAll('circle').remove();

			blueCircles = svgDualAxes.selectAll('circle.line1')
				.data(points.slice(0, pointsToDraw));

			blueCircles.enter().append('circle')
				.attr('r', 3)
				.attr('class', 'line1')
				.on('mousedown', function(d, i) {
					selectedIndex = draggedIndex = i;
					draggingBlue = true;
					redraw(false);
				});

			blueCircles
				.classed('selected', function(d, i) { return i === selectedIndex; })
				.attr('cx', function(d) { return timeScale(d.date); })
				.attr('cy', function(d) { return height-xScale(d.value1); });

			greenCircles = svgDualAxes.selectAll('circle.line2')
				.data(points.slice(0, pointsToDraw));

			greenCircles.enter().append('circle')
				.attr('r', 3)
				.attr('class', 'line2')
				.on('mousedown', function(d, i) {
					selectedIndex = draggedIndex = i;
					draggingBlue = false;
					redraw(false);
				});

			greenCircles
				.classed('selected', function(d, i) { return i === selectedIndex; })
				.attr('cx', function(d) { return timeScale(d.date); })
				.attr('cy', function(d) { return yScale(d.value2); });
		} else {
			blueCircles.remove();
			greenCircles.remove();
		}
	} else {
		svgDualAxes.select('path.line1').attr('d', lineDA1);
		svgDualAxes.select('path.line2').attr('d', lineDA2);

		blueCircles
			.data(points.slice(0, pointsToDraw))
			.classed('selected', function(d, i) { return i === selectedIndex; })
			.attr('cy', function(d) { return height-xScale(d.value1); });
		greenCircles
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
	var m = d3.mouse(svgConnected.node());
	points[draggedIndex].value1 = xScale.invert(Math.max(0, Math.min(width, m[0])));
	points[draggedIndex].value2 = yScale.invert(Math.max(0, Math.min(height, m[1])));
	redraw(false);
}

function mousemoveDALC() {
	if (draggedIndex < 0) return;
	var m = d3.mouse(svgDualAxes.node());
	if (draggingBlue) {
		points[draggedIndex].value1 = xScale.invert(Math.max(0, Math.max(0, height-m[1])));
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
	svgConnected.select('path.line')
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