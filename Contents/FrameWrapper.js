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


// This class wraps the methods of a Frame so that it can be inherited

function FrameWrapper() {
	this.frame = new Frame();
}

if (EventInterface == undefined) {
	
} else {
	// If an event interface is defined, FrameWrapper will inherit from it
	FrameWrapper.prototype = new EventInterface();
}

var propertyNames = ["nextSibling", "previousSibling", "opacity", "parentNode", "style", "subviews", "superview", "tooltip", "tracking", "vAlign", "visible", "vOffset", "width", "window", "zOrder", "tracking", "contextMenuItems", "hAlign", "height", "hOffset", "id", "firstChild", "lastChild", "name"];
//"onClick", "onContextMenu", "onDragDrop", "onDragEnter", "onDragExit", "onMouseDown", "onMouseDrag", "onMouseEnter", "onMouseExit", "onMouseMove", "onMouseUp", "onMouseWheel", "onMultiClick", 
function appendMember(iName) {
	var s = function(v) { this.frame[iName] = v; }
	var g = function() { return this.frame[iName]; }
	
	FrameWrapper.prototype[iName] setter = s;
	FrameWrapper.prototype[iName] getter = g;	
}

for (var i = 0; i < propertyNames.length; i++) {
	var n = propertyNames[i];	
	appendMember(n);
}


FrameWrapper.prototype.appendChild = function(v) {
	if (v instanceof FrameWrapper) {
		this.frame.appendChild(v.frame);	
	} else {
		this.frame.appendChild(v);
	}
}


FrameWrapper.prototype.removeFromSuperview = function() { this.frame.removeFromSuperview(); }
FrameWrapper.prototype.orderAbove = function(v) { this.frame.orderAbove(v); }
FrameWrapper.prototype.orderBelow = function(v) { this.frame.orderBelow(v); }


FrameWrapper.prototype.enableEvent = function(iEventName) {
	this.frame.frameWrapperObject = this;
	this.frame[iEventName] = function() {
		this.frameWrapperObject[iEventName]();
	}
}


FrameWrapper.prototype.disableEvent = function(iEventName) {
	this.frame[iEventName] = null;
}