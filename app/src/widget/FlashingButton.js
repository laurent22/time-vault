/*
    This script is part of the "Time Vault" Widget
    
    Copyright (C) 2008 Laurent Cozic

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program; if not, write to the Free Software
    Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
    
    -------------------------------------------------------------------------
*/


includeFile("FrameWrapper.js");


function FlashingButton(iImageFile) {
	this.img = new Image();
	this.img.src = iImageFile;
	this.img.__initialWidth = this.img.width;
	this.img.__initialHeight = this.img.height;
	
	this.vAlign = "center";
	this.hAlign = "center";
	
	this.appendChild(this.img);
	
	this.enableEvent("onMouseDown");
	this.enableEvent("onMouseUp");
	this.enableEvent("onClick");
	this.enableEvent("onMouseEnter");
	
	this.flashingAnimation = new Puppeteer.Animation();
	this.flashingAnimation.duration = 500;
	this.flashingAnimation.onUpdate = [this, "flashingAnimation_update"];
	this.flashingAnimation.startValue = 0.0;
	this.flashingAnimation.endValue = 1.0;
	this.flashingAnimation.easeType = Puppeteer.EaseType.none;
	
	this.flashingTimer = new ExtendedTimer();
	this.flashingTimer.interval = 5.0;
	this.flashingTimer.ticking = true;
	this.flashingTimer.onTimerFired = [this, "flash"];
}


FlashingButton.prototype = new FrameWrapper();


Object.defineProperty(FlashingButton.prototype, "imageFile", { set: function(v) { this.img.src = v; }, configurable: true, enumerable: true });
Object.defineProperty(FlashingButton.prototype, "imageFile", { get: function() { return this.img.src; }, configurable: true, enumerable: true });


FlashingButton.prototype.flash = function() {
	Puppeteer.start(this.flashingAnimation);
}


FlashingButton.prototype.flashingAnimation_update = function(v) {
	if (v >= 0.5) {
		v = 1.0 - (v - 0.5) / 0.5;
	} else {
		v = v / 0.5;
	}
	
	v = 1.0 - v;
	
	var p = 0.8;
	
	this.img.width = this.img.__initialWidth * p + (this.img.__initialWidth * (1.0 - p)) * v;
	this.img.height = this.img.__initialHeight * p + (this.img.__initialHeight * (1.0 - p)) * v;
}


FlashingButton.prototype.onMouseEnter = function() {
	
}


FlashingButton.prototype.onMouseDown = function() {
	this.img.colorize = "#444444";
	this.img.vOffset = 2;
}


FlashingButton.prototype.onMouseUp = function() {
	this.img.colorize = null;
	this.img.vOffset = 0;
}


FlashingButton.prototype.onClick = function() {
	this.broadcastEvent(this, "clicked", {});
	
	
}
