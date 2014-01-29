
var datasets;

function loadDataSets(studyOnly, callback) {

	d3.json('datasets.json', function (datasetinfo) {

		datasets = datasetinfo;

		datasets.forEach(function(dataset) {
			d3.json('datasets/'+dataset.name+'.json', function (data) {
				dataset.data = data;
			});
		});

		if (studyOnly) {
			datasets = datasets.filter(function (d) { return d.study; });
		}

		if (callback) {
			callback();
		}
	});
}