$(function(){

var debug = true;

// Order of blocks to be given
var blockSeq = [2,3,1];

loadDataSets(true, null, 'translate');

CHARTTYPE = 'd'

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

var delay = (debug ? 0 : 3000);
var penalty = (debug ? 0 : 5000);
var timeLimit = (debug ? 1000000 : 6000);
var numTrials = (debug ? 3 : 10);

// Block 1: Chart
// Block 2: Chart with highlighting
// Block 3: Chart with filtering
// Block 4: Single segment
var Block = function(index, chartType,blockClass, subjectID){
	this.index = -1;
	this.chartType = chartType;
	this.blockClass = blockClass;
	this.subjectID = subjectID;
	this.trials = [];
	if (blockClass === 2) {
		this.opacity = 0.3;
	} else if (blockClass === 3) {
		this.opacity = 0;
	}
	this.datasets = (blockClass === 4 ? d3.shuffle(singleDatasets) : d3.shuffle(datasets))
	this.date = "";
};

var Trial = function(index, block){
	this.index = -1;

	// Attach data
	var dataset = block.datasets[index];
	this.data = dataset.data;
	this.label1 = dataset.label1;
	this.label2 = dataset.label2;
	this.randIndex = Math.floor(Math.random() * (dataset.data.length - 1));

	// Data points in question
	var startYear = new Date(dataset.data[this.randIndex].date);
	var endYear = new Date(dataset.data[this.randIndex + 1].date);
	this.startYear = startYear.getFullYear();
	this.endYear = endYear.getFullYear();

	// Opacity of the features not in question
	this.opacity = block.opacity;

	// Results
	this.response = null;
	this.responseTime = 0;
	this.result = null;
};

var runBlock = function(i, blockNo){
	/**
	* Run blocks
	* blockSeq contains the order of blocks 
	*/
	var r = $.Deferred();

	var block = new Block(i, CHARTTYPE, blockNo, '000');

	for (var j = 0; j<numTrials; j++) {
		var trial = new Trial(j, block);
		block.trials.push(trial);
	};

	runTrials(block).then(function(){ r.resolve(); });

	return r;
};

var runExperiment = function(){
	//Runs the three blocks in the order given by the global var blockSeq
	runBlock(0, blockSeq[0])
		.then(function(){ runBlock(1, blockSeq[1])
			.then(function(){ runBlock(2, blockSeq[2]) 
				.then(function(){
					$('#study').hide();
					$('#leftChart').hide();
					$('#done').show();
				});
			});
		});
};

//Stepping through the tutorial
var exampleStep = function(index) {
	var previous = null;
	$('.eg' + index).each(function (i, e){
		if (previous){
			$(previous).hide();
		}
		setTimeout(function (){
			$(e).show();
		}, i*500);
		previous = this;
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
		if (tutorialNow != 4){
			exampleStep(tutorialNow+1);
		}
		else {
			$('.example').hide();
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

	//Modify chart for this experiment
	leftChart.foreground.select('path').remove();
	leftChart.foreground.selectAll('circle').remove();
	leftChart.foreground.selectAll('text').remove();
	leftChart.foreground.selectAll('line').remove();

	//Draw path, graying out liness other than one in question
	var points = trial.data.slice(trial.randIndex, trial.randIndex + 2);
	
	for (var i = 0; i < leftChart.points.length - 1; i++) {
		leftChart.foreground.append('path')
			.datum(leftChart.points.slice(i, i+2))
			.attr('d', leftChart.lineDA)
			.attr('class', 'line')
			.attr('opacity', function() {
				return i === trial.randIndex ? 1 : trial.opacity;
			});
	};

	//Draw circles, graying out points other than ones in question
	var circle = leftChart.foreground.selectAll('circle')
		.data(leftChart.points.slice(0, pointsToDraw))
			.enter()
		.append('circle')
		.attr('r', 2)
		.attr('cx', function(d) { return width-xScale(d.value1); })
		.attr('cy', function(d) { return yScale(d.value2); })
		.attr('opacity', function(d, i) {
			return (i === trial.randIndex || i === trial.randIndex + 1) ? 1 : trial.opacity;
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
				return (i === trial.randIndex || i === trial.randIndex + 1) ? 1 : trial.opacity;
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
				return (i === trial.randIndex) ? 1 : trial.opacity;
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
					return (i === trial.randIndex) ? 1 : trial.opacity;
				});
			indices.push(segments[i].index);
			i += 1;
		}
	};

	leftChart.foreground.selectAll('path').remove();

	//Replace circles
	leftChart.foreground.selectAll('circle').remove();

	console.log(leftChart.points)

	leftChart.blueCircles = leftChart.foreground.selectAll('circle.line1')
		.data(leftChart.points.slice(0, pointsToDraw))
		.enter()
		.append('circle')
		.attr('r', 2)
		.attr('class', 'line1')
		.attr('cx', function(d) { return timeScale(d.date); })
		.attr('cy', function(d) { return xScale(d.value1); })
		.attr('opacity', function(d,i) {
			return (i === trial.randIndex || i === trial.randIndex + 1) ? 1 : trial.opacity;
		})
		.attr('fill', 'blue');

	leftChart.greenCircles = leftChart.foreground.selectAll('circle.line2')
		.data(leftChart.points.slice(0, pointsToDraw));

	leftChart.greenCircles.enter().append('circle')
		.attr('r', 2)
		.attr('class', 'line2')
		.attr('cx', function(d) { return timeScale(d.date); })
		.attr('cy', function(d) { return yScale(d.value2); })
		.attr('opacity', function(d,i) {
			return (i === trial.randIndex || i === trial.randIndex + 1) ? 1 : trial.opacity;
		})
		.attr('fill', 'green');
};

var runTrials = function(block){
	//Runs all trials in a block, recursively
	//Deferred function; resolves after entire recursion finishes
	var r = $.Deferred();

	var recur = function(block){
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

				if (block.trials.length === 0) {
					sendJSON(block);
					r.resolve();
				} else {
					recur(block);
				}
			}
		};

		var processResponse = function(event){
			/**
			* Callback processes keyboard input during trial
			* Evaluates answer and compares it with the response, computing the result
			* Sets the response and the result for the trial
			*/
			var k = event.keyCode;

			var data = trial.data;
			var x1 = data[trial.randIndex]['value1'];
			var x2 = data[trial.randIndex + 1]['value1'];
			var y1 = data[trial.randIndex]['value2'];
			var y2 = data[trial.randIndex + 1]['value2'];

			var answer = Math.sign((x2 - x1)/(y2 - y1)) === 1;

			if (k === 83 || k === 68) {
				trial.response = k;

				$(document).unbind('keyup', processResponse);

				if (k === 83 && answer){
					// Correct and same
					$('#same').css('color', 'blue');
					$('#continue').css('color', 'blue').show();
					$(document).keyup(endTrial);
					trial.result = true;
				} else if (k === 68 && !answer){
					// Correct and different
					$('#different').css('color', 'blue');
					$('#continue').css('color', 'blue').show();
					$(document).keyup(endTrial);
					trial.result = true;
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
					trial.result = false;
				}
			}
		};

		// Take a trial
		var trial = block.trials.pop();

		// Show question
		$('#year1').text(trial.startYear);
		$('#year2').text(trial.endYear);
		$('#study').show();

		// Show chart after delay
		setTimeout(function(){
			$(document).keyup(processResponse);

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

	// Run next trial
	recur(block);

	return r;
};

$(document).keyup(tutorialStep);
$('#tutorial-1').show();
exampleStep(tutorialNow);

});