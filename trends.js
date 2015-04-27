$(function(){

var debug = true;

// Order of blocks to be given
var blockSeq = [2,3,1];

CHARTTYPE = 'd';

ARROW_FRACTION = 0.5;
GENERATEDATASETS = false;

interactDALC = false;
showArrows = false;
smoothLines = false;
showLabels = true;
study = true;
disconnected = true;
randomizeRightChart = true;
commonScales = true;
cheatMode = false;

var deg2rad = function(angle){
	return (angle / 180) * Math.PI;
};

var trendsDatasets = [];

var embedInDatasets = function(lines){
	//Embeds it in the original dataset
	var newDatasets = [];

	while (lines.length !== 0) {
		var dataset = JSON.parse(JSON.stringify(datasets[Math.floor(Math.random() * datasets.length)]));
		var line = lines.pop();

		var summedDistances = [];
		for (var i = 0; i < dataset.data.length - 1; i++) {
			//Calculating distances between points
			var dist1 = Math.pow(dataset.data[i].value1 - line.t1.value1, 2) + Math.pow(dataset.data[i].value2 - line.t1.value2, 2); 
			var dist2 = Math.pow(dataset.data[i + 1].value1 - line.t2.value1, 2) + Math.pow(dataset.data[i + 1].value2 - line.t2.value2, 2); 

			summedDistances.push(dist1 + dist2);
		};

		//Find the line segment closest to our new line segment
		var min = summedDistances[0];
		var minIndex = 0;
		for (var i = 1; i < summedDistances.length; i++) {
			if (summedDistances[i] < min) {
				min = summedDistances[i];
				minIndex = i;
			}
		};

		//Substitute
		var oldPoint1 = dataset.data[minIndex];
		var oldPoint2 = dataset.data[minIndex + 1];
		var newPoint1 = {'date': oldPoint1['date'], 'value1': line.t1.value1, 'value2': line.t1.value2};
		var newPoint2 = {'date': oldPoint2['date'], 'value1': line.t2.value1, 'value2': line.t2.value2};
		dataset.data[minIndex] = newPoint1;
		dataset.data[minIndex + 1] = newPoint2;
		dataset.ind = minIndex;

		dataset.params = {};

		if (line.dataClass === 'angles') {
			dataset.params.angle = line.angle;
			dataset.params.actualAngle = line.actualAngle;
		} else {
			dataset.params.slope1 = line.slope1;
			dataset.params.slope2 = line.slope2;
			dataset.params.actualSlope1 = line.actualSlope1;
			dataset.params.actualSlope2 = line.actualSlope2;
		}

		dataset.dataClass = line.dataClass;

		newDatasets.push(dataset);
	}

	return newDatasets;
}

var makeTrendsDataAngles = function() {
	//Generates data to be used for the trends study with the varying angles method
	var angleIncr = 3;
	var dist = 4;

	var lines = [];
	for (var angle = 0; angle < 360; angle += angleIncr) {
		var newLine = {};
		newLine.angle = angle;

		//Angles vary between angle +- 1
		angle = angle + Math.random() * 2 - 1;
		newLine.actualAngle = angle;

		//Pick a random point by generating two random values
		var t1 = {};
		t1.value1 = Math.random() * 10;
		t1.value2 = Math.random() * 10;

		//Get the point at distance d and angle away from that point
		var t2 = {};
		t2.value1 = t1.value1 + dist * Math.cos(deg2rad(angle));
		t2.value2 = t1.value2 + dist * Math.sin(deg2rad(angle));

		//If t2 not in bounds, go back, pick another random point at this angle
		if ((t2.value1 < 0) || 
			(t2.value2 < 0) || 
			(t2.value1 >= 10) || 
			(t2.value2 >= 10)) {
			angle -= angleIncr;
			continue;
		}

		newLine.t1 = t1;
		newLine.t2 = t2;

		newLine.dataClass = 'angles';

		//Save this line
		lines.push(newLine);
	};

	return embedInDatasets(lines);
};

var makeTrendsDataSlopes = function(){ 
	// Generates data to be used for the trends study according to the varying slopes method
	var numSamples = 5;

	//Limits on slope and distance leaves room for some variance
	var slopeLim = 4;
	var distLim = 9 - slopeLim;

	var dualLines = [];
	for (var i = -slopeLim; i <= slopeLim; i++) {
		for (var j = -slopeLim; j <= slopeLim; j++) {
			for (var d = 0; d < distLim; d++) {
				for (var s = 0; s < numSamples; s++) {
					var newLine = {};
					newLine.slope1 = i;
					newLine.slope2 = j;

					//Slopes vary between slope +- 0.1
					var randomSlope1 = i + Math.random() / 5 - 0.1;
					var randomSlope2 = j + Math.random() / 5 - 0.1;

					newLine.actualSlope1 = randomSlope1;
					newLine.actualSlope2 = randomSlope2;

					var t1 = {};
					var t2 = {};
					t1.value1 = Math.random() * 10;
					t2.value1 = t1.value1 + randomSlope1;

					//Controlling distances between midpoints
					var mid = (t1.value1 + t2.value1) / 2;

					t1.value2 = mid - d - randomSlope2 / 2;
					t2.value2 = mid - d + randomSlope2 / 2;

					// Make sure all lines are within bounds
					if (t1.value2 < 0 || 
						t1.value2 > 10 || 
						t2.value1 < 0 || 
						t2.value1 > 10 || 
						t2.value2 < 0 || 
						t2.value2 > 10) {
						--s;
						continue;
					}

					newLine.t1 = t1;
					newLine.t2 = t2;

					newLine.dataClass = 'slopes';

					dualLines.push(newLine);
				};
			};
		};
	};
	
	return embedInDatasets(dualLines);
}

var makeTrendsData = function(){
	dataAngles = makeTrendsDataAngles();
	dataSlopes = makeTrendsDataSlopes();

	trendsDatasets = dataAngles.concat(dataSlopes);
}

loadDataSets(true, makeTrendsData, 'translate'); //Loads to global 'datasets'

var delay = (debug ? 0 : 3000);
var penalty = (debug ? 0 : 5000);
var timeLimit = (debug ? 1000000 : 6000);
var numTrials = (debug ? 3 : 10);

// Block 1: Chart
// Block 2: Chart with highlighting
// Block 3: Chart with filtering
// Block 4: Single segment
var Block = function(chartType,blockClass, subjectID){
	this.chartType = chartType;
	this.blockClass = blockClass;
	this.subjectID = subjectID;
	this.trials = [];
	this.datasets = d3.shuffle(trendsDatasets);
};

var Trial = function(blockClass, dataset){
	// Attach data
	this.data = dataset.data;
	this.label1 = dataset.label1;
	this.label2 = dataset.label2;
	this.ind = dataset.ind;
	this.params = dataset.params;

	// Opacity of the features not in question
	if (blockClass === 1) {
		this.opacity = 1;
	} else if (blockClass === 2) {
		this.opacity = 0.3;
	} else if (blockClass === 3) {
		this.opacity = 0;
	}

	// Results
	this.response = null;
	this.responseTime = 0;
	this.correct = null;
};

var runBlock = function(blockNo){
	/**
	* Run blocks
	* blockSeq contains the order of blocks 
	*/
	var r = $.Deferred();

	var block = new Block(CHARTTYPE, blockNo, '000');

	for (var j = 0; j<numTrials; j++) {
		var trial = new Trial(block.blockClass, block.datasets[j]);
		block.trials.push(trial);
	};

	runTrials(block).then(function(){ r.resolve(); });

	return r;
};

var runExperiment = function(){
	//Runs the three blocks in the order given by the global var blockSeq
	runBlock(blockSeq[0])
		.then(function(){ runBlock(blockSeq[1])
			.then(function(){ runBlock(blockSeq[2]) 
				.then(function(){
					$('#study').hide();
					$('#leftChart').hide();
					$('#done').show();
				});
			});
		});
};

var tutorialNow = 1;
var tutorialStep = function(event){
	var k = event.keyCode;

	if (k === 83 || k === 68) {
		if (tutorialNow < 4) {
			$('#tutorial-' + tutorialNow).hide();
			$('#tutorial-' + (tutorialNow + 1)).show();
		} 
		else {
			$('#tutorial-' + tutorialNow).hide();
			$(document).unbind("keyup", tutorialStep);
			runExperiment();
		}
		++tutorialNow;
	}
};

//To send results
var sendJSON = function(_block, callback) {
    // // make sure version is set
    // _block.version = perfExperiment.version;
    // // show size of block data
    // console.log(encodeURIComponent(JSON.stringify(_block, null, " ")).length);

    // // get correctess and time
    // _block.avgRT = _block.trials.reduce(function (accumulator, trial) { return accumulator + trial.RT; }, 0) / _block.trials.length;
    // _block.avgCorrect = _block.trials.reduce(function (accumulator, trial) { return accumulator + trial.responseCorrect; }, 0) / _block.trials.length;

    // send
    delete _block.datasets;

    d3.xhr('submit-trends.php', 'application/x-www-form-urlencoded', callback)
        .header('content-type', 'application/x-www-form-urlencoded')
        .post('study=' + encodeURIComponent(_block.blockClass) + '&' +
            'subjectID=' + encodeURIComponent(_block.subjectID) + '&' +
            'data=' + encodeURIComponent(JSON.stringify(_block, null, " ")))
        .on('error', function (error) {
            console.log('ERROR: ' + error);
            if (typeof callback != "undefined")
                callback();
        });
};

var drawCS = function(trial){
	//Draw normally
	currentDataSet = trial.data;
	globalCS = leftChart = makeConnected('#leftChart', true, trial.data);
	globalDALC = rightChart = makeDALC('#rightChart', true, trial.data);
	afterUpdatePoints();

	//Change if you wanna mess with the axis min/max
	xScale.domain([0, 10]);
	yScale.domain([0, 10]);

	redraw(true);

	//Modify chart for this experiment
	leftChart.foreground.select('path').remove();
	leftChart.foreground.selectAll('circle').remove();
	leftChart.foreground.selectAll('text').remove();
	leftChart.foreground.selectAll('line').remove();

	//Draw path, graying out liness other than one in question
	var points = trial.data.slice(trial.ind, trial.ind + 2);
	
	for (var i = 0; i < leftChart.points.length - 1; i++) {
		leftChart.foreground.append('path')
			.datum(leftChart.points.slice(i, i+2))
			.attr('d', leftChart.lineDA)
			.attr('class', 'line')
			.attr('opacity', function() {
				return i === trial.ind ? 1 : trial.opacity;
			});
	};

	//Draw circles, graying out points other than ones in question
	var circle = leftChart.foreground.selectAll('circle')
		.data(leftChart.points.slice(0, pointsToDraw))
			.enter()
		.append('circle')
		.attr('class', 'cs')
		.attr('r', 2)
		.attr('cx', function(d) { return width-xScale(d.value1); })
		.attr('cy', function(d) { return yScale(d.value2); })
		.attr('opacity', function(d, i) {
			return (i === trial.ind || i === trial.ind + 1) ? 1 : trial.opacity;
		})
		.attr('fill', 'purple');

	//Put a label on each point
	var text = leftChart.foreground.selectAll('text')
		.data(leftChart.points.slice(0, pointsToDraw));

	text.enter()
		.append('text')
			.text(function(d) { return d.date.getFullYear(); })
			.attr('x', function(d) { return width-xScale(d.value1); })
			.attr('y', function(d) { return yScale(d.value2) + 12; })
			.attr('opacity', function(d, i) {
				return (i === trial.ind || i === trial.ind + 1) ? 1 : trial.opacity;
			});

	//Put an arrow on each segment
	var path = leftChart.foreground.select('path');
	path.datum(leftChart.points.slice(0, pointsToDraw)).attr('d', leftChart.lineDA);

	leftChart.arrows = [];

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

	var indices = [];

	var i = 0;

	while (indices.length < segments.length) {
		var x = (segments[i].x+segments[i].lastX)/2;
		var y = (segments[i].y+segments[i].lastY)/2;
		leftChart.arrows.push(segments[i]);
		segments[i].line = leftChart.foreground.append('polyline')
			.attr('points', segments[i].lastX+','+segments[i].lastY+
						' '+x+','+y+
						' '+segments[i].x+','+segments[i].y)
			// .attr('x1', segments[i].lastX)
			// .attr('y1', segments[i].lastY)
			// .attr('x2', x)
			// .attr('y2', y)
			.style('marker-mid', 'url(#arrow)')
			.attr('class','line')
			.attr('opacity', function() {
				return (i === trial.ind) ? 1 : trial.opacity;
			});
		indices.push(segments[i].index);
		i += 1;
	}

	leftChart.foreground.selectAll('path').remove();
}

var drawDALC = function(trial) {
	//Draw normally
	currentDataSet = trial.data;
	globalDALC = leftChart = makeDALC('#leftChart', true, trial.data);
	globalCS = rightChart = makeConnected('#rightChart', true, trial.data);
	afterUpdatePoints();

	//Change if you wanna mess with the axis min/max
	xScale.domain([0, 10]);
	yScale.domain([0, 10]);

	redraw(true);

	//Modify chart for this experiment
	// leftChart.foreground.selectAll('circle').remove();
	// leftChart.foreground.selectAll('text').remove();
	// leftChart.foreground.selectAll('line').remove();

	//Replace paths with polylines so I can selectively highlight	
	var line1 = leftChart.foreground.select('path.line1').datum(leftChart.points.slice(0, pointsToDraw)).attr('d', leftChart.lineDA1);
	var line2 = leftChart.foreground.select('path.line2').datum(leftChart.points.slice(0, pointsToDraw)).attr('d', leftChart.lineDA2);

	var iter = [line1, line2];

	for (var j = 0; j < iter.length; j++) {
		var path = iter[j];
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
		};

		var indices = [];

		var i = 0;

		while (indices.length < segments.length) {
			var x = (segments[i].x+segments[i].lastX)/2;
			var y = (segments[i].y+segments[i].lastY)/2;

			segments[i].line = leftChart.foreground.append('polyline')
				.attr('points', segments[i].lastX+','+segments[i].lastY+
							' '+x+','+y+
							' '+segments[i].x+','+segments[i].y)
				.attr('class','line ' + 'line' + (j+1))
				.attr('opacity', function() {
					return (i === trial.ind) ? 1 : trial.opacity;
				});
			indices.push(segments[i].index);
			i += 1;
		}
	};

	leftChart.foreground.selectAll('path').remove();

	//Replace circles
	leftChart.foreground.selectAll('circle').remove();

	leftChart.blueCircles = leftChart.foreground.selectAll('circle.line1')
		.data(leftChart.points.slice(0, pointsToDraw))
		.enter()
		.append('circle')
		.attr('r', 1)
		.attr('class', 'line1')
		.attr('cx', function(d) { return timeScale(d.date); })
		.attr('cy', function(d) { return xScale(d.value1); })
		.attr('opacity', function(d,i) {
			return (i === trial.ind || i === trial.ind + 1) ? 1 : trial.opacity;
		})
		.attr('fill', 'blue');

	leftChart.greenCircles = leftChart.foreground.selectAll('circle.line2')
		.data(leftChart.points.slice(0, pointsToDraw));

	leftChart.greenCircles.enter().append('circle')
		.attr('r', 1)
		.attr('class', 'line2')
		.attr('cx', function(d) { return timeScale(d.date); })
		.attr('cy', function(d) { return yScale(d.value2); })
		.attr('opacity', function(d,i) {
			return (i === trial.ind || i === trial.ind + 1) ? 1 : trial.opacity;
		})
		.attr('fill', 'green');
};

var runTrials = function(block){
	//Runs all trials in a block, recursively
	//Deferred function; resolves after entire recursion finishes
	var r = $.Deferred();

	var recur = function(block, trialNo){
		var endTrial = function(event){
			/**
			* Callback to move on to the next trial
			*/
			var k = event.keyCode;

			if (k === 83 || k === 68){
				$('.choice').css('color', 'black');
				$('.result').hide();
				$('#leftChart').empty();
				$(document).unbind('keyup', endTrial);

				if (trialNo === 0) {
					sendJSON(block);
					r.resolve();
				} else {
					recur(block, --trialNo);
				}
			}
		};

		var processResponse = function(event){
			/**
			* Callback processes keyboard input during trial
			* Evaluates answer and compares it with the response, computing the result
			* Sets the response and the result for the trial
			*/
			var timeStart = event.data.getTime();
			var k = event.keyCode;

			var data = trial.data;
			var x1 = data[trial.ind]['value1'];
			var x2 = data[trial.ind + 1]['value1'];
			var y1 = data[trial.ind]['value2'];
			var y2 = data[trial.ind + 1]['value2'];

			var answer = Math.sign((x2 - x1)/(y2 - y1)) === 1;

			if (k === 83 || k === 68) {
				var timeEnd = new Date().getTime();
				trial.responseTime = timeEnd - timeStart;

				trial.response = k;

				$(document).unbind('keyup', processResponse);

				if (k === 83 && answer){
					// Correct and same
					$('#same').css('color', 'blue');
					$('#continue').css('color', 'blue').show();
					$(document).keyup(endTrial);
					trial.correct = true;
				} else if (k === 68 && !answer){
					// Correct and different
					$('#different').css('color', 'blue');
					$('#continue').css('color', 'blue').show();
					$(document).keyup(endTrial);
					trial.correct = true;
				} else {
					// Wrong
					if (answer){
						//Same
						$('#same').css('color', 'blue');
						$('#different').css('color', 'red');
					}else{
						//Different
						$('#different').css('color', 'blue');
						$('#same').css('color', 'red');
					}
					$('#wrong').show();
					// Enable continue after timeout
					setTimeout(function(){
						$('#wrong').hide();
						$('#continue').css('color', 'red').show();
						$(document).keyup(endTrial);
					}, penalty);
					trial.correct = false;
				}
			}
		};

		// Take a trial
		var trial = block.trials[trialNo];

		// Show question
		$('#year1').text('198' + trial.ind);
		$('#year2').text('198' + (trial.ind + 1));
		$('#study').show();

		// Show chart after delay
		setTimeout(function(){
			var dateStart = new Date();

			$(document).keyup(dateStart, processResponse);

			//Draw chart
			if (block.chartType === 'c') {
				drawCS(trial);
			} else {
				drawDALC(trial);
			}
					
			setTimeout(function(){
			//If time limit reached
				if (!trial.response) {
					//And if no response yet
					$('#time-limit').text(timeLimit/1000);
					$('#timed-out').show();
					$('#continue').css('color', 'red').show();
					$(document).keyup(endTrial);
				}
			}, timeLimit);

		}, delay);
	};

	// Begin recursion
	recur(block, block.trials.length - 1);

	return r;
};

$(document).keyup(tutorialStep);
$('#tutorial-1').show();
exampleStep(tutorialNow);

});