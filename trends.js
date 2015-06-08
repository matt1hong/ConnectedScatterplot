$(function(){

var debug = window.location.href.indexOf('debug') >= 0;

var delay = (debug ? 0 : 2000);
var penalty = (debug ? 0 : 5000);
var timeLimit = (debug ? 1000000 : 10000);
var numTrials = 5;

// Order of chart types to be given
var chartTypeSeq = d3.shuffle(['c', 'd']);

switch (qs['type']) {
	case 'dalc':
		chartTypeSeq = ['d','d'];
		break;
	case 'cs':
		chartTypeSeq = ['c','c'];
		break;
}

// Order of blocks to be given
var blockSeq = d3.shuffle(['p', 'h', 'i']);

switch (qs['block']) {
	case 'pure':
		blockSeq = ['p','p','p'];
		break;
	case 'highlighted':
		blockSeq = ['h','h','h'];
		break;
	case 'isolated':
		blockSeq = ['i','i','i'];
		break;
}

ARROW_FRACTION = 0.5;
GENERATEDATASETS = false;

interactDALC = false;
showArrows = false;
smoothLines = false;
showLabels = true;
study = true;
disconnected = true;
commonScales = true;
cheatMode = false;

var trendsDatasets = [];

loadDataSets(true, function(){
	dataAngles = makeTrendsDataAngles();
	dataSlopes = makeTrendsDataSlopes();

	trendsDatasets = dataAngles.concat(dataSlopes);

	if (qs['greenslope'] || qs['blueslope'] || qs['distance']) {
		trendsDatasets = dataSlopes;
	} else if (qs['angle'] || qs['length']) {
		trendsDatasets = dataAngles;
	}
	// switch (qs['data']) {
	// 	case 'angles':
	// 		trendsDatasets = dataAngles;
	// 		break;
	// 	case 'slopes':
	// 		trendsDatasets = dataSlopes;
	// 		break;
	// }
	// trendsDatasets = makeHyperbolaDatasets();
}, 'translate'); //Borrowing some factors from the translate study

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
	if (blockClass === 'p') {
		this.opacity = 1;
	} else if (blockClass === 'h') {
		//Opacity varies between 0.2 and 0.7
		this.opacity = (Math.random() * 5 + 2) / 10;
	} else if (blockClass === 'i') {
		this.opacity = 0;
	}

	// Results
	this.response = null;
	this.responseTime = 0;
	this.correct = null;
};

var runBlock = function(chartType, blockNo){
	/**
	* Run blocks
	* blockSeq contains the order of blocks 
	*/
	var r = $.Deferred();

	var block = new Block(chartType, blockNo, '000');

	for (var j = 0; j<numTrials; j++) {
		var trial = new Trial(block.blockClass, block.datasets[j]);
		block.trials.push(trial);
	};

	runTrials(block).then(function(){ r.resolve(); });

	return r;
};

var runExperiment = function(){
	//Runs the three blocks in the order given by the global var blockSeq
	runBlock(chartTypeSeq[0], blockSeq[0])
		.then(function(){ runBlock(chartTypeSeq[0], blockSeq[1])
			.then(function(){ runBlock(chartTypeSeq[0], blockSeq[2]) 
				.then(function(){ runBlock(chartTypeSeq[1], blockSeq[0])
					.then(function(){ runBlock(chartTypeSeq[1], blockSeq[1]) 
						.then(function(){ runBlock(chartTypeSeq[1], blockSeq[2]) 
							.then(function(){
								$('#study').hide();
								$('#leftChart').hide();
								$('#done').show();
							});
						});
					});
				});
			});
		});
};

var tutorialNow = 1;
var tutorialStep = function(event){
	var k = event.keyCode;

	if (k === 83 || k === 68) {
		if (tutorialNow < 6) {
			$('#tutorial-' + tutorialNow).hide();
			$('#tutorial-' + (tutorialNow + 1)).show();
		} 
		else {
			$('#tutorial-' + tutorialNow).hide();
			$(document).off();
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

    // get correctess and time
    _block.avgRT = _block.trials.reduce(function (accumulator, trial) { return accumulator + trial.responseTime; }, 0) / _block.trials.length;
    _block.avgCorrect = _block.trials.reduce(function (accumulator, trial) { return accumulator + trial.correct; }, 0) / _block.trials.length;

    // send
    delete _block.datasets;

    d3.xhr('submit-trends.php', 'application/x-www-form-urlencoded', callback)
        .header('content-type', 'application/x-www-form-urlencoded')
        .post('study=' + encodeURIComponent(_block.blockClass) + '&' +
        	'chart=' + encodeURIComponent(_block.chartType) + '&' +
            'subjectID=' + encodeURIComponent(_block.subjectID + '-' + _block.avgRT.toFixed(2) + '-' + _block.avgCorrect.toFixed(2)) + '&' +
            'data=' + encodeURIComponent(JSON.stringify(_block, null, " ")))
        .on('error', function (error) {
            console.log('ERROR: ' + error);
            if (typeof callback != "undefined")
                callback();
        });
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
				$(document).off();
				$('.choice').css('color', 'black');
				$('.result').hide();
				$('#leftChart').empty();

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

				$(document).off();

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

		var draw = function(){
			var dateStart = new Date();

			$(document).off();
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

					$(document).off();
					$(document).keyup(endTrial);
				}
			}, timeLimit);
		};

		// Take a trial
		var trial = block.trials[trialNo];

		// Show question
		$('#year1').text('198' + trial.ind);
		$('#year2').text('198' + (trial.ind + 1));
		$('#study').show();

		// Draw chart on click
		$(document).keyup(function(event){
			var k = event.keyCode;
			if (k === 83 || k === 68) {
				draw();
			}
		});
	};

	// Begin recursion
	recur(block, block.trials.length - 1);

	return r;
};

$(document).keyup(tutorialStep);
$('#tutorial-1').show();

});