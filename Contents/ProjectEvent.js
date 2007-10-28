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


ProjectEvent.prototype.id getter = function() { return this._id; }
ProjectEvent.prototype.id setter = function(v) { this._id = v; }

ProjectEvent.prototype.startDate getter = function() { return this._startDate; }
ProjectEvent.prototype.startDate setter = function(v) { this._startDate = v; }

ProjectEvent.prototype.endDate getter = function() { return this._endDate; }
ProjectEvent.prototype.endDate setter = function(v) { this._endDate = v; }

ProjectEvent.prototype.startDateUserString getter = function() {
	return Main.getNumericDate(this.startDate) + ", " + Main.getTimeString(this.startDate);
}

ProjectEvent.prototype.startDateExcelString getter = function() {
	return Main.getNumericDate(this.startDate) + " " + Main.getTimeString(this.startDate);
}

ProjectEvent.prototype.endDateExcelString getter = function() {
	return Main.getNumericDate(this.endDate) + " " + Main.getTimeString(this.endDate);
}

ProjectEvent.prototype.durationUserString getter = function() {
	return Main.getDurationString(this.duration);
}

ProjectEvent.prototype.durationExcelString getter = function() {
	return this.durationUserString;
}

// description is the task ID
ProjectEvent.prototype.description getter = function() {
	var n = Number(this._description);
	if (isNaN(n)) return 0;
	if (!this.project.hasPossibleTask(n)) return 0;
	return n;
}

ProjectEvent.prototype.description setter = function(v) {
	this._description = v;
//	if (this._description == undefined) this._description = "";
}


ProjectEvent.prototype.descriptionString getter = function() {
	var d = gDatabase.getTask(this.description);	
	if (d == undefined) return "";
	return d.description;
}


ProjectEvent.prototype.projectID getter = function() { return this._projectID; }
ProjectEvent.prototype.projectID setter = function(v) { this._projectID = v; }

ProjectEvent.prototype.project getter = function() {
	var p = gDatabase.getProject(this._projectID);
	
//	if (p == undefined) {
//		elog("ProjectEvent.project is undefined. Returning default project");
//		return gDatabase.getDefaultProject();
//	}
	
	return p;
}

ProjectEvent.prototype.duration getter = function() {
	if (this.endDate == undefined) {
		return (new Date()).getTime() - this.startDate.getTime();
	} else {
		return this.endDate.getTime() - this.startDate.getTime();
	}
}
ProjectEvent.prototype.duration setter = function(v) { elog("ProjectEvent.duration is read-only"); }


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