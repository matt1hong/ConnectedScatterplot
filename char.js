function generateData(n, dist, variance) {
	// correct if indivisible
	var numSteps = Math.floor(dist/n) + 1;
	dist = numSteps * n;
	var initPoints = [];
	var dataset = [];
	for (var i = 0; i <= dist; i++) {
		initPoints.push(Math.random());
	};
	for (var i=0; i<n; i++) {
		var seg = Math.floor(i/numSteps);
		if (i%numSteps === 0) { 
			dataset.push({
				date: new Date('1/1/' + (1980 + i)),
				value1: initPoints[seg],
				value2: initPoints[seg]
			}); 
			continue;
		}
		var step = (initPoints[seg + 1] - initPoints[seg]) * i / numSteps;
		var nextPt = step + (Math.random() - 0.5) / (0.5/variance);
		dataset.push({
			date: new Date('1/1/' + (1980 + i)),
			value1: nextPt,
			value2: nextPt
		});
	}
	return transform(dataset);
}

function transform(dataset) {
	var values1 = [], values2 = [], dates = [];
	for (var i = 0; i < dataset.length; i++) {
		values1.push(dataset[i].value1);
		values2.push(dataset[i].value2);
		dates.push(dataset[i].date);
	};
	for (var i = 0; i < values2.length; i++) {
		values2[i] += (Math.random()-0.5)/5
		var corr = Math.abs(ss.sampleCorrelation(values1, values2));
		if ( corr < 0.91 && corr > 0.89 ) { break; }
	};
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

arr = [
	[0.1, 0.2, 0.3, 0.4, 0.2, 0.3, 0.4, 0.5, 0.7, 0.6, 0.6, 0.5],
	[0.1, 0.2, 0.3, 0.4, 0.2, 0.3, 0.4, 0.5, 0.7, 0.6, 0.6, 0.5]
]