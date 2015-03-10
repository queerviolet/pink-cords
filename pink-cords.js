"use strict";

var PinkCords = (function() {
  function Cord(source, target) {
    this.source = source;
    this.target = target;
    source.attach(this);
    target.attach(this);
    this.audioNode = T('pluck');
    this.audioNode.play();
    this.id = Cord.nextId++;
    Cord.all[this.id] = this;
    this.lastPluck = Number.MIN_SAFE_INTEGER;
    this.sampleAry = null;
  }

  Cord.nextId = 0;
  Cord.all = [];
  Cord.FREQ_RANGE = (500).to(50);

  Cord.prototype.pluck = function() {
    var now = window.performance.now();
    if (this.lastPluck > now - 500) return;
    this.lastPluck = now;
    var string = this.target.pos.sub(this.source.pos);
    var freq = Cord.FREQ_RANGE.at(string.mag / 1000);
    this.audioNode.set({freq: freq});
    this.audioNode.bang();
    var buf = this.audioNode._.buffer;
    this.sampleAry = new Float32Array(buf);
  }

  // This is ugly. I'm sorry ~ ashi.
  Cord.prototype.otherEndFrom = function(sourceOrTarget) {
    return sourceOrTarget == this.source? this.target : this.source;
  }

  Cord.prototype.replaceAnchor = function(replaceThisAnchor, withThisOne) {
    if (this.source === replaceThisAnchor) {
      this.source = withThisOne;
    } else if (this.target === replaceThisAnchor) {
      this.target = withThisOne;
    }
  };

  Cord.range0x00To0xFF = (0xFF).to(0x00).across(-1, 1);
  Cord.pluckDuration = 100;
  Cord.resonantDuration = 10000;
  Cord.totalDuration = Cord.pluckDuration + Cord.resonantDuration;

  var range = vec2.create();
  var norm = vec2.create();
  var pt = vec2.create();
  var rot90 = mat2d.create(); mat2d.rotate(rot90, rot90, Math.PI / 2.0);
  Cord.prototype.draw = function(ctx, ts) {
    ctx.lineWidth = 2;
    var from = this.target.pos;
    var to = this.source.pos;
    vec2.sub(range, this.target.pos, this.source.pos);
    var mag = vec2.len(range);
    vec2.scale(norm, range, 1.0 / mag)
    vec2.transformMat2d(norm, norm, rot90);
    if (this.sampleAry) {
      var buf = this.sampleAry;
      buf.set(this.audioNode._.buffer);
      var len = buf.length;
      vec2.lerp(pt, from, to, 1.0);
      ctx.strokeStyle = 'fuchsia';
      ctx.beginPath();      
      ctx.moveTo(pt[0], pt[1]);
      var i = len; while (--i >= 0) {
        var sample = buf[i];
        //ctx.strokeStyle = 'fuchsia'; //ci24ToStr(0xff0000 | (Cord.range0x00To0xFF.at(sample) << 8) | 0xff);
        vec2.lerp(pt, from, to, i / len);
        vec2.scaleAndAdd(pt, pt, norm, sample * 10.0);
        ctx.lineTo(pt[0], pt[1]);
      }
      ctx.stroke();      
    } else {
      ctx.strokeStyle = '#999';
      ctx.beginPath(); 
      ctx.moveTo(this.source.pos.x, this.source.pos.y);
      ctx.lineTo(this.target.pos.x, this.target.pos.y);
      ctx.stroke();
    }
  };

  Cord.prototype.drawSelMask = function(gun, ts) {
    var ctx = gun.ctx;
    ctx.lineWidth = 4;    
    ctx.strokeStyle = gun.getColor(this).str;
    ctx.beginPath(); 
    ctx.moveTo(this.source.pos.x, this.source.pos.y);
    ctx.lineTo(this.target.pos.x, this.target.pos.y);
    ctx.stroke();    
  };

  Cord.prototype.toString = function() { return 'Cord_' + this.id; }

  Cord.prototype.destroy = function() {
    this.audioNode.pause();
  };

  function Anchor(pos) {
    this.pos = pos;
    this.cords = [];
    this.id = Anchor.nextId++;
  }

  Anchor.nextId = 0;

  Anchor.prototype.attach = function(cord) {
    this.cords.push(cord);
  };

  Anchor.prototype.draw = function(ctx, ts) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = '#ff00ff';
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, 5, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.stroke();
  };

  Anchor.prototype.drawSelMask = function(gun, ts) {
    var ctx = gun.ctx;    
    ctx.lineWidth = 1;
    var color = gun.getColor(this);
    ctx.strokeStyle = color.str;
    ctx.fillStyle = color.str;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, 5, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.stroke();
  };

  // Utterly consume another anchor.
  // Destroys any cords which were strung between this anchor and
  // the other one.
  // Returns an array of cords which were destroyed.
  Anchor.prototype.consume = function(otherAnchor) {
    var cords = [];
    var deadCords = [];
    var i = otherAnchor.cords.length; while (--i >= 0) {
      var cord = otherAnchor.cords[i];
      if (cord.otherEndFrom(otherAnchor) === this) {
        cord.destroy();
        deadCords.push(cord);
      } else {
        cords.push(cord);
        cord.replaceAnchor(otherAnchor, this);
      }
    }
    this.cords = this.cords.concat(cords)
    return deadCords;
  };

  Anchor.prototype.toString = function() { return 'Anchor_' + this.id; };

  Anchor.prototype.strumBfs = function(duration) {
    var visited = {};
    var strummed = {};
    var queue = [this];
    while (queue.length > 0) {
      var next = queue.shift();
      var strum = [];      
      var i = next.cords.length; while(--i >= 0) {
        var cord = next.cords[i];
        var other = cord.otherEndFrom(next);
        if (!strummed[cord.id]) {
          strum.push(cord);
          strummed[cord.id] = true;
        }
        if (!visited[other.id]) {
          queue.push(other);
          visited[other.id] = true;
        }
      }
      if (strum.length > 0) {
        cues.push(strum);
      }
    }
  };

  var cues = [];

  setInterval(function() {
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

  // Like a Nintendo lightgun, the Lightgun does hit detection by checking
  // the color of a pixel on an offscreen canvas.
  function Lightgun() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = 0; this.canvas.style.left = 0;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.nextColor = 0x1;
    this.keyToColor = {};
    this.colorToObject = [];
  }

  Lightgun.prototype.objectsIn = function(x, y, w, h) {
    var img = this.ctx.getImageData(x, y, w, h);
    var colors = {};
    var i = w * h; while(--i >= 0) {
      if (img.data[4 * i + 3] > 0x0) {
        var c = img.data[4 * i] | (img.data[4 * i + 1] << 8) | (img.data[4 * i + 2] << 16);
        colors[c] = true;        
      }
    }
    var objs = [];
    for (c in colors) {
      if (c in this.colorToObject) {
        objs.push(this.colorToObject[c]);
      }
    }
    return objs;
  };

  function ci24ToStr(n) {
    return 'rgb(' + (n & 0xFF) + ',' +
                   ((n >> 8) & 0xFF) + ',' +
                   ((n >> 16) & 0xFF) + ')';
  };

  Lightgun.prototype.setSize = function(width, height) {
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
  };

  Lightgun.prototype.clear = function() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  };

  Lightgun.prototype.getColor = function(obj) {
    var key = obj.toString();
    if (key in this.keyToColor) {
      return this.keyToColor[key];
    }

    var color = this.nextColor;
    this.nextColor += 10;
    this.keyToColor[key] = {color: color, str: ci24ToStr(color)};
    this.colorToObject[color] = obj;
    return color;
  };

  var Graph = Object.create(HTMLElement.prototype);

  Graph.createdCallback = function() {
    /*var root = this.createShadowRoot();
    this.root = root;*/

    this.canvas = document.createElement('canvas');
    this.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.gun = new Lightgun();
    // root.appendChild(this.gun.canvas);

    this.anchors = [];
    this.cords = [];
    this.transient = {
      anchors: [],  // indices into this.anchors
      cords: [],    // indices into this.cords
    };

    this.strumBoxes = [];
    this.dragging = null;
    this.dragDidOccur = false;
    this.running = false;

    // Bound instance methods
    this.animFrame = this.animFrame.bind(this);
    this.onDblClick = this.onDblClick.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
  };

  Graph.attachedCallback = function() {
    this.running = true;
    window.requestAnimationFrame(this.animFrame);

    this.addEventListener('dblclick', this.onDblClick);
    this.addEventListener('mousemove', this.onMouseMove);
    this.addEventListener('mousedown', this.onMouseDown);
    this.addEventListener('mouseup', this.onMouseUp);
  };

  Graph.detachedCallback = function() {
    this.running = false;
    this.removeEventListener('dblclick', this.onDblClick);
    this.removeEventListener('mousemove', this.onMouseMove);
    this.removeEventListener('mousedown', this.onMouseDown);
    this.removeEventListener('mouseup', this.onMouseUp);    
  };

  function mousePos(event) {
    return [event.offsetX, event.offsetY];
  }

  Graph.findAnchorAt = function(mouse, opts) {
    opts = opts || {};
    var i = this.anchors.length; while (--i >= 0) {
      if (this.anchors[i].pos.sub(mouse).magSquared <= 25 &&
          this.anchors[i] !== opts.ignore) {
        return this.anchors[i];
      }
    }    
  };

  Graph.onDblClick = function(event) {
    var anchor = this.findAnchorAt(mousePos(event));
    if (anchor) {
      anchor.strumBfs();
    }
  };

  var prevEvent;
  Graph.onMouseMove = function(event) {
    if (this.dragging) {
      this.dragging.pos = [event.offsetX, event.offsetY];
      this.dragDidOccur = true;
    } else {
      prevEvent = prevEvent || event;
      var movementX = event.movementX || (event.offsetX - prevEvent.offsetX);
      var movementY = event.movementY || (event.offsetY - prevEvent.offsetY);
      var x1 = event.offsetX, y1 = event.offsetY,
        x2 = x1 - movementX, y2 = y1 - movementY,
        xMin = Math.min(x1, x2), yMin = Math.min(y1, y2),
        xMax = Math.max(x1, x2), yMax = Math.max(y1, y2),
        w = Math.max(3, xMax - xMin), h = Math.max(3, yMax - yMin);
      prevEvent = event;
      this.strumBoxes.push([xMin, yMin, w, h]);
    }
  };

  Graph.clearTransients = function() {
    var i = this.transient.anchors.length; while (--i >= 0) {
      this.anchors.splice(this.transient.anchors[i], 1);
    };
    var i = this.transient.cords.length; while (--i >= 0) {
      this.cords.splice(this.transient.cords[i], 1);
    };
    this.affixTransients();
  };

  Graph.affixTransients = function() {
    this.transient.anchors = [];
    this.transient.cords = [];
  };

  Graph.onMouseUp = function(event) {
    if (this.dragging && !this.dragDidOccur && this.transient.anchors.length > 0) {
      // Started a drag but never actually dragged, so delete the transients
      // and bail.
      this.clearTransients();
      this.dragging = null;
      return;
    }
    if (this.dragging) {
      var pos = mousePos(event);
      this.affixTransients();

      var existingAnchor = this.findAnchorAt(pos, {ignore: this.dragging});
      if (existingAnchor) {
        var deadCords = existingAnchor.consume(this.dragging);
        this.anchors.splice(this.anchors.indexOf(this.dragging), 1);
        // eww, this is really inefficient.
        var i = deadCords.length; while (--i >= 0) {
          var idx = this.cords.indexOf(deadCords[i]);
          this.cords.splice(idx, 1);
        }
      }
    }
    this.dragging = null;
  };

  Graph.onMouseDown = function(event) {
    var pos = mousePos(event);
    var target = this.findAnchorAt(pos)
    if (!target) {
      // create two anchors and drag one of them.
      var source = new Anchor(pos);
      target = new Anchor(pos);
      this.transient.anchors.push(this.anchors.push(source) - 1);
      this.transient.anchors.push(this.anchors.push(target) - 1);
      this.transient.cords.push(this.cords.push(new Cord(source, target)) - 1);
    }
    this.dragging = target;
  };

  Graph.animFrame = function(ts) {
    this.fitCanvas();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.gun.clear();

    var i = this.cords.length; while (--i >= 0) {
      this.cords[i].draw(this.ctx, ts);
      this.cords[i].drawSelMask(this.gun, ts);
    }

    i = this.anchors.length; while (--i >= 0) {
      this.anchors[i].draw(this.ctx, ts);
    }

    var toPluck = {};
    while (this.strumBoxes.length > 0) {
      var box = this.strumBoxes.shift();
      this.fillStyle = 'fuchsia';
      this.ctx.fillRect.apply(this.ctx, box);
      var hits = this.gun.objectsIn.apply(this.gun, box);
      var i = hits.length; while (--i >= 0) {
        toPluck[hits[i].id] = true;
      }
    }
    for (var cordId in toPluck) {
      Cord.all[cordId].pluck();
    }

    if (this.running) {
      window.requestAnimationFrame(this.animFrame);
    }
  };

  Graph.fitCanvas = function() {
    if (this.canvas.width !== this.clientWidth) {
      this.canvas.width = this.clientWidth;
    }
    if (this.canvas.height !== this.clientHeight) {
      this.canvas.height = this.clientHeight;
    }
    this.gun.setSize(this.clientWidth, this.clientHeight);
  };

  return {
    Graph: document.registerElement('pink-cords', {prototype: Graph}),
  }
})();