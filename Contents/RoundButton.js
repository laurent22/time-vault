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


function RoundButton(iIconFile) {
	this.bgImage = new Image();
	this.bgImage.src = Main.skinFolder + "/RoundButtonBackground.png";
	
	this.aaClip = new Image();
	this.aaClip.src = Main.skinFolder + "/RoundButtonCenter.png";
	
	this.aaCanvas = new Canvas();
	
	this.iconImage = new Image();
	this.iconImage.src = iIconFile;
	
	this.frame = new Frame();
	
	this.frame.appendChild(this.bgImage);	
	this.frame.appendChild(this.aaCanvas);	
	this.frame.appendChild(this.iconImage);	
	
	this.frame.owner = this;
	this.frame.onMouseDown = function() { this.owner.onMouseDown(); }
	this.frame.onMouseUp = function() { this.owner.onMouseUp(); }
	this.frame.onClick = function() { this.owner.onClick(); }
	this.frame.onMouseDrag = function() { this.owner.onMouseDrag(); }
	
	this.flashingAnimation = new Puppeteer.Animation();
	this.flashingAnimation.duration = 700;
	this.flashingAnimation.onUpdate = [this, "flashingAnimation_update"];
	this.flashingAnimation.startValue = 0.0;
	this.flashingAnimation.endValue = 1.0;
	this.flashingAnimation.easeType = Puppeteer.EaseType.none;
	
	this.showAnimation = new Puppeteer.Animation();
	this.showAnimation.duration = 300;
	this.showAnimation.onUpdate = [this, "opacity"];
	this.showAnimation.startValue = 0;
	this.showAnimation.endValue = 255;
	this.showAnimation.easeType = Puppeteer.EaseType.none;

	this.flashingTimer = new ExtendedTimer();
	
	this.flashingTimer.ticking = false;
	this.flashingTimer.onTimerFired = [this, "flash"];
		
	this._grayscale = false;
	
	this.update();
}


includeFile("FrameWrapper.js");
RoundButton.prototype = new FrameWrapper();


RoundButton.prototype.show = function(iShow) {	
	if (iShow == undefined) iShow = true;
		
	this.showAnimation.startValue = this.opacity;
	
	if (iShow) {		
		this.showAnimation.endValue = 255;
	} else {
		this.showAnimation.endValue = 0;
	}

	Puppeteer.start(this.showAnimation);

	this.aaCanvas.opacity = 0;

	this.flashingTimer.ticking = iShow;
	this.flashingTimer.reset();
	this.flashingTimer.interval = 0.6;
}


RoundButton.prototype.hide = function() {
	this.show(false);
}


RoundButton.prototype.flashingAnimation_update = function(v) {
	if (v >= 0.5) {
		v = 1.0 - (v - 0.5) / 0.5;
	} else {
		v = v / 0.5;
	}
	
	var v = Math.sin(v * (Math.PI / 2));
		
	this.aaCanvas.opacity = v * 255;
}


RoundButton.prototype.flash = function(v) {
	this.flashingTimer.interval = 2.0;
	Puppeteer.start(this.flashingAnimation);
}


RoundButton.prototype.grayscale getter = function() {
	return this._grayscale;
}


RoundButton.prototype.grayscale setter = function(v) {
	if (v != this._grayscale) {
		this._grayscale = v;
		this.update();
	}
}


RoundButton.prototype.onMouseDown = function() {
	this.bgImage.colorize = "#666666";
	this.iconImage.vOffset = 1;
	this.bgImage.vOffset = 1;
	this.aaCanvas.vOffset = 1;
	this.broadcastEvent(this, "mouseDown", {});
}


RoundButton.prototype.onMouseUp = function() {
	this.bgImage.colorize = null;this.iconImage.vOffset = 0;
	this.bgImage.vOffset = 0;
	this.aaCanvas.vOffset = 0;
	this.broadcastEvent(this, "mouseUp", {});
}


RoundButton.prototype.onMouseDrag = function() {
	this.broadcastEvent(this, "mouseDrag", {});
}


RoundButton.prototype.onClick = function() {
	this.broadcastEvent(this, "clicked", {});
}


RoundButton.prototype.setIconImage = function(iFile) {
	this.iconImage.src = iFile;
}


RoundButton.prototype.update = function() {	
	this.aaCanvas.width = this.bgImage.width;
	this.aaCanvas.height = this.bgImage.height;
	
	var ctx = this.aaCanvas.getContext("2d");
		
	ctx.drawImage(this.aaClip, 0, 0);	
	
	ctx.globalCompositeOperation = "source-atop";
	
	var grad = ctx.createLinearGradient(0, 0, 0, this.aaCanvas.height);
	grad.addColorStop(0, setColorBrightness(preferences.glassColor2.value, 1.0));
	grad.addColorStop(1, setColorBrightness(preferences.glassColor1.value, 1.0));
//	grad.addColorStop(0, this.grayscale ? "#777777" : preferences.glassColor2.value);
//	grad.addColorStop(1, this.grayscale ? "#333333" : preferences.glassColor2.value);
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, this.aaCanvas.width, this.aaCanvas.height);
	
	//this.opacity = this.grayscale ? 0 : 255;
	
}