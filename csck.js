var width = 400,
    height = 400;

var showArrows = false;
var showDots = false;
var showLabels = false;
var showGrid = false;
var smoothLines = false;

var disconnected = false;
var cheatMode = true;

var study = false;

var clockwise = true;

// fraction of lines with arrows
var ARROW_FRACTION = .2;

var randomizeRightChart = false;

var initialDiamond = [{"date":"9/1/1980","value1":5,"value2":5},{"date":"1/1/1981","value1":5,"value2":6.11111111111111},{"date":"5/2/1981","value1":3.8888888888888895,"value2":5},{"date":"9/1/1981","value1":5,"value2":3.888888888888889},{"date":"1/1/1982","value1":6.111111111111112,"value2":5}];

var interactDALC = true;
var interactConnected = true;

var DAGRIDSIZE = height/9;

var GENERATEDATASETS = true;

var PADX = 60;
var PADY = 20;

var commonScales = false;

var leftChart;
var rightChart;

// these are just for the CSCK, so the two can communicate when points are moved.
var globalDALC, globalCS;

var currentDataSet;

var pointsToDraw;

var timeScale = d3.time.scale(d3.time.month, 3)
	.range([10, width-10]);

var xScale = d3.scale.linear()
	.range([width, 0]);

var yScale = d3.scale.linear()
	.range([height, 0]);

var draggedIndex = -1,
	draggingBlue = true,
    selectedIndex = -1;

function surrogateTimeSeries(dataset) {
	if(typeof(dataset.data) !== 'undefined'){
		data = dataset.data;
	} else { data = dataset; }
	if (data.length % 2 == 0) {
		data.pop();
	}

	// isolating the values
	var values1 = [];
	var values2 = [];

	for (var i = 0; i < data.length; i++) {
		values1.push(data[i].value1);
		values2.push(data[i].value2);
	};

	// get parameters
	var half_length = (data.length - 1) / 2;

	var interv1 = math.range(1, half_length + 1);
	var interv2 = math.range(half_length + 1, data.length);

	// fft
	var fft_freq1 = new complex_array.ComplexArray(data.length);
	var fft_freq2 = new complex_array.ComplexArray(data.length);
	for (i = 0; i < data.length; i++) {
		fft_freq1.real[i] = values1[i]
		fft_freq2.real[i] = values2[i]
	};
	fft_freq1.FFT();
	fft_freq2.FFT();

	var freq1 = math.zeros(data.length, 1);
	var freq2 = math.zeros(data.length, 1);
	for (i = 0; i < data.length; i++) {
		freq1 = math.subset(
			freq1,
			math.index(i, 0),
			math.complex(fft_freq1.real[i], fft_freq1.imag[i]));
		freq2 = math.subset(
			freq2,
			math.index(i, 0),
			math.complex(fft_freq2.real[i], fft_freq2.imag[i]));	
	};

	// surrogates
	var surrogate_freq1 = [];
	var surrogate_freq2 = [];

	var phase_rand = math.zeros(half_length, 1);
	phase_rand = phase_rand
					.map(function(value, index, matrix) {
						return value + Math.random();
					});

	phase_interv1 = math.exp(math.multiply(phase_rand, math.multiply(2*Math.PI,math.complex(0,1))));

	//// upside down 
	phase_interv2 = math.zeros(half_length, 1);
	phase_interv1.forEach(function(value, index, matrix) {
		phase_interv2 = math.subset(
					phase_interv2, 
					math.index(half_length - index[0] - 1, index[1]),
					math.subset(matrix, math.index(index[0], index[1]))
		);
	});
	
	phase_interv2 = math.conj(phase_interv2);
	
	// beware: switchs row and columns
	array1 = surrogate_freq1 = math.concat(
					math.transpose(math.dotMultiply(math.subset(freq1, math.index(interv1, 0)),phase_interv1)),
					math.transpose(math.dotMultiply(math.subset(freq1, math.index(interv2, 0)),phase_interv2))
					);
	surrogate_freq2 = math.concat(
					math.transpose(math.dotMultiply(math.subset(freq2, math.index(interv1, 0)),phase_interv1)),
					math.transpose(math.dotMultiply(math.subset(freq2, math.index(interv2, 0)),phase_interv2))
					);
	
	var surrogate1 = new complex_array.ComplexArray(data.length);
	var surrogate2 = new complex_array.ComplexArray(data.length);

	for (i = 0; i < half_length * 2; i++) {
		surrogate1.real[i] = surrogate_freq1._data[0][i].re;
		surrogate1.imag[i] = surrogate_freq1._data[0][i].im;
		surrogate2.real[i] = surrogate_freq2._data[0][i].re;
		surrogate2.imag[i] = surrogate_freq2._data[0][i].im;
	};

	surrogate1.InvFFT();
	surrogate2.InvFFT();

	var newDataset = [];
	for (i = 0; i < half_length * 2; i++) {
		newDataset.push({
			date: new Date('1/1/' + (1980 + i + 6)),
			value1: surrogate1.real[i],
			value2: surrogate2.real[i]
		})
	};

	return newDataset;	
}

