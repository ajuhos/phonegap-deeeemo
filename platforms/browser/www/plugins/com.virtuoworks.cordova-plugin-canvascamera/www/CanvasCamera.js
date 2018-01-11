cordova.define("com.virtuoworks.cordova-plugin-canvascamera.CanvasCamera", function(require, exports, module) { /**
* CanvasCamera.js
* PhoneGap iOS and Android Cordova Plugin to capture Camera streaming into an HTML5 Canvas.
*
* VirtuoWorks <contact@virtuoworks.com>.
*
* MIT License
*
* Default user options :
*  {
*    width: 352,
*    height: 288,
*    canvas: {
*      width: 352,
*      height: 288
*    },
*    capture: {
*      width: 352,
*      height: 288
*    },
*    fps: 30,
*    use: 'file',
*    flashMode: false,
*    hasThumbnail: true,
*    thumbnailRatio: 1/6,
*    cameraFacing: 'front'
*  }
**/

var exec = require('cordova/exec');

window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

var CanvasCamera = function(){
    this.canvas = {};
    this.options = {};
    this.onCapture = null;
};

CanvasCamera.prototype.createFrame = (function(image, element) {

    var Frame = function(image, element) {
        this.sx = 0;
        this.sy = 0;
        this.sWidth = 0;
        this.sHeight = 0;
        this.dx = 0;
        this.dy = 0;
        this.dWidth = 0;
        this.dHeight = 0;

        this.image = image || null;
        this.element = element || null;
    };

    Frame.prototype.initialize = function(){
        if (this.image && this.element) {
            // The X coordinate of the top left corner of the sub-rectangle of the source image to draw into the destination context.
            this.sx = 0; //(parseFloat(this.element.width) / 2) - (parseFloat(this.image.width) / 2);
            // The Y coordinate of the top left corner of the sub-rectangle of the source image to draw into the destination context.
            this.sy = 0; //(parseFloat(this.element.height) / 2) - (parseFloat(this.image.height) / 2);
            // The width of the sub-rectangle of the source image to draw into the destination context. If not specified, the entire rectangle from the coordinates specified by sx and sy to the bottom-right corner of the image is used.
            this.sWidth = parseFloat(this.image.width);
            // The height of the sub-rectangle of the source image to draw into the destination context.
            this.sHeight = parseFloat(this.image.height);
            // The X coordinate in the destination canvas at which to place the top-left corner of the source image.
            this.dx = 0;
            // The Y coordinate in the destination canvas at which to place the top-left corner of the source image.
            this.dy = 0;
            // The width to draw the image in the destination canvas. This allows scaling of the drawn image. If not specified, the image is not scaled in width when drawn.
            this.dWidth = parseFloat(this.element.width);
            // The height to draw the image in the destination canvas. This allows scaling of the drawn image. If not specified, the image is not scaled in height when drawn.
            this.dHeight = parseFloat(this.element.height);

            var hRatio = this.dWidth / this.sWidth ;
            var vRatio = this.dHeight / this.sHeight;
            this.ratio  = Math.max(hRatio, vRatio);

            this.dx = (this.dWidth - this.sWidth * this.ratio) / 2;
            this.dy = (this.dHeight - this.sHeight * this.ratio) / 2;

            this.dWidth = this.sWidth * this.ratio;
            this.dHeight = this.sHeight * this.ratio;
        }

        return this;
    };

    Frame.prototype.recycle = function(){
        for (var property in this) {
            if (this.hasOwnProperty(property)) {
                delete this[property];
            }
        }
    };

    var frame = function(image, element) {
        return new Frame(image, element);
    };

    return function(image, element){
        return frame(image, element).initialize();
    };
}());


CanvasCamera.prototype.createRenderer = (function (element, parent) {

    var Renderer = function (element, parent){
        this.size = null;
        this.type = null;
        this.image = null;
        this.context = null;
        this.orientation = null;

        this.buffer = [];

        this.available = true;
        this.fullscreen = false;

        this.parent = parent || null;
        this.element = element || null;

        this.onAfterDraw = null;
        this.onBeforeDraw = null;
    };

    Renderer.prototype.initialize = function(){
        if (this.element) {
            this.context = this.element.getContext('2d');

            this.image = new Image();

            this.image.addEventListener('load', function(event) {

                var frame = this.parent.createFrame(this.image, this.element);

                this.resize().clear();
                if (this.onBeforeDraw) {
                    this.onBeforeDraw(frame);
                }
                this.draw(frame);
                if (this.onAfterDraw) {
                    this.onAfterDraw(frame);
                }

                frame.recycle();
                frame = null;

                this.enable();
            }.bind(this));

            this.image.addEventListener('error', function(event) {
                this.clear().enable();
            }.bind(this));

            window.addEventListener('orientationchange', function(event){
                this.onOrientationChange();
            }.bind(this));
        }
        return this;
    };

    Renderer.prototype.onOrientationChange = function(){
        if (this.parent.getUIOrientation() !== this.orientation) {
            this.invert();
        }
        this.buffer = [];
    };

    Renderer.prototype.clear = function(){
        this.context.clearRect(0, 0, this.element.width, this.element.height);

        return this;
    };

    Renderer.prototype.draw = function(frame){
        if (frame) {
            this.context.drawImage(frame.image, frame.sx, frame.sy, frame.sWidth, frame.sHeight, frame.dx, frame.dy, frame.dWidth, frame.dHeight);
        }

        return this;
    };

    Renderer.prototype.bufferize = function(data, type){
        if (this.enabled()) {
            this.type = type;
            this.buffer.push(data);
            this.run();
        }

        return this;
    };

    Renderer.prototype.run = function(){
        if (this.enabled()) {
            window.requestAnimationFrame(function(timestamp) {
                if (this.buffer.length) {
                    this.render(this.buffer.pop(), this.type);
                    this.buffer = [];
                }
            }.bind(this));
        }

        return this;
    };

    Renderer.prototype.render = function(data, type){
        if (this.enabled()) {
            if (data && data[type]) {
                if (data.hasOwnProperty('orientation') && data.orientation) {
                    this.orientation = data.orientation;
                }

                if (this.image) {
                    // type can be 'data' or 'file'
                    switch(type){
                        case 'file':
                            // add a random seed to prevent browser caching.
                            this.image.src = data[type] + '?seed=' + Math.round((new Date()).getTime() * Math.random() * 1000);
                        break;
                        default:
                             this.image.src = data[type];
                    }
                }

                this.disable();
            }
        }

        return this;
    };

    Renderer.prototype.enable = function(){
        this.available = true;

        return this;
    };

    Renderer.prototype.disable = function(){
        this.available = false;

        return this;
    };

    Renderer.prototype.enabled = function(){
        return this.available;
    };

    Renderer.prototype.disabled = function(){
        return !this.available;
    };

    Renderer.prototype.invert = function(){
        if (this.size) {
            var iSize = {};
            if (this.size.width && !isNaN(this.size.width)) {
                if (this.fullscreen) {
                    iSize.width = parseFloat(window.innerHeight);
                } else {
                    if (parseFloat(this.size.height) <= parseFloat(window.innerHeight)) {
                        iSize.width = parseFloat(this.size.height);
                    } else {
                        iSize.width = parseFloat(window.innerHeight);
                    }
                }
            }
            if (this.size.height && !isNaN(this.size.height)) {
                if (this.fullscreen) {
                    iSize.height = parseFloat(window.innerWidth);
                } else {
                    if (parseFloat(this.size.width) <= parseFloat(window.innerWidth)) {
                        iSize.height = parseFloat(this.size.width);
                    } else {
                        iSize.height = parseFloat(window.innerWidth);
                    }
                }
            }
            this.size = iSize;
        }

        return this;
    };

    Renderer.prototype.resize = function(){
        if (this.size) {
            var pixelRatio = window.devicePixelRatio || 1;
            if (this.size.width && !isNaN(this.size.width)) {
                if (!this.fullscreen && parseFloat(this.size.width) <= parseFloat(window.innerWidth)) {
                    this.element.width = parseFloat(this.size.width * pixelRatio);
                    this.element.style.width = parseFloat(this.size.width) + 'px';
                } else {
                    this.element.width = parseFloat(window.innerWidth * pixelRatio);
                    this.element.style.width = parseFloat(window.innerWidth) + 'px';
                }
            } else {
                this.element.width = parseFloat(window.innerWidth * pixelRatio);
                this.element.style.width = parseFloat(window.innerWidth) + 'px';
            }
            if (this.size.height && !isNaN(this.size.height)) {
                if (!this.fullscreen && parseFloat(this.size.height) <= parseFloat(window.innerHeight)) {
                    this.element.height = parseFloat(this.size.height * pixelRatio);
                    this.element.style.height = parseFloat(this.size.height) + 'px';
                } else {
                    this.element.height = parseFloat(window.innerHeight * pixelRatio);
                    this.element.style.height = parseFloat(window.innerHeight) + 'px';
                }
            } else {
                this.element.height = parseFloat(window.innerHeight * pixelRatio);
                this.element.style.height = parseFloat(window.innerHeight) + 'px';
            }
        }

        return this;
    };

    Renderer.prototype.setSize = function(size, auto){
        this.fullscreen = !!auto || false;
        if (size && size.width && size.height) {
          if (!isNaN(parseFloat(size.width)) && !isNaN(parseFloat(size.height))) {
            this.size = size;
            if (!this.fullscreen) {
                if (parseFloat(size.width) >= parseFloat(window.innerWidth) && parseFloat(size.height) >= parseFloat(window.innerHeight)) {
                    this.fullscreen = true;
                }
            }
          }
        }

        return this;
    };

    Renderer.prototype.setOnBeforeDraw = function(onBeforeDraw){
        if (onBeforeDraw && typeof onBeforeDraw === 'function') {
            this.onBeforeDraw = onBeforeDraw;
        }

        return this;
    };

    Renderer.prototype.setOnAfterDraw = function(onAfterDraw){
        if (onAfterDraw && typeof onAfterDraw === 'function') {
            this.onAfterDraw = onAfterDraw;
        }

        return this;
    };

    var renderer = function(element, parent){
        return new Renderer(element, parent);
    };

    return function(element, parent){
        return renderer(element, parent).initialize();
    };
}());

CanvasCamera.prototype.initialize = function(fcanvas, tcanvas) {
    if(fcanvas && fcanvas.getContext) {
        this.canvas.fullsize = this.createRenderer(fcanvas, this);
        if (tcanvas && tcanvas.getContext) {
            this.canvas.thumbnail = this.createRenderer(tcanvas, this);
        }
    } else {
        if (fcanvas.fullsize && fcanvas.fullsize.getContext) {
            this.canvas.fullsize = this.createRenderer(fcanvas.fullsize, this);
            if (fcanvas.thumbnail && fcanvas.thumbnail.getContext) {
                this.canvas.thumbnail = this.createRenderer(fcanvas.thumbnail, this);
            }
        }
    }
};

CanvasCamera.prototype.start = function(options, onError, onSuccess) {
    this.options = options;
    this.setRenderingPresets();

    if (onSuccess && typeof onSuccess === 'function') {
        this.onCapture = onSuccess;
    }

    this.enableRenderers();
    exec(this.capture.bind(this), function(error) {
        this.disableRenderers();
        if (onError && typeof onError === 'function') {
            onError(error);
        }
    }.bind(this), 'CanvasCamera', 'startCapture', [this.options]);
};

CanvasCamera.prototype.stop = function(onError, onSuccess) {
    this.disableRenderers();
    exec(function(data){
        if (onSuccess && typeof onSuccess === 'function') {
            onSuccess(data);
        }
    }.bind(this), function(error) {
        if (onError && typeof onError === 'function') {
            onError(error);
        }
    }.bind(this), 'CanvasCamera', 'stopCapture', []);
};

CanvasCamera.prototype.flashMode = function(flashMode, onError, onSuccess) {
    exec(function(data){
        if (onSuccess && typeof onSuccess === 'function') {
            onSuccess(data);
        }
    }.bind(this), function(error) {
        if (onError && typeof onError === 'function') {
            onError(error);
        }
    }.bind(this), 'CanvasCamera', 'flashMode', [flashMode]);
};

CanvasCamera.prototype.cameraPosition = function(cameraFacing, onError, onSuccess) {
    this.disableRenderers();
    exec(function(data){
        this.enableRenderers();
        if (onSuccess && typeof onSuccess === 'function') {
            onSuccess(data);
        }
    }.bind(this), function(error) {
        if (onError && typeof onError === 'function') {
            onError(error);
        }
    }.bind(this), 'CanvasCamera', 'cameraPosition', [cameraFacing]);
};

CanvasCamera.prototype.capture = function(data) {
    if (data && data.output && data.output.images) {
        if (data.output.images.fullsize && data.output.images.fullsize[this.options.use]) {
            if (this.canvas.fullsize) {
                this.canvas.fullsize.bufferize(data.output.images.fullsize, this.options.use);
            }
            if (data.output.images.thumbnail && data.output.images.thumbnail[this.options.use]) {
                if (this.canvas.thumbnail) {
                    this.canvas.thumbnail.bufferize(data.output.images.thumbnail, this.options.use);
                }
            }
        }
    }

    if (this.onCapture && typeof this.onCapture === 'function') {
        this.onCapture(data);
    }
};

CanvasCamera.prototype.enableRenderers = function() {
    if (this.canvas && typeof this.canvas === 'object') {
        for (var renderer in this.canvas) {
            if(this.canvas.hasOwnProperty(renderer)) {
                if (this.canvas[renderer].disabled()) {
                    this.canvas[renderer].enable();
                }
            }
        }
    }
};

CanvasCamera.prototype.disableRenderers = function() {
    if (this.canvas && typeof this.canvas === 'object') {
        for (var renderer in this.canvas) {
            if(this.canvas.hasOwnProperty(renderer)) {
                if (this.canvas[renderer].enabled()) {
                    this.canvas[renderer].disable();
                }
            }
        }
    }
};

CanvasCamera.prototype.setRenderingPresets = function() {

    switch (this.options.use) {
        case 'data':
        case 'file':
        break;
        default:
           this.options.use = 'file';
    }

    if (this.options.onBeforeDraw && typeof this.options.onBeforeDraw === 'function') {
        if (this.canvas.fullsize) {
            this.canvas.fullsize.setOnBeforeDraw(this.options.onBeforeDraw);
        }
    }

    if (this.options.onAfterDraw && typeof this.options.onAfterDraw === 'function') {
        if (this.canvas.fullsize) {
            this.canvas.fullsize.setOnAfterDraw(this.options.onAfterDraw);
        }
    }

    var size = this.getUISize();
    this.setRenderersSize(size);

    return this;
};

CanvasCamera.prototype.getUISize = function() {
    var size = {
        width: window.innerWidth,
        height: window.innerHeight,
    };

    if (this.options) {
        if (this.options.canvas) {
            if (this.options.canvas.width && this.options.canvas.height) {
               if(!isNaN(parseFloat(this.options.canvas.width)) && ! isNaN(parseFloat(this.options.canvas.height))) {
                    size.auto = false;
                    if (this.getUIOrientation() === 'portrait') {
                         size.width =  parseFloat(this.options.canvas.height);
                         size.height = parseFloat(this.options.canvas.width);
                    } else {
                        size.width =  parseFloat(this.options.canvas.width);
                        size.height = parseFloat(this.options.canvas.height);
                    }
               }
            }
        }

        if (this.options.width && this.options.height) {
            if(!isNaN(parseFloat(this.options.width)) && ! isNaN(parseFloat(this.options.height))) {
                size.auto = false;
                if (this.getUIOrientation() === 'portrait') {
                    size.width = parseFloat(this.options.height);
                    size.height = parseFloat(this.options.width);
                } else {
                    size.width = parseFloat(this.options.width);
                    size.height = parseFloat(this.options.height);
                }
            }
        }
    }

    return size;
};

CanvasCamera.prototype.getUIOrientation = function() {
    if (isNaN(window.orientation)) {
        return 'landscape';
    } else {
        if (window.orientation % 180 === 0) {
            return 'portrait';
        } else {
            return 'landscape';
        }
    }
};

CanvasCamera.prototype.setRenderersSize = function(size) {
  if (size.width && size.height) {
      if (this.canvas.fullsize) {
          this.canvas.fullsize.setSize({
              width: parseFloat(size.width),
              height: parseFloat(size.height)
          }, size.auto);
          if (this.canvas.thumbnail) {
              this.options.hasThumbnail = true;
              if (!this.options.thumbnailRatio) {
                  this.options.thumbnailRatio = 1/6;
              }
              this.canvas.thumbnail.setSize({
                  width: parseFloat((parseFloat(size.width) * parseFloat(this.options.thumbnailRatio))),
                  height: parseFloat((parseFloat(size.height) * parseFloat(this.options.thumbnailRatio)))
              });
          }
      }
  }

   return this;
};

module.exports = new CanvasCamera();

});
