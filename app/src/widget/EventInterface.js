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



function EventInterface() {
	
}


EventInterface.prototype.isRegistered = function(iObject) {
	if (this.register == undefined) return;
	
	for (var i in this.register) {
		var r = this.register[i];
		
		if (r.object == iObject) return true;
	}
	
	return false;
}


EventInterface.prototype.unregister = function(iObject) {
	if (this.register == undefined) return;
	
	for (var i = this.register.length - 1; i >= 0; i--) {
		var r = this.register[i];
		if (r.object == iObject) this.register.splice(i, 1);
	}
}


EventInterface.prototype.registerForEvents = function(iObject, iCallbackPrefix) {
	if (this.register == undefined) this.register = [];
	if (this.isRegistered(iObject)) return;
	
	if (iCallbackPrefix == undefined) iCallbackPrefix = "";	
	
	for (var i in this.register) {
		var r = this.register[i];
		
		if (r.object == iObject) {
			if (r.callbackPrefix == iCallbackPrefix) return;
		}
	}
	
	var o = {};
	o.object = iObject;
	o.callbackPrefix = iCallbackPrefix;
		
	this.register.push(o);
}


EventInterface.prototype.broadcastEvent = function(iSource, iEventName, iEventParam) {		
	if (this.register == undefined) return;
	
	for (var i in this.register) {
		var r = this.register[i];
		
		var o = r.object;
		var f = r.callbackPrefix + iEventName;
		var p = r.userParam;
		
		var functionToCall;
						
		if (o == undefined) {
			functionToCall = eval(f);						
			if (functionToCall != undefined) functionToCall(iSource, iEventParam);
		} else {
			functionToCall = o[f];
			if (functionToCall != undefined) o[f](iSource, iEventParam);
		}		
	}
}