function makePairedSeries(maxTime, numSteps, drift, volat, initVal1, initVal2) {
	// Browning motion

	var approxRandN = function() {
		return (Math.random() + Math.random() + Math.random() + 
				Math.random() + Math.random() + Math.random() +
				Math.random() + Math.random() + Math.random() +
				Math.random() + Math.random() + Math.random()) - 6
	}

	var data = [];

	var dTime = maxTime/numSteps;

	data.push({
			date: new Date('1/1/' + 1986),
			value1: initVal1,
			value2: initVal2
		})

	for (var i = 1; i < numSteps; i++) {
		var Wt1 = Math.sqrt(dTime) * approxRandN();
		var Wt2 = Math.sqrt(dTime) * approxRandN();

		var Xt1 = initVal1 * Math.exp((drift - Math.pow(volat, 2) / 2) * dTime + volat * Wt1);
		var Xt2 = initVal2 * Math.exp((drift - Math.pow(volat, 2) / 2) * dTime + volat * Wt2);

		data.push({
			date: new Date('1/1/' + (1980 + i + 6)),
			value1: Xt1,
			value2: Xt2
		})

		initVal1 = Xt1;
		initVal2 = Xt2;
	};
	
	return data;
}

function makeDataSets() {

	var parallelSines = [];
	var parallelSines2 = [];
	var increasingSines = [];
	var increasingSines2 = [];
	var freqSines = [];
	var spiral = [];

	var d = new Date();
	for (var i = 0; i < Math.PI*4; i += Math.PI/12) {
		var p = {
			date: d,
			value1: Math.sin(i) * 2,
			value2: Math.sin(i)
		}
		parallelSines.push(p);

		var p = {
			date: d,
			value1: Math.sin(i),
			value2: Math.sin(i+1)
		}
		parallelSines2.push(p);

		p = {
			date: d,
			value1: Math.sin(i)+(i)/4,
			value2: Math.sin(i)+i/2
		}
		increasingSines.push(p);

		p = {
			date: d,
			value1: Math.sin(i)+(i)/4,
			value2: Math.sin(i)+i/3
		}
		increasingSines2.push(p);

		p = {
			date: d,
			value1: Math.sin(i),
			value2: Math.cos(i*1.5)
		}
		freqSines.push(p);

		d = new Date(d.getTime()+24*3600*1000);
	}

	d = new Date();
	for (var i = 0; i < Math.PI*15; i += Math.PI/2) {
		var p = {
			date: d,
			value1: Math.sin(i)*i,
			value2: Math.cos(i)*i
		}
		spiral.push(p);

		d = new Date(d.getTime()+24*3600*1000);
	}

	// maxTime, numSteps, drift, volat, initVal1, initVal2
	randomPaired = makePairedSeries(1,20,0,0.2,1,1);
	// surrogate = surrogateTimeSeries(datasets[20]);
	console.log(datasets)
	datasets.push({"name":"parallel", "display":"Parallel Sines", "data":parallelSines, "commonScales":true});
	datasets.push({"name":"parallel2", "display":"Parallel Sines 2", "data":parallelSines2, "commonScales":true});
	datasets.push({"name":"increasing", "display":"Increasing Sines", "data":increasingSines, "commonScales":true});
	datasets.push({"name":"increasing2", "display":"Increasing Sines 2", "data":increasingSines2, "commonScales":true});
	datasets.push({"name":"spiral", "display":"Spiral", "data":spiral, "commonScales":true});
	datasets.push({"name":"frequency", "display":"Different Frequency", "data":freqSines, "commonScales":true});
	datasets.push({"name":"random", "display":"Random", "data":randomPaired, "commonScales":false});
	
	par_2_surrogate = surrogateTimeSeries(datasets[20]);
	datasets.push({"name":"loops", "display":"Loops", "data":par_2_surrogate, "commonScales":true});
	
	surrogate = surrogateTimeSeries(datasets[17]);
	datasets.push({"name":"surrogate", "display":"Surrogate", "data":surrogate, "commonScales":true});

	// surrogate && vertical translation
	vert_surrogate = [];
	d = new Date();
	for (var i = 0; i < surrogate.length-1; i++) {
		vert_surrogate.push({
			date: d,
			value1: surrogate[i].value1,
			value2: surrogate[i].value2 + 1
		})
		d = new Date(d.getTime()+24*3600*1000);
	};
	datasets.push({"name":"surrogate vert", "display":"Surrogate Vert", "data":vert_surrogate, "commonScales":true});


	vert_trans = [];
	vert_trans_inv = [];

	horiz_trans = [];

	d = new Date();
	for (var i = 0; i < randomPaired.length-1; i++) {
		horiz_trans.push({
			date: d,
			value1: randomPaired[i].value1,
			value2: randomPaired[i+1].value1
		})
		d = new Date(d.getTime()+24*3600*1000);
	};
	datasets.push({"name":"time_shift", "display":"Time shift", "data":horiz_trans, "commonScales":true});

	// Scaling
	var values2Sum = 0, values2Avg = 0;
	for (var i = 0; i < surrogate.length; i++) {
		// console.log(surrogate[i].value2)
		values2Sum += surrogate[i].value2;
	};
	values2Avg = values2Sum / surrogate.length;

	var vert_scaled = [];
	d = new Date();
	for (var i = 0; i < surrogate.length-1; i++) {
		vert_scaled.push({
			date: d,
			value1: surrogate[i].value1,
			value2: ((surrogate[i].value2 - values2Avg) * 2) + values2Avg
		})
		d = new Date(d.getTime()+24*3600*1000);
	};
	datasets.push({"name":"vert_scaling", "display":"Scaling", "data":vert_scaled, "commonScales":true});
	
	var vert_scaled_eg = [{"date":"10/16/2015","value1":-0.23052801191806793,"value2":-2.7404365387878244},{"date":"10/17/2015","value1":0.1626681536436081,"value2":-0.13312757733677116},{"date":"10/18/2015","value1":-0.09764640778303146,"value2":0.3753742727317981},{"date":"10/19/2015","value1":-0.4547399878501892,"value2":-0.6822610345802137},{"date":"10/20/2015","value1":0.16949954628944397,"value2":0.2158168258943728},{"date":"10/21/2015","value1":0.719472348690033,"value2":1.4728056344070604},{"date":"10/22/2015","value1":0.30204683542251587,"value2":1.5032358321228196},{"date":"10/23/2015","value1":0.03770734369754791,"value2":2.5077140482940847},{"date":"10/24/2015","value1":-1.1764459609985352,"value2":-1.0028306690177748},{"date":"10/25/2015","value1":-0.8237906098365784,"value2":-1.3455397931060622},{"date":"10/26/2015","value1":-0.3442874550819397,"value2":-1.3747323599777053},{"date":"10/27/2015","value1":-0.0694962665438652,"value2":-0.44660358104322634},{"date":"10/28/2015","value1":0.1770358830690384,"value2":1.0358348044433763}];


	var periodic_corr = [{"date":"10/17/2015","value1":0,"value2":0},{"date":"10/18/2015","value1":2,"value2":0.7071067811865475},{"date":"10/19/2015","value1":1.424375,"value2":1.424375},{"date":"10/20/2015","value1":0.7243750000000002,"value2":2},{"date":"10/21/2015","value1":2.4492935982947064e-16,"value2":1.2246467991473532e-16},{"date":"10/22/2015","value1":-0.6956249999999999,"value2":-1.975625},{"date":"10/23/2015","value1":-1.3156249999999998,"value2":-1.305625},{"date":"10/24/2015","value1":-1.975625,"value2":-0.7071067811865477},{"date":"10/25/2015","value1":-4.898587196589413e-16,"value2":-2.4492935982947064e-16},{"date":"10/26/2015","value1":2,"value2":0.7071067811865474},{"date":"10/27/2015","value1":1.4543750000000002,"value2":1.424375},{"date":"10/28/2015","value1":0.7443750000000002,"value2":2},{"date":"10/29/2015","value1":7.347880794884119e-16,"value2":3.6739403974420594e-16},{"date":"10/30/2015","value1":-0.6956249999999999,"value2":-1.955625},{"date":"10/31/2015","value1":-1.305625,"value2":-1.305625},{"date":"11/1/2015","value1":-1.965625,"value2":-0.7071067811865459}];
	datasets.push({"name":"periodic_corr", "display":"Periodic Correlated Orig", "data":periodic_corr, "commonScales":true});
	var periodic_corr_2 = [{"date":"10/17/2015","value1":0,"value2":0},{"date":"10/18/2015","value1":2,"value2":0.7071067811865475},{"date":"10/19/2015","value1":2,"value2":2},{"date":"10/20/2015","value1":0.7243750000000002,"value2":2},{"date":"10/21/2015","value1":2.4492935982947064e-16,"value2":1.2246467991473532e-16},{"date":"10/22/2015","value1":-0.6956249999999999,"value2":-1.975625},{"date":"10/23/2015","value1":-1.98121572265625,"value2":-1.975625},{"date":"10/24/2015","value1":-1.975625,"value2":-0.7071067811865477},{"date":"10/25/2015","value1":-4.898587196589413e-16,"value2":-2.4492935982947064e-16},{"date":"10/26/2015","value1":2,"value2":0.7071067811865474},{"date":"10/27/2015","value1":2,"value2":2},{"date":"10/28/2015","value1":0.7443750000000002,"value2":2},{"date":"10/29/2015","value1":7.347880794884119e-16,"value2":3.6739403974420594e-16},{"date":"10/30/2015","value1":-0.6956249999999999,"value2":-1.955625},{"date":"10/31/2015","value1":-1.94145947265625,"value2":-1.95139853515625}];
	datasets.push({"name":"periodic_corr_surr2", "display":"Periodic Correlated 2", "data":surrogateTimeSeries(periodic_corr_2), "commonScales":true});

	var periodic_corr_surr = surrogateTimeSeries(periodic_corr);
	datasets.push({"name":"periodic_corr_surr", "display":"Periodic Correlated", "data":periodic_corr_surr, "commonScales":true});

	// d = new Date();
	// for (var i = 0; i < surrogate.length; i++) {
	// 	vert_trans.push({
	// 		date: d,
	// 		value1: surrogate[i].value1,
	// 		value2: surrogate[i].value2 + 1
	// 	});
	// 	vert_trans_inv.push({
	// 		date: d,
	// 		value1: surrogate[i].value1 * -1 - 6,
	// 		value2: surrogate[i].value2
	// 	});
	// 	d = new Date(d.getTime()+24*3600*1000);
	// };

	// half_tall = [{"date":"1/1/1980","value1":0.47144531250000005,"value2":0.71109375},{"date":"5/2/1980","value1":0.5295703125,"value2":0.66609375},{"date":"9/1/1980","value1":0.49957031250000006,"value2":0.59859375},{"date":"1/1/1981","value1":0.45269531250000006,"value2":0.52359375},{"date":"5/2/1981","value1":0.4039453125,"value2":0.55109375},{"date":"9/1/1981","value1":0.4264453125,"value2":0.67109375},{"date":"1/1/1982","value1":0.5070703125,"value2":0.78609375},{"date":"5/2/1982","value1":0.5858203125,"value2":0.83609375},{"date":"9/1/1982","value1":0.6364453125,"value2":0.84859375},{"date":"1/1/1983","value1":0.6420703125,"value2":0.78609375},{"date":"5/2/1983","value1":0.5914453125,"value2":0.6960937500000001},{"date":"9/1/1983","value1":0.5183203125,"value2":0.59609375},{"date":"1/1/1984","value1":0.42457031250000005,"value2":0.43609375}];
	// datasets.push({"name":"half_tall", "display":"Half tall", "data":half_tall, "commonScales":true});

	// d = new Date();
	// for (var i = 0; i < randomPaired.length-1; i++) {
	// 	vert_trans.push({
	// 		date: d,
	// 		value1: randomPaired[i].value1,
	// 		value2: randomPaired[i+1].value1 + 0.1 * (math.random() - 0.5)
	// 	})
	// 	d = new Date(d.getTime()+24*3600*1000);
	// };
	// datasets.push({"name":"vertical", "display":"Vertical Translation", "data":vert_trans, "commonScales":true});
	// datasets.push({"name":"vertical_inv", "display":"Vertical Translation Inv", "data":vert_trans_inv, "commonScales":true});

	var charData = generateData(20,4,0.1);
	datasets.push({"name":"charData", "display":"Test Data", "data":charData, "commonScales":true});
}

