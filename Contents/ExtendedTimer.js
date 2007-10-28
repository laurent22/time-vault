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



function ExtendedTimer() {
	this._timer = new Timer();
	this._ticking = this._timer.ticking;
	this._interval = this._timer.interval;
	this._onTimerFired = this._timer.onTimerFired;
	this._fullcallback = undefined;
}


ExtendedTimer.prototype.dispose = function() {
	this.ticking = false;
	delete this._timer;
	this._timer = undefined;
}


ExtendedTimer.prototype.reset = function() {
	this._timer.reset();
}


ExtendedTimer.prototype.interval getter = function() {
	return this._timer.interval;
}


ExtendedTimer.prototype.interval setter = function(v) {
	this._timer.interval = v;
}


ExtendedTimer.prototype.ticking getter = function() {
	return this._timer.ticking;
}


ExtendedTimer.prototype.ticking setter = function(v) {
	this._timer.ticking = v;
}


ExtendedTimer.prototype.onTimerFired getter = function() {
	return this._timer.onTimerFired;
}


ExtendedTimer.prototype.onTimerFired setter = function(v) {
	var oType = typeof(v);
	
	if (oType == "function" || oType == "string") {
		this._timer.onTimerFired = v;
	} else {
		this._fullCallback = v;
		this._timer._owner = this;
		this._timer.onTimerFired = function() {
			var c = this._owner._fullCallback;
			c[0][c[1]]();						
		}
	}
}