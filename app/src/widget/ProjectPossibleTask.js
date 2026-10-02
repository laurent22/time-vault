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



function ProjectPossibleTask() {
	this._id = undefined;
	this._projectID = undefined;
	this._description = undefined;
	this._disposed = undefined;
}


ProjectPossibleTask.prototype = new EventInterface();


Object.defineProperty(ProjectPossibleTask.prototype, "id", { get: function() { return this._id; }, configurable: true, enumerable: true });
Object.defineProperty(ProjectPossibleTask.prototype, "id", { set: function(v) { this._id = v; }, configurable: true, enumerable: true });


Object.defineProperty(ProjectPossibleTask.prototype, "description", { get: function() {return this._description; }, configurable: true, enumerable: true });
Object.defineProperty(ProjectPossibleTask.prototype, "description", { set: function(v) { this._description = v; }, configurable: true, enumerable: true });


ProjectPossibleTask.prototype.getEvents = function() {
	return gDatabase.getEventsFromTaskID(this.id);
}


Object.defineProperty(ProjectPossibleTask.prototype, "duration", { get: function() {
	var d = 0;
	var events = this.getEvents();
	for (var i = 0; i < events.length; i++) {
		var e = events[i];
		d += e.duration;
	}
	return d;	
}, configurable: true, enumerable: true });


Object.defineProperty(ProjectPossibleTask.prototype, "disposed", { get: function() { return this._disposed; }, configurable: true, enumerable: true });


ProjectPossibleTask.prototype.toString = function() {
	return this.description;
}


ProjectPossibleTask.prototype.save = function() {
	gDatabase.saveItem(this);
}


ProjectPossibleTask.prototype.dispose = function() {
	this._disposed = true;
	gDatabase.deleteItem(this);
}