function generateData(n, dist, variance) {
	// correct if indivisible
	var numSteps = Math.ceil(n/dist);
	n = numSteps * dist;
	var initPoints1 = [];
	var initPoints2 = [];
	var dataset = [];
	var partial = [];
	var dir1, dir2, step1, step2, nextPt1, nextPt2
	for (var i = 0; i <= dist; i++) {
		initPoints1.push(Math.random());
		initPoints2.push(Math.random());
	};
	for (var i=0; i<n; i++) {
		var seg = Math.floor(i/numSteps);
		if (i%numSteps === 0) { 
			if (i !== 0) {
				dataset = dataset.concat(partial);
				partial = [];
			}
			partial.push({
				date: new Date('1/1/' + (1980 + i)),
				value1: initPoints1[seg],
				value2: initPoints2[seg]
			}); 
			step1 = (initPoints1[seg+1] - initPoints1[seg]) / numSteps;
			step2 = (initPoints2[seg+1] - initPoints2[seg]) / numSteps;
			continue;
		}
		nextPt1 = (Math.random() - 0.5) / (0.5/variance);
		nextPt2 = nextPt1 * step2 / step1
		partial.push({
			date: new Date('1/1/' + (1980 + i)),
			value1: initPoints1[seg] + step1 * (i%numSteps) + nextPt1,
			value2: initPoints2[seg] + step2 * (i%numSteps) + nextPt2
		});
	}
	dataset = dataset.concat(partial);
	return dataset;
}

