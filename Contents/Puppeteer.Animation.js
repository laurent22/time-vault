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


function Puppeteer_Animation() {
	this._updater = undefined;
	this._startTime = undefined;
	this._duration = 2000;
	this._interval = 5;
	this._startValue = 0.0;
	this._endValue = 1.0;
	this._nextAnimation = undefined;
	this._onDoneHandler = undefined;
	this._motionType = Puppeteer.MotionType.none;
	this._state = "new";
}


Puppeteer_Animation.prototype.nextAnimation setter = function(v) {
	this._nextAnimation = v;
}


Puppeteer_Animation.prototype.nextAnimation getter = function() {
	return this._nextAnimation;
}


Puppeteer_Animation.prototype.reset = function() {
	this._state = "new";
}


Puppeteer_Animation.prototype.easeType getter = function() {
	return this._motionType;
}


Puppeteer_Animation.prototype.easeType setter = function(v) {
	this._motionType = v;
}


Puppeteer_Animation.prototype.motionType getter = function() {
	return this._motionType;
}


Puppeteer_Animation.prototype.motionType setter = function(v) {
	this._motionType = v;
}


Puppeteer_Animation.prototype.updater getter = function() {
	return this._updater;
}


Puppeteer_Animation.prototype.updater setter = function(v) {
	this._updater = v;
}


Puppeteer_Animation.prototype.onUpdate getter = function() {
	return this._updater;
}


Puppeteer_Animation.prototype.onUpdate setter = function(v) {
	this._updater = v;
}


Puppeteer_Animation.prototype.onDone getter = function() {
	return this._onDoneHandler;
}


Puppeteer_Animation.prototype.onDone setter = function(v) {
	this._onDoneHandler = v;
}


Puppeteer_Animation.prototype.startTime getter = function() {
	return this._startTime;
}


Puppeteer_Animation.prototype.startValue setter = function(v) {
	this._startValue = v;
}


Puppeteer_Animation.prototype.startValue getter = function() {
	return this._startValue;
}


Puppeteer_Animation.prototype.endValue setter = function(v) {
	this._endValue = v;
}


Puppeteer_Animation.prototype.endValue getter = function() {
	return this._endValue;
}


Puppeteer_Animation.prototype.duration setter = function(v) {
	this._duration = v;
}


Puppeteer_Animation.prototype.duration getter = function() {
	return this._duration;
}


Puppeteer_Animation.prototype.state getter = function() {
	return this._state;
}


Puppeteer_Animation.prototype.update = function() {
	
	
	function doCallback(iCallback, iValue, iSource) {
		if (iCallback == undefined) return;
		
		if (iCallback instanceof Array) {
			
			var o = iCallback[0];
			var m = iCallback[1];
			
			if (typeof(o[m]) == "function") {
				o[m](iValue, iSource);
			} else {
				o[m] = iValue;
			}
			
		} else if (typeof(iCallback) == "string"){
			
			Puppeteer_Animation.__globalScope[iCallback](iValue, iSource);
			
		} else if (typeof(iCallback) == "function"){
			
			iCallback(iValue, iSource);
			
		}		
	}
	
	
	var now = (new Date()).getTime();
	var p = (now - this.startTime) / this.duration;
		
	if (p >= 1.0) {
		p = 1.0;
		this._startTime = undefined;
		this._state = "done";
				
		doCallback(this._onDoneHandler, undefined, this);
	}
	
	var newValue;
	
	if (this.startValue instanceof Array) {
		newValue = [];
		for (var i = 0; i < this.startValue.length; i++) {
			var v = Puppeteer.applyMotionType(this.motionType, this.startValue[i], this.endValue[i], p);
			newValue.push(v);
		}
	} else {
		newValue = Puppeteer.applyMotionType(this.motionType, this.startValue, this.endValue, p);
	}
			
	doCallback(this.updater, newValue, this);
}


Puppeteer_Animation.prototype.start = function() {
	this._startTime = (new Date()).getTime();
	this._state = "running";
}


Puppeteer_Animation.prototype.kill = function() {	
	this._state = "killed";
}



Puppeteer_Animation.__globalScope = this;

var puppeteerNameSpace = this["Puppeteer"];
if (puppeteerNameSpace == undefined) {
	this["Puppeteer"] = {};
}

Puppeteer.Animation = Puppeteer_Animation;