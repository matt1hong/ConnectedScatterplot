
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