function transform(dataset) {
	var values1 = [], values2 = [], dates = [];
	for (var i = 0; i < dataset.length; i++) {
		values1.push(dataset[i].value1);
		values2.push(dataset[i].value2);
		dates.push(dataset[i].date);
	};
	var corr = 1;
	var i = 0;
	while (corr > 0.91 || corr < 0.89) {
		values2[i % dataset.length] += (Math.random()-0.5)/50;
		corr = Math.abs(ss.sampleCorrelation(values1, values2));
		i++;
	}
	var newData = [];
	for (var i = 0; i < dataset.length; i++) {
		newData.push({
			date: dates[i],
			value1: values1[i],
			value2: values2[i]
		});
	};
	return newData;
}

function makeDALC(lineChartSelector, interactive, dataPoints) {

	var dualAxes = {
		svg: null,
		background: null,
		foreground: null,
		blueCircles: null,
		greenCircles: null,
		points: dataPoints,
		isConnected: false
	}

	dualAxes.lineDA1 = d3.svg.line()
		.x(function(d) { return timeScale(d.date); })
		.y(function(d) { return xScale(d.value1); })
		.interpolate(smoothLines?'cardinal':'linear');

	dualAxes.lineDA2 = d3.svg.line()
		.x(function(d) { return timeScale(d.date); })
		.y(function(d) { return yScale(d.value2); })
		.interpolate(smoothLines?'cardinal':'linear');

	d3.select(lineChartSelector).select('svg').remove();

	dualAxes.svg = d3.select(lineChartSelector).append('svg')
		.attr('width', width+2*PADX)
		.attr('height', height+2*PADY)
		.attr('tabindex', 1);

	dualAxes.background = dualAxes.svg.append('g');

	dualAxes.background.append('path')
		.attr('class', 'cheat1')
		.attr('transform', 'translate('+PADX+' '+PADY+')')
		.style('display', cheatMode?'inline':'none');

	dualAxes.background.append('path')
		.attr('class', 'cheat2')
		.attr('transform', 'translate('+PADX+' '+PADY+')')
		.style('display', cheatMode?'inline':'none');

	dualAxes.foreground = dualAxes.svg.append('g')
		.attr('transform', 'translate('+PADX+' '+PADY+')');

	dualAxes.foreground.append('rect')
		.attr('width', width)
		.attr('height', height);

	dualAxes.foreground.append('path')
		.datum(dualAxes.points)
		.attr('class', 'line line1');

	dualAxes.foreground.append('path')
		.datum(dualAxes.points)
		.attr('class', 'line line2');

	if (interactive) {	
		dualAxes.foreground
			.on('mousemove', function() {
				mousemoveDALC(dualAxes);
			})
			.on('mouseup', mouseup);
	}

	dualAxes.redraw = function(recreate) {
		redrawDualAxes(dualAxes, recreate);
	}

	dualAxes.toggleSmooth = function() {
		if (smoothLines) {
			dualAxes.lineDA1.interpolate('cardinal');
			dualAxes.lineDA2.interpolate('cardinal');
		} else {
			dualAxes.lineDA1.interpolate('linear');
			dualAxes.lineDA2.interpolate('linear');
		}
	}

	dualAxes.toggleCheatMode = function() {
		if (cheatMode) {
			dualAxes.background.select('path.cheat1').style('display', 'inline');
			dualAxes.background.select('path.cheat2').style('display', 'inline');
		} else {
			dualAxes.background.select('path.cheat1').style('display', 'none');
			dualAxes.background.select('path.cheat2').style('display', 'none');
		}
	}

	dualAxes.toggleGrid = function() {
		if (showGrid) {
			dualAxes.background.selectAll('line.grid')
				.data(d3.range(DAGRIDSIZE, height, DAGRIDSIZE))
				.enter().append('line')
					.attr('class', 'grid')
					.attr('x1', PADX)
					.attr('y1', function(d) { return PADY+Math.round(d)+.5; })
					.attr('x2', PADX+width)
					.attr('y2', function(d) { return PADY+Math.round(d)+.5; });
		} else {
			dualAxes.background.selectAll('line.grid').remove();
		}
	}

	return dualAxes;
}

