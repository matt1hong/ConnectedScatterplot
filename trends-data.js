// http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
var qs = (function(a) {
    if (a == "") return {};
    var b = {};
    for (var i = 0; i < a.length; ++i)
    {
        var p=a[i].split('=', 2);
        if (p.length == 1)
            b[p[0]] = "";
        else
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
    }
    return b;
})(window.location.search.substr(1).split('&'));

var deg2rad = function(angle){
	return (angle / 180) * Math.PI;
};

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
			dataset.params.dist = line.dist;
		}

		dataset.dataClass = line.dataClass;

		newDatasets.push(dataset);
	}

	return newDatasets;
}

var makeTrendsDataAngles = function() {
	//Generates data to be used for the trends study with the varying angles method
	var angleIncr = 45;

	var lines = [];
	for (var len = 1; len <= 3; len+=2) {
		for (var angle = 0; angle < 360; angle += angleIncr) {

			var newLine = {};
			newLine.angle = angle;
			newLine.len = len;

			if (qs['angle']) {
				newLine.angle = +qs['angle'];
			}
			if (qs['length']) {
				newLine.len = +qs['length'];
			}

			// Lengths vary
			var e = (len === 1 ? Math.random() - 0.5 : Math.random() * 2 - 1);
			actualLen = newLine.len + e;
			newLine.actualLen = actualLen;

			//Angles vary between angle +- 5
			actualAngle = newLine.angle + Math.random() * 10 - 5;
			newLine.actualAngle = actualAngle;

			//Pick a random point by generating two random values
			var t1 = {};
			t1.value1 = Math.random() * 10;
			t1.value2 = Math.random() * 10;

			//Get the point at length len and angle away from that point
			var t2 = {};
			t2.value1 = t1.value1 + newLine.actualLen * Math.cos(deg2rad(newLine.actualAngle));
			t2.value2 = t1.value2 + newLine.actualLen * Math.sin(deg2rad(newLine.actualAngle));

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
	};

	return embedInDatasets(lines);
};

var makeTrendsDataSlopes = function(){ 
	// Generates data to be used for the trends study according to the varying slopes method
	var numSamples = 1;

	//Limits on slope and distance leaves room for some variance
	var slopeLim = 2;
	var distLim = 3;
	// var distLim = 9 - slopeLim;

	var dualLines = [];
	for (var i = -slopeLim; i <= slopeLim; i++) {
		for (var j = -slopeLim; j <= slopeLim; j++) {
			for (var d = 0; d <= distLim; d++) {
				for (var s = 0; s < numSamples; s++) {

					var newLine = {};
					newLine.dist = d;
					newLine.slope1 = i;
					newLine.slope2 = j;

					if (qs['blueslope']) {
						newLine.slope1 = +qs['blueslope'];
					} 
					if (qs['greenslope']) {
						newLine.slope2 = +qs['greenslope'];
					}
					if (qs['distance']) {
						newLine.dist = +qs['distance'];
					}

					// //Slopes vary between slope +- 0.1
					// var randomSlope1 = newLine.slope1 + Math.random() / 5 - 0.1;
					// var randomSlope2 = newLine.slope2 + Math.random() / 5 - 0.1;

					// Slopes vary between slope +- 0.5
					var randomSlope1 = newLine.slope1 + Math.random() - 0.5;
					var randomSlope2 = newLine.slope2 + Math.random() - 0.5;

					newLine.actualSlope1 = randomSlope1;
					newLine.actualSlope2 = randomSlope2;

					// Distances vary between dist +- 0.5
					var randomDist = newLine.dist + Math.random() - 0.5;

					newLine.actualDist = randomDist;

					var t1 = {};
					var t2 = {};
					t1.value1 = Math.random() * 10;
					t2.value1 = t1.value1 + randomSlope1;

					var plusOrMinus = Math.random() < 0.5 ? -1 : 1;
					//Controlling distances between midpoints
					var mid = (t1.value1 + t2.value1) / 2;

					t1.value2 = mid - plusOrMinus * newLine.actualDist - randomSlope2 / 2;
					t2.value2 = mid - plusOrMinus * newLine.actualDist + randomSlope2 / 2;

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

var intersectionOfLines = function(x1,y1,x2,y2,x3,y3,x4,y4) {
	det1num = (x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4);
	det2num = (x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4);
	den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

	return {'x': det1num / den, 'y': det2num / den};
}

var makeHyperbolaDatasets = function() {
	var datasets = [];
	var lim = 6;

	for (var i = 1; i <= lim / 2; i = i + 0.5) {
		var dataset = {};
		var data = [];
		var params = {};
		params.foci = i;

		var d = (lim / 2 - i);
		var x1 = i, y1 = i, x3 = -i, y3 = -i;

		for (var j = 0; j < 7; j++) {
			var x2 = -j * d / 6; 
			var y2 = lim - j * d / 6;
			var x4 = j * lim / 12;
			var y4 = lim - j * lim / 12;

			var point = intersectionOfLines(x1,y1,x2,y2,x3,y3,x4,y4);

			console.log(x2, y2)

			data.push({
				date: new Date('1/1/' + (1980 + j)),
				value1: point.x,
				value2: point.y
			});
		};

		for (var j = 1; j < 7; j++) {
			var x2 = (lim - d) + j * d / 6;
			var y2 = -d + j * d / 6;
			var x4 = (j + 6) * lim / 12;
			var y4 = lim - (j + 6) * lim / 12;

			var point = intersectionOfLines(x1,y1,x2,y2,x3,y3,x4,y4);

			console.log(x2, y2)

			data.push({
				date: new Date('1/1/' + (1980 + j + 6)),
				value1: point.x,
				value2: point.y
			});
		};

		dataset.data = data;
		dataset.dataClass = 'hyperbola';
		dataset.ind = 0;
		dataset.params = params;
		dataset.label1 = 'V';
		dataset.label2 = 'U';

		datasets.push(dataset);
 	};
 	return datasets;
};