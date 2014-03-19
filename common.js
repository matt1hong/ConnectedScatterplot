
var datasets;

function jsonGet(dataset, filename, callback) {
	d3.json(filename, function (data) {
				dataset.data = data;
				callback();
			});
}

function loadDataSets(studyOnly, callback, subdirectory) {

	if (subdirectory === undefined)
		subdirectory = 'datasets/';
	else
		subdirectory = 'datasets/'+subdirectory+'/';

	d3.json(subdirectory+'datasets.json', function (datasetinfo) {

		datasets = datasetinfo;

		if (studyOnly) {
			datasets = datasets.filter(function (d) { return d.study; });
		}

		var q = queue();

		datasets.forEach(function(dataset) {
			q.defer(jsonGet, dataset, subdirectory+dataset.name+'.json');
		});

		q.awaitAll(function() {
			if (callback) {
				callback();
			}
		});

	});
}

function rotateArray(points, amount) {
	for (var i = points.length - 1; i >= 0; i--) {
		var nextIndex = (i - amount) % points.length;
		if (nextIndex < 0)
			nextIndex += points.length;
		points[i].value3 = points[nextIndex].value2;
	}
	
	for (var i = points.length - 1; i >= 0; i--) {
		points[i].value2 = points[i].value3;
	};
}

function submitResponse(studyID, resultID, data) {
	d3.xhr('http://draw.eagereyes.org/submit.php')
		.header('content-type', 'application/x-www-form-urlencoded')
		.post('study='+encodeURIComponent(studyID)+'&'+
			'resultID='+encodeURIComponent(resultID)+'&'+
			'data='+encodeURIComponent(JSON.stringify(data)))
		.on('error', function(error) {
			console.log('ERROR: '+error);
		});
}

function makeResultID() {
	var d = ''+(new Date()).getTime();
	var s = '000000' + Math.floor(Math.random()*1000000);
	return d + '_' + s.substr(s.length-6);
}
