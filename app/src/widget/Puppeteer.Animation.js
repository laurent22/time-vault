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


Object.defineProperty(Puppeteer_Animation.prototype, "nextAnimation", { set: function(v) {
	this._nextAnimation = v;
}, configurable: true, enumerable: true });


Object.defineProperty(Puppeteer_Animation.prototype, "nextAnimation", { get: function() {
	return this._nextAnimation;
}, configurable: true, enumerable: true });


Puppeteer_Animation.prototype.reset = function() {
	this._state = "new";
}


Object.defineProperty(Puppeteer_Animation.prototype, "easeType", { get: function() {
	return this._motionType;
}, configurable: true, enumerable: true });


Object.defineProperty(Puppeteer_Animation.prototype, "easeType", { set: function(v) {
	this._motionType = v;
}, configurable: true, enumerable: true });


Object.defineProperty(Puppeteer_Animation.prototype, "motionType", { get: function() {
	return this._motionType;
}, configurable: true, enumerable: true });


Object.defineProperty(Puppeteer_Animation.prototype, "motionType", { set: function(v) {
	this._motionType = v;
}, configurable: true, enumerable: true });


Object.defineProperty(Puppeteer_Animation.prototype, "updater", { get: function() {
	return this._updater;
}, configurable: true, enumerable: true });


Object.defineProperty(Puppeteer_Animation.prototype, "updater", { set: function(v) {
	this._updater = v;
}, configurable: true, enumerable: true });


Object.defineProperty(Puppeteer_Animation.prototype, "onUpdate", { get: function() {
	return this._updater;
}, configurable: true, enumerable: true });


Object.defineProperty(Puppeteer_Animation.prototype, "onUpdate", { set: function(v) {
	this._updater = v;
}, configurable: true, enumerable: true });


Object.defineProperty(Puppeteer_Animation.prototype, "onDone", { get: function() {
	return this._onDoneHandler;
}, configurable: true, enumerable: true });


Object.defineProperty(Puppeteer_Animation.prototype, "onDone", { set: function(v) {
	this._onDoneHandler = v;
}, configurable: true, enumerable: true });


Object.defineProperty(Puppeteer_Animation.prototype, "startTime", { get: function() {
	return this._startTime;
}, configurable: true, enumerable: true });


Object.defineProperty(Puppeteer_Animation.prototype, "startValue", { set: function(v) {
	this._startValue = v;
}, configurable: true, enumerable: true });


Object.defineProperty(Puppeteer_Animation.prototype, "startValue", { get: function() {
	return this._startValue;
}, configurable: true, enumerable: true });


Object.defineProperty(Puppeteer_Animation.prototype, "endValue", { set: function(v) {
	this._endValue = v;
}, configurable: true, enumerable: true });


Object.defineProperty(Puppeteer_Animation.prototype, "endValue", { get: function() {
	return this._endValue;
}, configurable: true, enumerable: true });


Object.defineProperty(Puppeteer_Animation.prototype, "duration", { set: function(v) {
	this._duration = v;
}, configurable: true, enumerable: true });


Object.defineProperty(Puppeteer_Animation.prototype, "duration", { get: function() {
	return this._duration;
}, configurable: true, enumerable: true });


Object.defineProperty(Puppeteer_Animation.prototype, "state", { get: function() {
	return this._state;
}, configurable: true, enumerable: true });


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