function makeConnected(connectedScatterSelector, interactive, dataPoints) {

	var connected = {
		svg: null,
		background: null,
		foreground: null,
		points: dataPoints,
		isConnected: true
	};

	connected.lineDA = d3.svg.line()
		.x(function(d) { return width-xScale(d.value1); })
		.y(function(d) { return yScale(d.value2); })
		.interpolate(smoothLines?'cardinal':'linear');

	d3.select(connectedScatterSelector).select('svg').remove();

	connected.svg = d3.select(connectedScatterSelector).append('svg')
		.attr('width', width+1.5*PADX)
		.attr('height', height+2*PADY)
		.attr('tabindex', 2);

	connected.background = connected.svg.append('g');

	connected.background.append('path')
		.attr('class', 'cheat')
		.attr('transform', 'translate('+PADX+' '+PADY+')')
		.style('display', cheatMode?'inline':'none');
//		.datum(connected.points);

	connected.foreground = connected.svg.append('g')
		.attr('transform', 'translate('+PADX+' '+PADY+')');

	// marker triangle from http://www.w3.org/TR/SVG/painting.html#Markers
	connected.foreground.append('defs')
		.append('marker')
			.attr('id', 'arrow')
			.attr('viewBox', '0 0 10 6')
			.attr('refX', 8)
			.attr('refY', 3)
			.attr('markerUnits', 'strokeWidth')
			.attr('markerWidth', 8)
			.attr('markerHeight', 5)
			.attr('orient', 'auto')
			.attr('stroke', 'white')
			.attr('stroke-width', 0.5)
			.attr('fill', 'purple')
			.append('polygon')
				.attr('points', '0,0 10,3 0,6');

	connected.foreground.append('rect')
		.attr('width', width)
		.attr('height', height);

	connected.foreground.append('path')
		.datum(connected.points)
		.attr('d', connected.lineDA)
		.attr('class', 'line');

	if (interactive) {
		connected.foreground
			.on('mousemove', function() {
				mousemoveCS(connected);
			})
			.on('mouseup', mouseup);
	}

	connected.redraw = function(recreate) {
		redrawConnected(connected, recreate);
	}

	connected.toggleSmooth = function() {
		if (smoothLines) {
			connected.lineDA.interpolate('cardinal');
		} else {
			connected.lineDA.interpolate('linear');
		}
	}

	connected.toggleCheatMode = function() {
		if (cheatMode) {
			connected.background.select('path.cheat').style('display', 'inline');
		} else {
			connected.background.select('path.cheat').style('display', 'none');
		}
	}

	connected.toggleGrid = function() {
		if (showGrid) {
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
		}
	}

	return connected;
}


function initialSetup(leftChartDALC, rightChartDALC) {

	if (GENERATEDATASETS)
		makeDataSets();

	d3.select('#dataset').selectAll('option')
		.data(datasets)
		.enter().append('option')
			.attr('value', function(d, i) { return i; })
			.attr('class', function(d) { return 'data-'+d.name; })
			.text(function(d) { return d.display; });

	currentDataSet = datasets[0];

	d3.select('option.data-'+datasets[0].name).attr('selected', true);

	if (leftChartDALC)
		globalDALC = leftChart = makeDALC('#leftChart', true, datasets[0].data);
	else
		globalCS = leftChart = makeConnected('#leftChart', true, datasets[0].data);

	if (rightChartDALC)
		globalDALC = rightChart = makeDALC('#rightChart', true, datasets[0].data);
	else
		globalCS = rightChart = makeConnected('#rightChart', true, datasets[0].data);

	afterUpdatePoints();
}

function scaleScales() {
	leftChart.points.forEach(function (d) {
		d.date = new Date(d.date);
	});

	timeScale.domain([leftChart.points[0].date, leftChart.points[leftChart.points.length-1].date]);
	if (study) {
		xScale.domain([0, 10]);
		yScale.domain([0, 10]);
	} else if (commonScales) {
		var e1 = d3.extent(leftChart.points, function(d) { return d.value1; });
		var e2 = d3.extent(leftChart.points, function(d) { return d.value2; });
		var extent = [Math.min(e1[0], e2[0]), Math.max(e1[1], e2[1])];
		xScale.domain(extent);
		yScale.domain(extent);
	} else {
		xScale.domain(d3.extent(leftChart.points, function(d) { return d.value1; }));
		yScale.domain(d3.extent(leftChart.points, function(d) { return d.value2; }));

		// xScale.domain([0.3, 0.8]);
		// yScale.domain([0.3, 0.8]);
	}

	copyLefttoRight();
}

