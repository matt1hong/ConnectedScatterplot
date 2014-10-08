
var sunspots;
var flutrends;
var sinewave;

var settings = {
	periodicity: 52,
	overlap: 0,
	shift: 0,
	svg: null,
	data: null
}

var svgSize = 800;

function csplot(xOffset, yOffset, dataOffset1, dataOffset2, numValues, scale) {

	var initialOverlap = Math.min(dataOffset1, dataOffset2, settings.overlap);	

	var line = d3.svg.line()
		.x(function(d, i) { return xOffset+scale(settings.data[dataOffset1-initialOverlap+i].value); })
		.y(function(d, i) { return yOffset+scale(settings.data[dataOffset2-initialOverlap+i+settings.shift].value); });

	if (Math.max(dataOffset1, dataOffset2)+settings.shift+numValues+settings.overlap > settings.data.length) {
		numValues = settings.data.length-(Math.max(dataOffset1, dataOffset2)+settings.shift+settings.overlap);
	} else {
		numValues += settings.overlap;
	}

	settings.svg.append('path')
		.attr('d', line(d3.range(initialOverlap+numValues)))
		.attr('class', 'csplot');
}

function sliceTime() {
	var numSlices = Math.ceil(settings.data.length/settings.periodicity);

	var scale = d3.scale.linear()
		.domain(d3.extent(settings.data, function(d) { return d.value; }))
		.range([0, svgSize/numSlices]);

	settings.svg.selectAll('.csplot').remove();

	for (var y = 0; y < numSlices; y += 1) {
		for (var x = 0; x < numSlices; x += 1) {
			if (x <= y) {
				var rest = (Math.max(x, y)*settings.periodicity>settings.data.length-settings.periodicity)?settings.data.length-Math.max(x, y)*settings.periodicity:settings.periodicity;
				csplot(x*svgSize/numSlices, y*svgSize/numSlices, x*settings.periodicity, y*settings.periodicity, rest, scale);
			}
		}
	}
}

function init() {
	queue().defer(d3.csv, 'google-flu-trends.csv')
		.defer(d3.csv, 'sunspots.csv')
		.await(function(error, fludata, sundata) {
			
			sunspots = sundata.map(function(d) {
				return {
					date: new Date(d.year, d.month-1, 1),
					value: +d.ssn
				}
			});

			flutrends = fludata.map(function(d) {
				return {
					date: new Date(d.Date),
					value: +d['United States']
				}
			});

			settings.data = flutrends;

			settings.svg = d3.select('#chart').append('svg')
				.attr('width', svgSize)
				.attr('height', svgSize);

			setupSliders();

			sliceTime();
		});

	sine = [];
	var d = new Date();
	for (var i = 0; i < Math.PI*12; i += Math.PI/25) {
		var p = {
			date: d,
			value: i*Math.sin(i),
		}
		sine.push(p);

		d = new Date(d.getTime()+24*3600*1000);
	}
}
