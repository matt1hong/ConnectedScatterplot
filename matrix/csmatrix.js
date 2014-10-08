
var sunspots;
var flutrends;
var sinewave;

var settings = {
	periodicity: 52,
	overlap: 5,
	shift: 0,
	numSlices: 10,
	svg: null,
	data: null
}

var svgSize = 800;

function csplot(xOffset, yOffset, dataOffset1, dataOffset2, numValues, scale) {

	var line = d3.svg.line()
		.x(function(d, i) { return xOffset+scale(settings.data[dataOffset1+i]); })
		.y(function(d, i) { return yOffset+scale(settings.data[dataOffset2+i+settings.shift]); });

	if (Math.max(dataOffset1, dataOffset2)+settings.shift+numValues > settings.data.length) {
		numValues = settings.data.length-(Math.max(dataOffset1, dataOffset2)+settings.shift);
	}

	settings.svg.append('path')
		.attr('d', line(d3.range(numValues)))
		.attr('class', 'csplot');

	if (settings.overlap > 0) {
		var initialOverlap = Math.min(dataOffset1, dataOffset2, settings.overlap);
		dataOffset1 -= initialOverlap;
		dataOffset2 -= initialOverlap;

		if (initialOverlap > 1) {
			settings.svg.append('path')
				.attr('d', line(d3.range(initialOverlap+1)))
				.attr('class', 'csoverlap');
		}

		dataOffset1 += initialOverlap+numValues-1;
		dataOffset2 += initialOverlap+numValues-1;

		numValues = Math.min(settings.data.length-(dataOffset1+settings.overlap), settings.data.length-(dataOffset2+settings.shift+settings.overlap), settings.overlap);

		if (numValues > 1) {
			settings.svg.append('path')
				.attr('d', line(d3.range(numValues)))
				.attr('class', 'csoverlap');
		}
	}
}

function daplot(xOffset, yOffset, dataOffset1, dataOffset2, numValues, yScale, xScale) {

	var line = d3.svg.line()
		.x(function(d) { return xOffset+xScale(d); })
		.y(function(d) { return yOffset+yScale(settings.data[dataOffset1+d]); });

	if (Math.max(dataOffset1, dataOffset2)+settings.shift+numValues > settings.data.length) {
		numValues = settings.data.length-(Math.max(dataOffset1, dataOffset2)+settings.shift);
	}

	settings.svg.append('path')
		.attr('d', line(d3.range(numValues)))
		.attr('class', 'daplot1');

	line.y(function(d) { return yOffset+yScale(settings.data[dataOffset2+d+settings.shift]); });

	settings.svg.append('path')
		.attr('d', line(d3.range(numValues)))
		.attr('class', 'daplot2');
}

function sliceTime() {
	
	var numSlices = Math.min(Math.ceil(settings.data.length/settings.periodicity), settings.numSlices);

	var plotSize = svgSize/settings.numSlices;

	var scale = d3.scale.linear()
		.domain(d3.extent(settings.data))
		.range([0, svgSize/settings.numSlices]);

	var xScale = d3.scale.linear()
		.domain([0, settings.periodicity])
		.range([0, plotSize]);

	settings.svg.selectAll('path').remove();

	for (var y = 0; y < numSlices; y += 1) {
		for (var x = 0; x < numSlices; x += 1) {
			var rest = (Math.max(x, y)*settings.periodicity>settings.data.length-settings.periodicity)?settings.data.length-Math.max(x, y)*settings.periodicity:settings.periodicity;
			if (x >= y) {
				csplot(x*plotSize, y*plotSize, x*settings.periodicity, y*settings.periodicity, rest, scale);
			} else {
				daplot(x*plotSize, y*plotSize, x*settings.periodicity, y*settings.periodicity, rest, scale, xScale);
			}
		}
	}
}

function init() {
	queue().defer(d3.csv, 'google-flu-trends.csv')
		.defer(d3.csv, 'sunspots.csv')
		.await(function(error, fludata, sundata) {
			
			// resample sunspots to yearly average, as the monthly data is very noisy
			sunspots = [];
			var month = 0;
			var sum = 0;
			for (var i = 0; i < sundata.length; i += 1) {
				sum += +sundata[i].ssn;
				month += 1;
				if (month == 12) {
					sunspots.push(sum/12);
					sum = 0;
					month = 0;
				}
			}
			if (month > 0) {
				sunspots.push(sum/month);
			}


			flutrends = fludata.map(function(d) { return +d['United States']; });

			settings.data = flutrends;

			settings.svg = d3.select('#chart').append('svg')
				.attr('width', svgSize)
				.attr('height', svgSize);

			setupSliders();

			sliceTime();
		});

	sine = [];
	for (var i = 0; i < Math.PI*12; i += Math.PI/25) {
		sine.push(i*Math.sin(i));
	}
}
