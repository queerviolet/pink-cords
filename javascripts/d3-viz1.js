var data = [1,1,2,3,5,8,13,21,34,55,89,144];

var canvas = d3.select('body')
    .append('svg')
    .attr('width', 500)
    .attr('height', 500)
    .append('g');

var circles = canvas.selectAll('circle')
    .data(data)
    .enter()
        .append('circle')
        .attr('cx', function(d){return d * 20})
        .attr('cy', function(d){return d * 5})
        .attr('r', 5)
        .attr('y', function(d, i){return i * 70});

    // circles.transition()
    //     .duration(1500)
    //     .delay(500)
    //     .attr('cx', 400)
    //     .transition()
    //     .attr('cy', 200);