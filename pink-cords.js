"use strict";

var PinkCords = (function() {
  function Cord(source, target) {
    this.source = source;
    this.target = target;
    this.audioNode = T('pluck');
    this.audioNode.play();    
    this.id = Cord.nextId++;
    Cord.all[this.id] = this;
    this.lastPluck = Number.MIN_SAFE_INTEGER;
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
  }

  // This is ugly. I'm sorry ~ ashi.
  Cord.prototype.otherEndFrom = function(sourceOrTarget) {
    return sourceOrTarget == this.source? this.target : this.source;
  }

  Cord.range0x00To0xFF = (0x00).to(0xff);
  Cord.pluckDuration = 100;
  Cord.resonantDuration = 10000;
  Cord.totalDuration = Cord.pluckDuration + Cord.resonantDuration;

  Cord.prototype.draw = function(ctx, ts) {
    ctx.lineWidth = 2;
    if (this.audioNode._.buffer) {
      var i = Math.floor(Math.random() * this.audioNode._.buffer.length);
      if (i === this.audioNode._.buffer.length) { --i; }
      var t = this.audioNode._.buffer[i];
      var c = 0xff0000 | (Cord.range0x00To0xFF.at(t) << 8) | 0xff;
    } else {
      c = 0x999999;
    }

    ctx.strokeStyle = ci24ToStr(c);
/*    if (this.lastPluck < ts - Cord.totalDuration) {
      ctx.strokeStyle = '#999';
    } else {
      if (this.lastPluck < ts - Cord.resonantDuration) {
        var t = (ts - this.lastPluck) / Cord.resonantDuration;
        ctx.strokeStyle = ci24ToStr(Cord.resonantGradient.at(t));
      } else {
        var t = (ts - this.lastPluck) / Cord.pluckDuration;
        ctx.strokeStyle = 
      }
    }*/
    ctx.beginPath(); 
    ctx.moveTo(this.source.pos.x, this.source.pos.y);
    ctx.lineTo(this.target.pos.x, this.target.pos.y);
    ctx.stroke();    
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

  Anchor.prototype.toString = function() { return 'Anchor_' + this.id; };

  Anchor.prototype.strumBfs = function(duration) {
    var visited = {};
    var queue = [this];
    while (queue.length > 0) {
      var next = queue.shift();
      var strum = [];      
      var i = next.cords.length; while(--i >= 0) {
        var cord = next.cords[i];
        var other = cord.otherEndFrom(next);
        strum.push(cord);
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
    var root = this.createShadowRoot();
    this.root = root;

    this.canvas = document.createElement('canvas');
    root.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.gun = new Lightgun();
    // root.appendChild(this.gun.canvas);

    this.anchors = [];
    this.cords = [];

    this.strumBoxes = [];
    this.dragging = null;
    this.running = false;

    // Bound instance methods
    this.animFrame = this.animFrame.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onDblClick = this.onDblClick.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
  };

  Graph.attachedCallback = function() {
    this.running = true;
    window.requestAnimationFrame(this.animFrame);

    this.addEventListener('click', this.onClick);
    this.addEventListener('dblclick', this.onDblClick);
    this.addEventListener('mousemove', this.onMouseMove);
    this.addEventListener('mousedown', this.onMouseDown);
    this.addEventListener('mouseup', this.onMouseUp);
  };

  Graph.detachedCallback = function() {
    this.running = false;
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('dblclick', this.onDblClick);
    this.removeEventListener('mousemove', this.onMouseMove);
    this.removeEventListener('mousedown', this.onMouseDown);
    this.removeEventListener('mouseup', this.onMouseUp);    
  };

  Graph.findAnchorUnderMouse = function(event) {
    var mouse = [event.offsetX, event.offsetY];
    var i = this.anchors.length; while (--i >= 0) {
      if (this.anchors[i].pos.sub(mouse).magSquared <= 25) {
        return this.anchors[i];
      }
    }    
  };

  Graph.onClick = function(event) {
    if (this.findAnchorUnderMouse(event)) { return; }

    var pos = [event.offsetX, event.offsetY];
    var anchor = new Anchor(pos);

    var i = this.anchors.length; while (--i >= 0) {
      var target = this.anchors[i];
      if (target.pos.sub(pos).magSquared <= 4000) {
        var cord = new Cord(anchor, target);
        anchor.attach(cord);
        target.attach(cord);
        this.cords.push(cord);
      }
    }

    this.anchors.push(anchor);
  };

  Graph.onDblClick = function(event) {
    var anchor = this.findAnchorUnderMouse(event);
    if (anchor) {
      anchor.strumBfs();
    }
  };

  Graph.onMouseMove = function(event) {
    if (this.dragging) {
      this.dragging.pos = [event.offsetX, event.offsetY];
    } else {
      var x1 = event.offsetX, y1 = event.offsetY,
        x2 = x1 - event.movementX, y2 = y1 - event.movementY,
        xMin = Math.min(x1, x2), yMin = Math.min(y1, y2),
        xMax = Math.max(x1, x2), yMax = Math.max(y1, y2),
        w = Math.max(3, xMax - xMin), h = Math.max(3, yMax - yMin);

      this.strumBoxes.push([xMin, yMin, w, h]);
    }
  };

  Graph.onMouseUp = function(event) {
    this.dragging = null;
  };

  Graph.onMouseDown = function(event) {
    this.dragging = this.findAnchorUnderMouse(event);
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