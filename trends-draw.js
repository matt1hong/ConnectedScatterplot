// http://bl.ocks.org/larskotthoff/11406992
var arrangeLabels = function() {
  var move = 1;
  var padding = 11;
  while(move > 0) {
    move = 0;
    leftChart.foreground.selectAll(".date")
       .each(function() {
         var that = this,
             a0 = this.getBoundingClientRect();
             var a = {
             	'left':a0.left - padding, 
             	'top':a0.top - padding, 
             	'right':a0.right + padding,
             	'bottom':a0.bottom + padding,
             	'width':a0.width + padding*2, 
             	'height':a0.height + padding * 2
             };
         leftChart.foreground.selectAll(".date")
            .each(function() {
              if(this != that) {
                var b0 = this.getBoundingClientRect();
                var b = {
	             	'left':b0.left - padding, 
	             	'top':b0.top - padding, 
	             	'right':b0.right + padding,
	             	'bottom':b0.bottom + padding,
	             	'width':b0.width + padding*2, 
	             	'height':b0.height + padding * 2
	             };
                if((Math.abs(a.left - b.left) * 2 < (a.width + b.width)) &&
                   (Math.abs(a.top - b.top) * 2 < (a.height + b.height))) {
                  // overlap, move labels
                  var dx = (Math.max(0, a.right - b.left) +
                           Math.min(0, a.left - b.right)) * 0.07,
                      dy = (Math.max(0, a.bottom - b.top) +
                           Math.min(0, a.top - b.bottom)) * 0.05,
                      tt = d3.transform(d3.select(this).attr("transform")),
                      to = d3.transform(d3.select(that).attr("transform"));
                  move += Math.abs(dx) + Math.abs(dy);
                
                  tt.translate = [ tt.translate[0] - dx-2, tt.translate[1] - dy-1.5];
                  to.translate = [ to.translate[0] + dx-2, to.translate[1] + dy-1.5];
                  d3.select(this).attr("transform", "translate(" + tt.translate + ")");
                  d3.select(that).attr("transform", "translate(" + to.translate + ")");
                  a0 = this.getBoundingClientRect();
                  a = {
	             	'left':a0.left - padding, 
	             	'top':a0.top - padding, 
	             	'right':a0.right +padding,
	             	'bottom':a0.bottom +padding,
	             	'width':a0.width +padding * 2, 
	             	'height':a0.height + padding * 2
	             };
                }
              }
            });
       });
  }
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

		if (trial.opacity !== 0) {
			//Put a label on each point
			var text = leftChart.foreground.selectAll('text')
				.data(leftChart.points.slice(0, pointsToDraw));

			//Randomly put labels in one of the corners
			var moveX = Math.random() < 0.5 ? 0 : -23;
			var moveY = Math.random() < 0.5 ? -5 : 12;

			text.enter()
				.append('text')
					.attr('class', 'date')
					.text(function(d) { return d.date.getFullYear(); })
					.attr('x', function(d) { return width-xScale(d.value1) + moveX; })
					.attr('y', function(d) { return yScale(d.value2) + moveY; })
					.attr('opacity', function(d, i) {
						return (i === trial.ind || i === trial.ind + 1) ? 1 : trial.opacity;
					});
		}

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

		var dx = segments[i].x - segments[i].lastX;
		var dy = segments[i].y - segments[i].lastY;
		var len = Math.sqrt(Math.pow(dx,2) + Math.pow(dy,2));
		
		// Moves the arrow a bit forward so it's in the middle
		x += 4*dx/len;
		y += 4*dy/len;

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

	// arrangeLabels();
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