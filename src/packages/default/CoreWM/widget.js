/*!
 * OS.js - JavaScript Cloud/Web Desktop Platform
 *
 * Copyright (c) 2011-2016, Anders Evenrud <andersevenrud@gmail.com>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * @author  Anders Evenrud <andersevenrud@gmail.com>
 * @licence Simplified BSD License
 */
(function(WindowManager, Window, GUI, Utils, API, VFS) {
  'use strict';

  var defaultOptions = {
    aspect: 0,
    minWidth: 100,
    maxWidth: 500,
    minHeight: 100,
    maxHeight: 500,
    left: -1,
    right: -1,
    frequency: 2
  };

  function bindWidgetEvents(instance) {
    var timeout = null;
    var position = instance._getNormalizedPosition();
    var dimension = {w: instance._options.width, h: instance._options.height};
    var start = {x: 0, y: 0};

    function _bindWindow(action) {
      Utils.$bind(window, 'mousemove:modifywidget', function(ev, pos) {
        var dx = pos.x - start.x;
        var dy = pos.y - start.y;
        var obj = action === 'move' ? {
          x: position.x + dx,
          y: position.y + dy
        } : {
          w: instance._options.aspect ? (dimension.w + dx) : dimension.w + dx,
          h: instance._options.aspect ? (dimension.w + dx) : dimension.h + dy
        };

        instance._onMouseMove(ev, obj, action);
      });

      Utils.$bind(window, 'mouseup:modifywidget', function(ev, pos) {
        Utils.$unbind(window, 'mousemove:modifywidget');
        Utils.$unbind(window, 'mouseup:modifywidget');

        instance._onMouseUp(ev, pos, action);
      });
    }

    function _mouseDown(ev, pos, action) {
      ev.preventDefault();

      timeout = clearTimeout(timeout);
      start = pos;
      position = instance._getNormalizedPosition();
      dimension = {w: instance._options.width, h: instance._options.height};

      instance._windowWidth = window.innerWidth;

      _bindWindow(action);
      instance._onMouseDown(ev, pos, action);
    }

    Utils.$bind(instance._$element, 'mousedown:movewidget', function(ev, pos) {
      _mouseDown(ev, pos, 'move');
    });
    Utils.$bind(instance._$resize, 'mousedown:resizewidget', function(ev, pos) {
      ev.stopPropagation();
      _mouseDown(ev, pos, 'resize');
    });

    Utils.$bind(instance._$element, 'click:showenvelope', function(ev) {
      timeout = clearTimeout(timeout);
      instance._showEnvelope();
    });
    Utils.$bind(instance._$element, 'mouseover:showenvelope', function() {
      timeout = clearTimeout(timeout);
      timeout = setTimeout(function() {
        instance._showEnvelope();
      }, 3000);
    });
    Utils.$bind(instance._$element, 'mouseout:hideenvelope', function(ev) {
      timeout = clearTimeout(timeout);
      timeout = setTimeout(function() {
        instance._hideEnvelope();
      }, 1000);
    });
  }

  /////////////////////////////////////////////////////////////////////////////
  // PANELS
  /////////////////////////////////////////////////////////////////////////////

  // TODO: Set right position based on which "side of screen"

  function Widget(name, options, settings) {
    options = options || {};

    this._name = name;
    this._options = Utils.mergeObject(defaultOptions, options || {});
    this._settings = new OSjs.Helpers.SettingsFragment(options, 'CoreWM/Widget/' + name);
    this._$element = null;
    this._$resize = null;
    this._$canvas = null;
    this._$context = null
    this._showUnderlay = false;
    this._isManipulating = false;
    this._resizeTimeout = null;
    this._windowWidth = window.innerWidth;
    this._requestId = null;

    console.debug('Widget::construct()', this._name, this._settings.get());
  }

  Widget.prototype.init = function(root, isCanvas) {
    var self = this;

    this._windowWidth = window.innerWidth;
    this._$element = document.createElement('corewm-widget');
    this._$resize = document.createElement('corewm-widget-resize');

    if ( isCanvas ) {
      this._$canvas = document.createElement('canvas');
      this._$canvas.width = (this._options.width || 32);
      this._$canvas.height = (this._options.height || 32);
      this._$context = this._$canvas.getContext('2d');
      this._$element.appendChild(this._$canvas);
    }

    bindWidgetEvents(this);

    var fps = this._options.frequency;
    var fpsInterval, startTime, now, then, elapsed;

    function animate() {
      window.requestAnimationFrame(animate);

      now = Date.now();
      elapsed = now - then;

      if ( elapsed > fpsInterval ) {
        then = now - (elapsed % fpsInterval);
        self.onRender();
      }
    }

    if ( isCanvas ) {
      this._requestId = window.requestAnimationFrame(function() {
        fpsInterval = 1000 / fps;
        then = Date.now();
        startTime = then;

        animate();
      });
    }

    this._updatePosition();
    this._updateDimension();

    this._$element.appendChild(this._$resize);
    root.appendChild(this._$element);

    this.onResize();

    return this._$element;
  };

  Widget.prototype.destroy = function() {
    Utils.$unbind(window, 'mousemove:modifywidget');
    Utils.$unbind(window, 'mouseup:modifywidget');
    Utils.$unbind(this._$resize, 'mousedown:resizewidget');
    Utils.$unbind(this._$element, 'mousedown:movewidget');
    Utils.$unbind(this._$element, 'click:showenvelope');
    Utils.$unbind(this._$element, 'mouseover:showenvelope');
    Utils.$unbind(this._$element, 'mouseout:hideenvelope');

    this._resizeTimeout = clearTimeout(this._resizeTimeout);

    if ( this._requestId ) {
      window.cancelAnimationFrame(this._requestId);
    }
    this._requestId = null;

    this._$canvas = Utils.$remove(this._$canvas);
    this._$resize = Utils.$remove(this._$resize);
    this._$element = Utils.$remove(this._$element);
    this._$context = null;
  };

  Widget.prototype._onMouseDown = function(ev, pos, action) {
    Utils.$addClass(this._$element, 'corewm-widget-active');
  };

  Widget.prototype._onMouseMove = function(ev, obj, action) {
    var self = this;

    this._isManipulating = true;
    this._resizeTimeout = clearTimeout(this._resizeTimeout);

    if ( action === 'move' ) {
      this._options.left = obj.x;
      this._options.top = obj.y;
      this._options.right = null; // FIXME

      this._updatePosition();
    } else {
      this._options.width = obj.w;
      this._options.height = obj.h;

      this._updateDimension();

      this._resizeTimeout = setTimeout(function() {
        self.onResize();
      }, 50);
    }
  };

  Widget.prototype._onMouseUp = function(ev, pos, action) {
    this._isManipulating = false;
    this._resizeTimeout = clearTimeout(this._resizeTimeout);

    Utils.$removeClass(this._$element, 'corewm-widget-active');

    this._hideEnvelope();
  };

  Widget.prototype._showEnvelope = function() {
    if ( !this._$element ) {
      return;
    }

    this._showUnderlay = true;

    Utils.$addClass(this._$element, 'corewm-widget-envelope');
  };

  Widget.prototype._hideEnvelope = function() {
    if ( !this._$element || this._isManipulating ) {
      return;
    }

    this._showUnderlay = false;

    Utils.$removeClass(this._$element, 'corewm-widget-envelope');
  };

  Widget.prototype._updatePosition = function() {
    if ( this._$element ) {
      var p = this._getNormalizedPosition();
      this._$element.style.left = String(p.x) + 'px';
      this._$element.style.top = String(p.y) + 'px';
    }
  };

  Widget.prototype._updateDimension = function() {
    if ( this._$element ) {
      this._$element.style.width = String(this._options.width) + 'px';
      this._$element.style.height = String(this._options.height) + 'px';
    }

    if ( this._$canvas ) {
      this._$canvas.width = this._options.width;
      this._$canvas.height = this._options.height;
    }
  };

  Widget.prototype._getNormalizedPosition = function() {
    var left = this._options.left;
    if ( this._options.right ) {
      left = this._windowWidth - this._options.right - this._options.width;
    }
    return {x: left, y: this._options.top};
  };

  Widget.prototype.onResize = function() {
  };

  Widget.prototype.onRender = function() {
  };

  /////////////////////////////////////////////////////////////////////////////
  // EXPORTS
  /////////////////////////////////////////////////////////////////////////////

  OSjs.Applications.CoreWM = OSjs.Applications.CoreWM || {};
  OSjs.Applications.CoreWM.Widget = Widget;

})(OSjs.Core.WindowManager, OSjs.Core.Window, OSjs.GUI, OSjs.Utils, OSjs.API, OSjs.VFS);
