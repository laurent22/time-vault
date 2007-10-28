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


Puppeteer = {};


Puppeteer.currentAnimations = [];


Puppeteer.timer = new Timer();
Puppeteer.timer.ticking = false;
Puppeteer.timer.onTimerFired = function() {
	Puppeteer.timer_fired();
}


Puppeteer.MotionType = {
	linearTween : "linearTween",
	
	easeInQuad : "easeInQuad",
	easeOutQuad : "easeOutQuad",
	easeInOutQuad : "easeInOutQuad",
	
	easeInCubic : "easeInCubic",
	easeOutCubic : "easeOutCubic",
	easeInOutCubic : "easeInOutCubic",
	
	easeInQuart : "easeInQuart",
	easeOutQuart : "easeOutQuart",
	easeInOutQuart : "easeInOutQuart",
	
	easeInQuint : "easeInQuint",
	easeOutQuint : "easeOutQuint",
	easeInOutQuint : "easeInOutQuint",
	
	easeInSine : "easeInSine",
	easeOutSine : "easeOutSine",
	easeInOutSine : "easeInOutSine",
	
	easeInExpo : "easeInExpo",
	easeOutExpo : "easeOutExpo",
	easeInOutExpo : "easeInOutExpo",
	
	easeInCirc : "easeInCirc",
	easeOutCirc : "easeOutCirc",
	easeInOutCirc : "easeInOutCirc",
	
	easeInElastic : "easeInElastic", // doesn't work
	easeOutElastic : "easeOutElastic", // doesn't work
	easeInOutElastic : "easeInOutElastic", // doesn't work
	
	easeInBack : "easeInBack", // backtracking slightly, then reversing direction and moving to target
	easeOutBack : "easeOutBack",
	easeInOutBack : "easeInOutBack",
	
	easeInBounce : "easeInBounce",
	easeOutBounce : "easeOutBounce",
	easeInOutBounce : "easeInOutBounce"
}


// Some additional shortcuts
Puppeteer.MotionType.none = Puppeteer.MotionType.linearTween;
Puppeteer.MotionType.easeIn = Puppeteer.MotionType.easeInSine;
Puppeteer.MotionType.easeOut = Puppeteer.MotionType.easeOutSine;
Puppeteer.MotionType.easeInOut = Puppeteer.MotionType.easeInOutSine;


Puppeteer.EaseType = Puppeteer.MotionType;


Puppeteer.framePerSeconds setter = function(v) {
	this.timer.interval = 1 / v;
}


Puppeteer.framePerSeconds = 60;


Puppeteer.framePerSeconds getter = function() {
	return 1 / this.timer.interval;
}


Puppeteer.timer_fired = function() {
	this.processAnimations();
}


Puppeteer.processAnimations = function() {	
	
	for (var i = this.currentAnimations.length - 1; i >= 0; i--) {
		var a = this.currentAnimations[i];
						
		if (a.state == "killed") {
			
			this.currentAnimations.splice(i, 1);
			
		} else if (a.state == "done") {
			
			if (a.nextAnimation == undefined) {
				this.currentAnimations.splice(i, 1);
			} else {
				this.currentAnimations[i] = a.nextAnimation;
			}
			
		} else {
			
			if (a.state == "new") a.start();
			
			a.update();
		}
	}
	
	this.timer.ticking = this.currentAnimations.length > 0;
}


Puppeteer.start = function(iAnimations, iQueueAnimations) {
	if (iQueueAnimations == undefined) iQueueAnimations = false;
	if (!(iAnimations instanceof Array)) iAnimations = [iAnimations];
	
	if (iQueueAnimations) {
		for (var i = 0; i < iAnimations.length - 1; i++) {
			iAnimations[i].nextAnimation = iAnimations[i + 1];
			iAnimations[i].reset();
		}
		
		iAnimations[0].reset();
		this.currentAnimations.push(iAnimations[0]);
	} else {
		for (var i = 0; i < iAnimations.length; i++) {
			this.currentAnimations.push(iAnimations[i]);
			iAnimations[i].reset();
		}
	}
	
	this.processAnimations();
}


Puppeteer.applyMotionType = function(iMotion, iStart, iEnd, iPercent) {	
	if (iPercent >= 1.0) return iEnd;
	if (iPercent <= 0.0) return iStart;
	
	return EasingEquations[iMotion](iPercent, iStart, (iEnd - iStart), 1.0);	
}


Puppeteer.printStatus = function() {
	print("Number of running animations: " + this.currentAnimations.length);
}