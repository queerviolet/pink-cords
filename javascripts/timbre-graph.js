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

  function Cord(source, target) {
    this.source = source;
    this.target = target;
    this.audioNode = T('pluck');
    this.audioNode.play();
  }

  Cord.FREQ_RANGE = (500).to(50);

  Cord.prototype.pluck = function() {
    var string = [this.target.x, this.target.y].sub([this.source.x, this.source.y]);
    var freq = Cord.FREQ_RANGE.at(string.mag / 1000);
    this.audioNode.set({freq: freq});
    this.audioNode.bang();
  }

  // I'm sorry ~ ashi.
  Cord.prototype.otherEndFrom = function(sourceOrTarget) {
    return sourceOrTarget == this.source? this.target : this.source;
  }

  function OscNode(x, y, widget) {
    this.x = x;
    this.y = y;
    this.id = OscNode.nextId++;
    this.widget = widget;
    this.plucked = null;


    // TODO: Having both edges and cords is pretty weird and gross.
    this.edges = [];
    this.cords = [];
  }

  OscNode.FREQ_RANGE = (10).to(1000);
  OscNode.nextId = 0;

  OscNode.prototype.attach = function(target, cord) {
    if (this.edges.indexOf(target) === -1) {
      this.edges.push(target);
    }
    this.cords.push(cord);
  }

  // Return a sin generator which is the root of a tree of voltage controlled
  // oscillators reachable from this node.
  OscNode.prototype.sin = function(visited) {
    visited = visited || {};
    visited[this.id] = true;

    var children = [];
    var i = this.edges.length; while(--i >= 0) {
      if (!visited[this.edges[i].id]) {
        children.push(this.edges[i].sin(visited));
      }
    }
    console.log(children);

    if (children.length === 0) {
      this.osc = T('sin', {freq: OscNode.FREQ_RANGE.at(this.x / this.widget.clientWidth)});
      this.osc.str = '(sin freq:' + OscNode.FREQ_RANGE.at(this.x / this.widget.clientWidth) + ')';
      return this.osc;
    }

    this.osc = T('sin', {freq: T.apply(undefined, ['+'].concat(children))});
    this.osc.str = '(sin freq:(+ ' + children.map(function(child) {
      console.log('child:', child);
      return child.str;
    }).join(' ') + '))';
    return this.osc;
  };

  var cues = [];

  setInterval(function() {
    if (cues.length > 0)
      console.log(cues);
    var next = cues.shift();
    if (next) {
      if (Array.isArray(next)) {
        var i = next.length; while(--i >= 0) {
          next[i].pluck();
        }
      } else {
        next.pluck();
      }
    }
  }, 250);

  OscNode.prototype.strumBfs = function(duration) {
    var visited = {};
    var queue = [this];
    while (queue.length > 0) {
      var next = queue.shift();
      var strum = [];
      var i = next.cords.length; while(--i >= 0) {
        var cord = next.cords[i];
        var other = cord.otherEndFrom(next);
        if (!visited[other.id]) {
          strum.push(cord);
          queue.push(other);
          visited[other.id] = true;
        }
      }
      if (strum.length > 0) {
        cues.push(strum);
      }
    }
  };


  Graph.attachedCallback = function() {
    var self = this;
    var svg = d3.select(this).append("svg")
      .attr("width", this.clientWidth)
      .attr("height", this.clientHeight)
      .on('click', onDblClick);

    var rgb_width = self.clientWidth/255;
    var rgb_height = self.clientHeight/255;


    var force = d3.layout.force()
      .nodes([])
//      .links(links)
      .size([this.clientWidth, this.clientHeight])
      .linkStrength(0)
      // .friction(0.9)
      .linkDistance(10)
      .gravity(0)
      .charge(0); //-10);
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
      console.log(link);
      link
        .enter()
          .insert('line')
          .attr("class", "link")
          .on('mouseenter', onLinkMouseMove)
          .style('stroke', function(d){
              return "rgb("
                + parseInt(d.source.x/rgb_width, 10)
                +","
                + parseInt(d.source.y/rgb_height, 10)
                +","
                + parseInt(d.source.x/rgb_width, 10)
                +")"
          })
          .style("stroke-width", function(d) {
            return Math.sqrt(d.value);
            });

      node = node.data(nodes);
      node
        .enter().append("circle")
          .attr("class", "node")
          .attr("r", 5)
          .on('click', onNodeClick)
          // .style('fill', 'red')
          .call(force.drag);

      node.append("title")
        .text(function(d) { return d.name; });

      force.on("tick", tick);
      force.start();
    }

    function onLinkMouseMove() {
      var cord = d3.select(this).data()[0];
      cord.pluck();
    }

    function onNodeClick() {
      console.log('clicked');
      d3.event.stopPropagation();
      var node = d3.select(this).data()[0];
      node.strumBfs();
    }

    function onDblClick() {
      var point = d3.mouse(this);
      var node = new OscNode(point[0], point[1], self);
      nodes.push(node);

      // add links to any nearby nodes
      var i = nodes.length; while (--i >= 0) {
        var target = nodes[i];
        var x = target.x - node.x,
            y = target.y - node.y;
        if (x * x + y * y < 1600 && target !== node) {
          var cord = new Cord(node, target);
          links.push(cord);
          node.attach(target, cord);
          target.attach(node, cord);
        }
      }

      startForceLayout();
    }


    function tick() {
      link
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

      node
        .style("fill", function(d) {
         return d.color
        })
        .attr("cx", function(d) {

          //d.sin.set({freq: freqRange.at(d.x / self.clientWidth)});
          return d.x;
        })
        .attr("cy", function(d) { return d.y; });
    }
  }

  return document.registerElement('timbre-graph', {prototype: Graph});
})();