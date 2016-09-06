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
(function(Widget, Utils, API, VFS, GUI, Window) {
  'use strict';

  /////////////////////////////////////////////////////////////////////////////
  // ITEM
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Widget: Clock
   */
  function WidgetClock(settings) {
    Widget.call(this, 'Clock', {
      width: 300,
      height: 300,
      aspect: 1,
      top: 100,
      right: 20,
      canvas: true,
      frequency: 1,
      resizable: true,
      viewBox: true
    }, settings);
  }

  WidgetClock.prototype = Object.create(Widget.prototype);
  WidgetClock.constructor = Widget;

  WidgetClock.prototype.init = function(root) {
    return Widget.prototype.init.apply(this, arguments);
  };

  WidgetClock.prototype.destroy = function(root) {
    return Widget.prototype.destroy.apply(this, arguments);
  };

  WidgetClock.prototype.onRender = function() {
    if ( !this._$canvas ) {
      return;
    }

    var canvas = this._$canvas;
    var ctx = this._$context;
    var radius = canvas.height / 2;

    // NOTE: This was just lifted from the webz
    function drawFace(ctx, radius) {
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, 2 * Math.PI);
      ctx.fillStyle = 'white';
      ctx.fill();

      ctx.lineWidth = radius * 0.04;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.1, 0, 2 * Math.PI);
      ctx.fillStyle = '#000';
      ctx.fill();
    }

    function drawNumbers(ctx, radius) {
      var ang;
      var num;
      ctx.font = radius * 0.15 + 'px arial';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      for ( num = 1; num < 13; num++ ) {
        ang = num * Math.PI / 6;
        ctx.rotate(ang);
        ctx.translate(0, -radius * 0.85);
        ctx.rotate(-ang);
        ctx.fillText(num.toString(), 0, 0);
        ctx.rotate(ang);
        ctx.translate(0, radius * 0.85);
        ctx.rotate(-ang);
      }
    }

    function drawHand(ctx, pos, length, width) {
      ctx.beginPath();
      ctx.lineWidth  =  width;
      ctx.lineCap  =  'round';
      ctx.moveTo(0,0);
      ctx.rotate(pos);
      ctx.lineTo(0, -length);
      ctx.stroke();
      ctx.rotate(-pos);
    }

    function drawTime(ctx, radius) {
      var now = new Date();
      var hour = now.getHours();
      var minute = now.getMinutes();
      var second = now.getSeconds();

      hour = hour % 12;
      hour = (hour * Math.PI / 6) + (minute * Math.PI / (6 * 60)) + (second * Math.PI / (360 * 60));
      minute = (minute * Math.PI / 30) + (second * Math.PI / (30 * 60));
      second = (second * Math.PI / 30);

      drawHand(ctx, hour, radius * 0.5, radius * 0.07);
      drawHand(ctx, minute, radius * 0.8, radius * 0.07);
      drawHand(ctx, second, radius * 0.9, radius * 0.02);
    }

    radius = (canvas.height / 2) * 0.9;
    drawFace(ctx, radius);
    drawNumbers(ctx, radius);
    drawTime(ctx, radius);
  };

  WidgetClock.prototype.onResize = function() {
    if ( !this._$canvas ) {
      return;
    }

    var radius = Math.round(this._$canvas.height / 2);
    this._$context.translate(radius, radius);
  };

  /////////////////////////////////////////////////////////////////////////////
  // EXPORTS
  /////////////////////////////////////////////////////////////////////////////

  OSjs.Applications.CoreWM = OSjs.Applications.CoreWM || {};
  OSjs.Applications.CoreWM.Widgets = OSjs.Applications.CoreWM.Widgets || {};
  OSjs.Applications.CoreWM.Widgets.Clock = WidgetClock;

})(OSjs.Applications.CoreWM.Widget, OSjs.Utils, OSjs.API, OSjs.VFS, OSjs.GUI, OSjs.Core.Window);
