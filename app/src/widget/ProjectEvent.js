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


function ProjectEvent() {
	this._id = undefined;
	this._startDate = undefined;
	this._endDate = undefined;
	this._description = "";
	this._projectID = 1;
}


ProjectEvent.prototype = new EventInterface();


Object.defineProperty(ProjectEvent.prototype, "id", { get: function() { return this._id; }, configurable: true, enumerable: true });
Object.defineProperty(ProjectEvent.prototype, "id", { set: function(v) { this._id = v; }, configurable: true, enumerable: true });

Object.defineProperty(ProjectEvent.prototype, "startDate", { get: function() { return this._startDate; }, configurable: true, enumerable: true });
Object.defineProperty(ProjectEvent.prototype, "startDate", { set: function(v) { this._startDate = v; }, configurable: true, enumerable: true });

Object.defineProperty(ProjectEvent.prototype, "endDate", { get: function() { return this._endDate; }, configurable: true, enumerable: true });
Object.defineProperty(ProjectEvent.prototype, "endDate", { set: function(v) { this._endDate = v; }, configurable: true, enumerable: true });

Object.defineProperty(ProjectEvent.prototype, "startDateUserString", { get: function() {
	return Main.getNumericDate(this.startDate) + ", " + Main.getTimeString(this.startDate);
}, configurable: true, enumerable: true });

Object.defineProperty(ProjectEvent.prototype, "startDateExcelString", { get: function() {
	return Main.getNumericDate(this.startDate) + " " + Main.getTimeString(this.startDate);
}, configurable: true, enumerable: true });

Object.defineProperty(ProjectEvent.prototype, "endDateExcelString", { get: function() {
	return Main.getNumericDate(this.endDate) + " " + Main.getTimeString(this.endDate);
}, configurable: true, enumerable: true });

Object.defineProperty(ProjectEvent.prototype, "durationUserString", { get: function() {
	return Main.getDurationString(this.duration);
}, configurable: true, enumerable: true });

Object.defineProperty(ProjectEvent.prototype, "durationExcelString", { get: function() {
	return this.durationUserString;
}, configurable: true, enumerable: true });

// description is the task ID
Object.defineProperty(ProjectEvent.prototype, "description", { get: function() {
	var n = Number(this._description);
	if (isNaN(n)) return 0;
	if (!this.project.hasPossibleTask(n)) return 0;
	return n;
}, configurable: true, enumerable: true });

Object.defineProperty(ProjectEvent.prototype, "description", { set: function(v) {
	this._description = v;
//	if (this._description == undefined) this._description = "";
}, configurable: true, enumerable: true });


Object.defineProperty(ProjectEvent.prototype, "descriptionString", { get: function() {
	var d = gDatabase.getTask(this.description);	
	if (d == undefined) return "";
	return d.description;
}, configurable: true, enumerable: true });


Object.defineProperty(ProjectEvent.prototype, "projectID", { get: function() { return this._projectID; }, configurable: true, enumerable: true });
Object.defineProperty(ProjectEvent.prototype, "projectID", { set: function(v) { this._projectID = v; }, configurable: true, enumerable: true });

Object.defineProperty(ProjectEvent.prototype, "project", { get: function() {
	var p = gDatabase.getProject(this._projectID);
	
//	if (p == undefined) {
//		elog("ProjectEvent.project is undefined. Returning default project");
//		return gDatabase.getDefaultProject();
//	}
	
	return p;
}, configurable: true, enumerable: true });

Object.defineProperty(ProjectEvent.prototype, "duration", { get: function() {
	if (this.endDate == undefined) {
		return (new Date()).getTime() - this.startDate.getTime();
	} else {
		return this.endDate.getTime() - this.startDate.getTime();
	}
}, configurable: true, enumerable: true });
Object.defineProperty(ProjectEvent.prototype, "duration", { set: function(v) { elog("ProjectEvent.duration is read-only"); }, configurable: true, enumerable: true });


ProjectEvent.prototype.load = function(iID) {
	var hasOpenDB = false;	
	
	try {
		if (!gDatabase.isOpen()) {
			gDatabase.open();
			hasOpenDB = true;
		}
		
		
		
		if (hasOpenDB) gDatabase.close();
	} catch(e) {
		if (hasOpenDB) gDatabase.close();
		elog(konErrorToString(e));
	}
	
}


ProjectEvent.prototype.save = function() {
	gDatabase.saveItem(this);	
}


ProjectEvent.prototype.dispose = function() {
	gDatabase.deleteItem(this);	
}


ProjectEvent.prototype.toString = function() {
	return "[Event] " + this.startDate + " (" + this.durationUserString + ")";
}