function otherChart(chart) {
	if (chart === leftChart)
		return rightChart;
	else
		return leftChart;
}

function redrawConnected(connected, recreate) {
	if (recreate) {
		connected.foreground.selectAll('line').remove();

		var path = connected.foreground.select('path');
		path.datum(connected.points.slice(0, pointsToDraw)).attr('d', connected.lineDA);

		connected.arrows = [];

		if (showArrows) {
			var segments = [];
			var pathSegments = path.node().pathSegList;
			for (var i = 1; i < pathSegments.numberOfItems; i += 1) {
				var lastX = pathSegments.getItem(i-1).x;
				var lastY = pathSegments.getItem(i-1).y;
				var x = pathSegments.getItem(i).x;
				var y = pathSegments.getItem(i).y;
				segments.push({
					index: i,
					length: (x-lastX)*(x-lastX)+(y-lastY)*(y-lastY),
					x: x,
					y: y,
					lastX: lastX,
					lastY: lastY
				});
			}

			if (!study)
				segments.sort(function(a, b) { return b.length-a.length; });

			var indices = [];

			var i = 0;
			while (indices.length < segments.length*ARROW_FRACTION) {
				if (indices.indexOf(segments[i].index+1) == -1 && indices.indexOf(segments[i].index-1) == -1) {
					var x = (segments[i].x+segments[i].lastX)/2;
					var y = (segments[i].y+segments[i].lastY)/2;
					connected.arrows.push(segments[i]);
					segments[i].line = connected.foreground.append('line')
						.attr('x1', segments[i].lastX)
						.attr('y1', segments[i].lastY)
						.attr('x2', x)
						.attr('y2', y)
						.style('marker-end', 'url(#arrow)');
					indices.push(segments[i].index);
				}
				i += 1;
			}
		}

		connected.foreground.selectAll('text').remove();

		connected.background.selectAll('g').remove();

		connected.background.select('path').datum(otherChart(connected).points).attr('d', connected.lineDA);

		var xScaleInverse = d3.scale.linear()
			.domain(xScale.domain())
			.range([0, width]);

		var xAxis = d3.svg.axis()
			.scale(xScaleInverse)
			.orient('bottom');

		connected.background.append('g')
			.attr('class', 'axis1')
			.attr('transform', 'translate('+PADX+' '+(PADY+height)+')')
			.call(xAxis);

		connected.background.append('g')
			.attr('class', 'axislabel')
			.attr('transform', 'translate('+(PADX+width)+' '+(PADY+height-5)+')')
			.append('text')
				.attr('class', 'axis1')
				.attr('x', 0)
				.attr('y', 0)
				.attr('text-anchor', 'end')
				.text(currentDataSet.label1);

		var yAxis = d3.svg.axis()
			.scale(yScale)
			.orient('left');

		connected.background.append('g')
			.attr('class', 'axis2')
			.attr('transform', 'translate('+PADX+' '+PADY+')')
			.call(yAxis);

		connected.background.append('g')
			.attr('class', 'axislabel')
			.attr('transform', 'translate('+(PADX+11)+' '+PADY+') rotate(-90)')
			.append('text')
				.attr('class', 'axis2')
				.attr('x', 0)
				.attr('y', 0)
				.attr('text-anchor', 'end')
				.text(currentDataSet.label2);

		connected.foreground.selectAll('circle').remove();

		if (showDots) {

			var circle = connected.foreground.selectAll('circle')
				.data(connected.points.slice(0, pointsToDraw));

			circle.enter().append('circle')
				.attr('r', 3)
				.on('mousedown', function(d, i) {
					if (interactConnected) {
						selectedIndex = draggedIndex = i;
						redraw(false);
					}
				});

			circle
				.classed('selected', function(d, i) { return i === selectedIndex && !study; })
				.attr('cx', function(d) { return width-xScale(d.value1); })
				.attr('cy', function(d) { return yScale(d.value2); });

			circle.exit().remove();

			if (showLabels) {
				var text = connected.foreground.selectAll('text')
					.data(connected.points.slice(0, pointsToDraw));

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

		var path = connected.foreground.select('path');
		
		path.attr('d', connected.lineDA);

		connected.arrows.forEach(function(arrow) {
			var seg = path.node().pathSegList.getItem(arrow.index);
			var prevSeg = path.node().pathSegList.getItem(arrow.index-1);
			var x = (seg.x+prevSeg.x)/2;
			var y = (seg.y+prevSeg.y)/2;
			arrow.line
				.attr('x1', prevSeg.x)
				.attr('y1', prevSeg.y)
				.attr('x2', x)
				.attr('y2', y);
		});

		if (cheatMode)
			connected.background.select('path').attr('d', connected.lineDA);

		connected.foreground.selectAll('circle')
			.data(connected.points.slice(0, pointsToDraw))
			.classed('selected', function(d, i) { return i === selectedIndex && !study; })
			.attr('cx', function(d) { return width-xScale(d.value1); })
			.attr('cy', function(d) { return yScale(d.value2); });

		connected.foreground.selectAll('text')
			.data(connected.points.slice(0, pointsToDraw))
			.attr('x', function(d) { return width-xScale(d.value1); })
			.attr('y', function(d) { return yScale(d.value2) + 12; });
	}

	if (d3.event) {
		d3.event.preventDefault();
		d3.event.stopPropagation();
	}
}

function redrawDualAxes(dualAxes, recreate) {
	if (recreate) {
		dualAxes.foreground.select('path.line1').datum(dualAxes.points.slice(0, pointsToDraw)).attr('d', dualAxes.lineDA1);
		dualAxes.foreground.select('path.line2').datum(dualAxes.points.slice(0, pointsToDraw)).attr('d', dualAxes.lineDA2);

		if (cheatMode) {
			dualAxes.background.select('path.cheat1').datum(otherChart(dualAxes).points).attr('d', dualAxes.lineDA1);
			dualAxes.background.select('path.cheat2').datum(otherChart(dualAxes).points).attr('d', dualAxes.lineDA2);
		}

		dualAxes.background.selectAll('g').remove();

		var timeAxis = d3.svg.axis()
			.scale(timeScale)
			.tickFormat(d3.time.format('%Y'))
			.orient('bottom');

		if (study)
			timeAxis.ticks(5);

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

		dualAxes.background.append('g')
			.attr('class', 'axislabel')
			.attr('transform', 'translate('+(PADX+11)+' '+PADY+') rotate(-90)')
			.append('text')
				.attr('class', 'axis1')
				.attr('x', 0)
				.attr('y', 0)
				.attr('text-anchor', 'end')
				.text(currentDataSet.label1);

		var axis2 = d3.svg.axis()
			.scale(yScale)
			.orient('right');

		dualAxes.background.append('g')
			.attr('class', 'axis2')
			.attr('transform', 'translate('+(PADX+width)+' '+PADY+')')
			.call(axis2);

		dualAxes.background.append('g')
			.attr('class', 'axislabel')
			.attr('transform', 'translate('+(PADX+width-5)+' '+PADY+') rotate(-90)')
			.append('text')
				.attr('class', 'axis2')
				.attr('x', 0)
				.attr('y', 0)
				.attr('text-anchor', 'end')
				.text(currentDataSet.label2);

		if (showDots) {
			dualAxes.foreground.selectAll('circle').remove();

			dualAxes.blueCircles = dualAxes.foreground.selectAll('circle.line1')
				.data(dualAxes.points.slice(0, pointsToDraw));

			dualAxes.blueCircles.enter().append('circle')
				.attr('r', 3)
				.attr('class', 'line1')
				.on('mousedown', function(d, i) {
					if (interactDALC) {
						selectedIndex = draggedIndex = i;
						draggingBlue = true;
						redraw(false);
					}
				});

			dualAxes.blueCircles
				.classed('selected', function(d, i) { return i === selectedIndex && !study; })
				.attr('cx', function(d) { return timeScale(d.date); })
				.attr('cy', function(d) { return xScale(d.value1); });

			dualAxes.greenCircles = dualAxes.foreground.selectAll('circle.line2')
				.data(dualAxes.points.slice(0, pointsToDraw));

			dualAxes.greenCircles.enter().append('circle')
				.attr('r', 3)
				.attr('class', 'line2')
				.on('mousedown', function(d, i) {
					if (interactDALC) {
						selectedIndex = draggedIndex = i;
						draggingBlue = false;
						redraw(false);
					}
				});

			dualAxes.greenCircles
				.classed('selected', function(d, i) { return i === selectedIndex && !study; })
				.attr('cx', function(d) { return timeScale(d.date); })
				.attr('cy', function(d) { return yScale(d.value2); });
		} else if (showDots) {
			dualAxes.blueCircles.remove();
			dualAxes.greenCircles.remove();
		}
	} else {
		dualAxes.foreground.select('path.line1').attr('d', dualAxes.lineDA1);
		dualAxes.foreground.select('path.line2').attr('d', dualAxes.lineDA2);

		if (cheatMode) {
			dualAxes.background.select('path.cheat1').attr('d', dualAxes.lineDA1);
			dualAxes.background.select('path.cheat2').attr('d', dualAxes.lineDA2);
		}

		dualAxes.blueCircles
			.data(dualAxes.points.slice(0, pointsToDraw))
			.classed('selected', function(d, i) { return i === selectedIndex && !study; })
			.attr('cy', function(d) { return xScale(d.value1); });
		dualAxes.greenCircles
			.data(dualAxes.points.slice(0, pointsToDraw))
			.classed('selected', function(d, i) { return i === selectedIndex && !study; })
			.attr('cy', function(d) { return yScale(d.value2); });
	}
}

function redraw(recreate) {
	leftChart.redraw(recreate);
	rightChart.redraw(recreate);
}

function mousemoveCS(connected) {
	if (draggedIndex < 0) return;
	var m = d3.mouse(connected.foreground.node());
	if (showGrid) {
		m[0] = Math.round(m[0]/(DAGRIDSIZE/2));
		m[1] = Math.round(m[1]/(DAGRIDSIZE/2));
		m[1] = Math.floor(m[1]/2)*2+(m[0] & 1);
		m[0] *= DAGRIDSIZE/2;
		m[1] *= DAGRIDSIZE/2;
	}

	connected.points[draggedIndex].value1 = xScale.invert(Math.max(0, Math.min(width, width-m[0])));
	connected.points[draggedIndex].value2 = yScale.invert(Math.max(0, Math.min(height, m[1])));

	if (!disconnected) {
		globalDALC.points[draggedIndex].value1 = connected.points[draggedIndex].value1;
		globalDALC.points[draggedIndex].value2 = connected.points[draggedIndex].value2;
	}

	redraw(false);
}

function mousemoveDALC(dualAxes) {
	if (draggedIndex < 0) return;
	var m = d3.mouse(dualAxes.foreground.node());
	var value;
	if (showGrid) {
		m[1] = Math.round(m[1]/DAGRIDSIZE)*DAGRIDSIZE;
	}

	if (draggingBlue) {
		dualAxes.points[draggedIndex].value1 = xScale.invert(Math.max(0, Math.max(0, m[1])));
	} else {
		dualAxes.points[draggedIndex].value2 = yScale.invert(Math.max(0, Math.min(height, m[1])));
	}

	if (!disconnected) {
		globalCS.points[draggedIndex].value1 = dualAxes.points[draggedIndex].value1;
		globalCS.points[draggedIndex].value2 = dualAxes.points[draggedIndex].value2;
	}

	redraw(false);
}

function mouseup() {
	draggedIndex = -1;
}

function toggleSmooth(checked) {
	smoothLines = checked;

	leftChart.toggleSmooth();
	rightChart.toggleSmooth();

	redraw(true);
}

function toggleArrows(checked) {
	showArrows = checked;
	if (showArrows) {
		d3.select('#smooth').attr('checked', null);
		toggleSmooth(false);
	} else
		redraw(true);
}

function toggleLabels(checked) {
	showLabels = checked;
	redraw(true);
}

function toggleDots(checked) {
	showDots = checked;
	d3.select('#labels').attr('disabled', showDots?null:true);
	redraw(true);
}

function toggleGrid(checked) {
	showGrid = checked;

	leftChart.toggleGrid();
	rightChart.toggleGrid();

	redraw(false);
}

function toggleDisconnect(checked) {
	disconnected = checked;
	if (!disconnected)
		copyLefttoRight();
	d3.select('#cheatMode').attr('disabled', disconnected?null:true);
	redraw(true);
}

function toggleCheatMode(checked) {
	cheatMode = checked;

	leftChart.toggleCheatMode();
	rightChart.toggleCheatMode();

	redraw(true);
}

function flipH() {
	var min = xScale.domain()[0];
	var max = xScale.domain()[1];
	leftChart.points.forEach(function(d) {
		d.value1 = max-(d.value1-min);
	});
	copyLefttoRight();
	redraw(true);
}

function flipV() {
	var min = yScale.domain()[0];
	var max = yScale.domain()[1];
	leftChart.points.forEach(function(d) {
		d.value2 = max-(d.value2-min);
	});
	copyLefttoRight();
	redraw(true);
}

function exchangeAxes() {
	leftChart.points.forEach(function(d) {
		var temp = d.value1;
		d.value1 = xScale.invert(yScale(d.value2));
		d.value2 = yScale.invert(xScale(temp));
	});
	copyLefttoRight();
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
  currentDataSet = datasets[index];
  leftChart.points = rightChart.points = datasets[index].data;
  commonScales = !!datasets[index].commonScales;
  afterUpdatePoints();
}

function copyLefttoRight() {
	rightChart.points = [];
	leftChart.points.forEach(function(d) {
		rightChart.points.push({
			date:d.date,
			value1:d.value1,
			value2:d.value2
		});
	});
}

function copyRighttoLeft() {
	leftChart.points = [];
	rightChart.points.forEach(function(d) {
		leftChart.points.push({
			date:d.date,
			value1:d.value1,
			value2:d.value2
		});
	});
}

function randomize(points) {
	
	var orderValues = initialDiamond.slice();

	orderValues.unshift.apply(initialDiamond, initialDiamond.splice(Math.random()*initialDiamond.length, initialDiamond.length));

	clockwise = Math.random() >= .5;

	for (var i = 0; i < points.length; i++) {
		if (clockwise) {
			points[i].value1 = orderValues[i].value2;
			points[i].value2 = orderValues[i].value1;
		} else {
			points[i].value1 = orderValues[i].value1;
			points[i].value2 = orderValues[i].value2;
		}
	}
}

function afterUpdatePoints() {
	scaleScales();

	if (randomizeRightChart)
		randomize(rightChart.points);

	sliderValue = 0;
	pointsToDraw = leftChart.points.length;
	$('.slider').slider('option', 'max', pointsToDraw);
	$('#shiftSlider').slider('value', 0);
	$('#drawSlider').slider('value', pointsToDraw);

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
	for (var p = 1; p < leftChart.points.length; p++) {
		for (var s = 1; s <= steps; s++) {
			var proportion = s / (steps+1);
			newSamples.push(interpolatePair(leftChart.points[p-1], leftChart.points[p], proportion));
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
	leftChart.points = leftChart.points.concat(newSamples);
	leftChart.points = sortPointsByDate(leftChart.points);
	copyLefttoRight();
	afterUpdatePoints();
}

function pearsonCorrelation(prefs, p1, p2) {
  var si = [];

  for (var key in prefs[p1]) {
    if (prefs[p2][key]) si.push(key);
  }

  var n = si.length;

  if (n == 0) return 0;

  var sum1 = 0;
  for (var i = 0; i < si.length; i++) sum1 += prefs[p1][si[i]];

  var sum2 = 0;
  for (var i = 0; i < si.length; i++) sum2 += prefs[p2][si[i]];

  var sum1Sq = 0;
  for (var i = 0; i < si.length; i++) {
    sum1Sq += Math.pow(prefs[p1][si[i]], 2);
  }

  var sum2Sq = 0;
  for (var i = 0; i < si.length; i++) {
    sum2Sq += Math.pow(prefs[p2][si[i]], 2);
  }

  var pSum = 0;
  for (var i = 0; i < si.length; i++) {
    pSum += prefs[p1][si[i]] * prefs[p2][si[i]];
  }

  var num = pSum - (sum1 * sum2 / n);
  var den = Math.sqrt((sum1Sq - Math.pow(sum1, 2) / n) *
      (sum2Sq - Math.pow(sum2, 2) / n));

  if (den == 0) return 0;

  return num / den;
}