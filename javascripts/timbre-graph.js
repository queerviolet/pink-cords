"use strict";

var TimbreGraph = (function() {
  var Graph = Object.create(HTMLElement.prototype);

/**
# force.nodes([nodes])

If nodes is specified, sets the layout's associated nodes to the specified array. If nodes is not specified, returns the current array, which defaults to the empty array. Each node has the following attributes:

index - the zero-based index of the node within the nodes array.
x - the x-coordinate of the current node position.
y - the y-coordinate of the current node position.
px - the x-coordinate of the previous node position.
py - the y-coordinate of the previous node position.
fixed - a boolean indicating whether node position is locked.
weight - the node weight; the number of associated links.
These attributes do not need to be set before passing the nodes to the layout; if they are not set, suitable defaults will be initialized by the layout when start is called. However, be aware that if you are storing other data on your nodes, your data attributes should not conflict with the above properties used by the layout.

# force.links([links])

If links is specified, sets the layout's associated links to the specified array. If links is not specified, returns the current array, which defaults to the empty array. Each link has the following attributes:

source - the source node (an element in nodes).
target - the target node (an element in nodes).
Note: the values of the source and target attributes may be initially specified as indexes into the nodes array; these will be replaced by references after the call to start. Link objects may have additional fields that you specify; this data can be used to compute link strength and distance on a per-link basis using an accessor function.

*/

  Graph.attachedCallback = function() {
    var self = this;
    var svg = d3.select(this).append("svg")
      .attr("width", this.clientWidth)
      .attr("height", this.clientHeight)
      .on('dblclick', onDblClick);


    var force = d3.layout.force()
      .nodes([])
//      .links(links)
      .size([this.clientWidth, this.clientHeight])
//      .linkStrength(1.0)
      // .friction(0.9)
      .linkDistance(2)
      .charge(-120)
//      .gravity(0.2)
//      .theta(0.2)
//      .alpha(0.1);

    var nodes = force.nodes();
    var links = force.links();
    var link = svg.selectAll('.link');
    var node = svg.selectAll('.node');

    startForceLayout();

    function startForceLayout() {
      link = link.data(links);
      link
        .enter()
          .insert('line')
          .attr("class", "link")
          .style("stroke-width", function(d) { return Math.sqrt(d.value); });

      node = node.data(nodes);
      node
        .enter().append("circle")
          .attr("class", "node")
          .attr("r", 5)
          .call(force.drag);

      node.append("title")
        .text(function(d) { return d.name; });

      force.on("tick", tick);
      force.start();
    }

    function onDblClick() {
      var point = d3.mouse(this);
      var node = {
        x: point[0],
        y: point[1],
        sin: T('sin'),
      };
      node.sin.play();
      nodes.push(node);

      // add links to any nearby nodes
      var i = nodes.length; while (--i >= 0) {
        var target = nodes[i];
        var x = target.x - node.x,
            y = target.y - node.y;
        if (x * x + y * y < 900) {
          links.push({source: node, target: target});
        }
      }

      startForceLayout();
    }

    var MIN_FREQ = 100;
    var MAX_FREQ = 1000;
    var freqRange = (MIN_FREQ).to(MAX_FREQ);

    function tick() {
      link
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

      node
        .attr("cx", function(d) {
          d.sin.set({freq: freqRange.at(d.x / self.clientWidth)});
          return d.x;
        })
        .attr("cy", function(d) { return d.y; });
    }
  }

  return document.registerElement('timbre-graph', {prototype: Graph});
})();