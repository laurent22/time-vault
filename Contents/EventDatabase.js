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



const DEFAULT_DATABASE_STRING = "____default____";


function EventDatabase() {
	var dbFile = Main.dataFolder + "/" + DATABASE_FILENAME;
	
	this.db = new Database(dbFile);
	
	if (!filesystem.itemExists(dbFile)) {
		try {
			ilog("Creating new database...");
			
			this.db.open();
			
			var r = "CREATE TABLE DatabaseVersion (";
			r += "DatabaseVersion TEXT);";
			this.db.exec(r);		
			
			this.db.exec("INSERT INTO DatabaseVersion	(DatabaseVersion) VALUES (1.0)");
			
			r = "CREATE TABLE Projects (";
			r += "ID INTEGER PRIMARY KEY, ";
			r += "Name TEXT);";						
			this.db.exec(r);					
			
			this.db.exec('INSERT INTO Projects (Name) VALUES ("' + DEFAULT_DATABASE_STRING + '")');
			
			r = "CREATE TABLE Events (";
			r += "ID INTEGER PRIMARY KEY, ";
			r += "ProjectID NUMERIC,";
			r += "StartDate TEXT,";
			r += "EndDate TEXT,";
			r += "Description TEXT);";
			this.db.exec(r);	
			
			this.db.close();
		} catch(e) {
			elog(konErrorToString(e));
		}			
	}	
	
	
		
	this.projects = [];
	this.events = [];
	this.possibleTasks = [];
	
	
	try {
		this.db.open();	
		
		
		var existingDatabaseVersions = ["1.0", "1.1", "1.2", "1.3", "1.4", "1.5"];
		var lastDatabaseVersion = existingDatabaseVersions[existingDatabaseVersions.length - 1];		
		
		// ****** Get current database version
				
		var databaseVersion = "0.0";
		
		res = this.db.query("select * from DatabaseVersion");
								
		var row = res.current();
		if (row != null) databaseVersion = row["DatabaseVersion"];
												
		res.dispose();
		
		ilog("Current database version: " + databaseVersion);
				
		// ****** Upgrade the database if necessary
		
		var currentVersionIndex;
		
		for (var i = 0; i < existingDatabaseVersions.length; i++) {
			var v = existingDatabaseVersions[i];
			if (v == databaseVersion) {
				currentVersionIndex = i;
				break;
			}
		}		
		
		while (currentVersionIndex < existingDatabaseVersions.length - 1) {		
			var targetVersion = existingDatabaseVersions[currentVersionIndex + 1];
			
			ilog("Converting database to version " + targetVersion);

			switch (targetVersion) {
				
				case "1.1":
				
					r = "CREATE TABLE EventAutoSave (";
					r += "ProjectID NUMERIC,";
					r += "StartDate TEXT,";
					r += "Duration TEXT,";
					r += "Description TEXT);";
					this.db.exec(r);
					
					break;
					
				case "1.2":
				
					r = "CREATE TABLE ProjectPossibleTasks (";
					r += "ID INTEGER PRIMARY KEY,";
					r += "ProjectID NUMERIC,";
					r += "Description TEXT);"
					this.db.exec(r);
					
					break;

				case "1.3":
				
					this.db.addField("Projects", "TimeBudget", "NUMERIC");					
					this.db.addField("Projects", "RatePerHour", "TEXT");
					this.db.addField("Projects", "Notes", "TEXT");
					break;
					
				case "1.4":
				
					this.db.addField("Projects", "CreatedDate", "TEXT");
					break;
					
				case "1.5":
				
					this.db.addField("Projects", "Archived", "NUMERIC");
					break;
					
			}
			
			this.db.exec("UPDATE DatabaseVersion SET DatabaseVersion = " + targetVersion);
			
			ilog("Database was successfully converted to version " + targetVersion);
			
			currentVersionIndex++;						
		}
		
		
		
		var rows = this.db.query("SELECT * FROM Projects");
		
		while (true) {
			var row = rows.current();
			if (row == null) break;
			
			var project = this.createProject();
			
			project.id = row.ID;
			project.name = row.Name;
			project.notes = row.Notes;
			project.ratePerHour = row.RatePerHour;
			project.timeBudget = row.TimeBudget;
			project.archived = row.Archived == 1;
			
			var createdDate = row.CreatedDate;
			if (createdDate != "" && createdDate != null) project.createdDate = new Date(Number(row.CreatedDate));
			
			this.projects.push(project);
			
			rows.next();		
		}
		
		rows.dispose();
		
		
		
		rows = this.db.query("SELECT * FROM Events");
		
		while (true) {
			var row = rows.current();
			if (row == null) break;
			
			var event = this.createEvent();
			
			event.id = row.ID;
			event.startDate = new Date(Number(row.StartDate));
			event.endDate = new Date(Number(row.EndDate));
			event.description = row.Description;
			event.projectID = row.ProjectID;
						
			this.events.push(event);
			
			rows.next();		
		}
		
		
		rows = this.db.query("SELECT * FROM ProjectPossibleTasks");
		
		while (true) {
			var row = rows.current();
			if (row == null) break;
			
			var t = this.createPossibleTask();
			
			t.id = row.ID;
			t.description = row.Description;
			t.projectID = row.ProjectID;
			
			this.possibleTasks.push(t);
			
			rows.next();		
		}
		
	} catch(e) {
		elog(konErrorToString(e));
	}			
	
	this.sortEvents();
	this.sortProjects();
	this.sortPossibleTasks();
	
}


EventDatabase.prototype = new EventInterface();



EventDatabase.prototype.sortEvents = function() {
	
	function compareEvents(a, b) {
		if (a.startDate.getTime() < b.startDate.getTime()) return -1;
		if (a.startDate.getTime() > b.startDate.getTime()) return +1;
		return 0;
	}
	
	this.events.sort(compareEvents);
}


EventDatabase.prototype.sortProjects = function() {
	
	function compareProjects(a, b) {
		var x = a.name.toLowerCase();
		var y = b.name.toLowerCase();
		
		if (x < y) return -1;
		if (x > y) return +1;
		return 0;
	}
	
	this.projects.sort(compareProjects);
}


EventDatabase.prototype.sortPossibleTasks = function() {
	
	function comparePossibleTasks(a, b) {
		var x = a.description.toLowerCase();
		var y = b.description.toLowerCase();
		
		if (x < y) return -1;
		if (x > y) return +1;
		return 0;
	}
	
	this.possibleTasks.sort(comparePossibleTasks);
}


EventDatabase.prototype.getEventsFromTaskID = function(iID) {
	var output = [];
	for (var i = 0; i < this.events.length; i++) {
		var e = this.events[i];
		
		if (e.description == iID) output.push(e);
	}	
	
	return output;
}


EventDatabase.prototype.onPossibleTaskCollectionChanged = function(iSource, iParam) {
	this.broadcastEvent(iSource, "possibleTaskCollectionChanged", iParam);
}


EventDatabase.prototype.onEventCollectionChanged = function(iSource, iParam) {
	this.broadcastEvent(iSource, "eventCollectionChanged", iParam);
}


EventDatabase.prototype.onProjectCollectionChanged = function(iSource, iParam) {
	this.broadcastEvent(iSource, "projectCollectionChanged", iParam);
}


EventDatabase.prototype.addEvent = function(e) {
	this.events.push(e);
	this.sortEvents();
	this.onEventCollectionChanged(this, { events:[e] });
}


EventDatabase.prototype.addProject = function(p) {
	this.projects.push(p);
	this.sortProjects();
	this.onProjectCollectionChanged(this, { projects:[p] });
}


EventDatabase.prototype.addPossibleTask = function(t) {
	this.possibleTasks.push(t);
	this.sortPossibleTasks();
	this.onPossibleTaskCollectionChanged(this, { possibleTasks:[t] });
}


EventDatabase.prototype.createEvent = function() {
	var e = new ProjectEvent();
	e.projectID = Number(preferences.lastSelectedProject.value);
	e.startDate = new Date();
	return e;
}


EventDatabase.prototype.createProject = function() {
	return new Project();
}


EventDatabase.prototype.createPossibleTask = function(iProject) {
	var t = new ProjectPossibleTask();
	if (iProject != undefined) t.projectID = iProject.id;
	return t;
}


EventDatabase.prototype.getAutoSavedEvent = function() {
	var output;
	
	var hasOpenDB = false;	
	
	try {
		if (!this.db.isOpen()) {
			this.db.open();
			hasOpenDB = true;
		}
		
		
		var e = this.createEvent();
		
		var rows = this.db.query("SELECT * FROM EventAutoSave");
		
		var row = rows.current();
		rows.dispose();
		
		if (row != null) {
			output = this.createEvent();
			output.startDate = new Date(Number(row["StartDate"]));
			output.endDate = new Date(output.startDate.getTime() + Number(row["Duration"]));
			output.projectID = Number(row["ProjectID"])
		}
		
		if (hasOpenDB) this.db.close();
	} catch(e) {
		if (hasOpenDB) this.db.close();
		elog(konErrorToString(e));
	}	
	
	return output;	
}


EventDatabase.prototype.makeEventAutoSave = function(iEvent) {
	var hasOpenDB = false;	
	
	try {
		if (!this.db.isOpen()) {
			this.db.open();
			hasOpenDB = true;
		}
		
		
		this.clearEventAutoSave();

		var values = [];
			
		values.push(["StartDate", iEvent.startDate.getTime().toString()]);
		values.push(["Duration", iEvent.duration ]);
		values.push(["ProjectID", iEvent.projectID]);
		values.push(["Description", iEvent.description]);
				
		sql = this.db.buildSqlStatement("INSERT", "EventAutoSave", values);
			
		this.db.exec(sql);
		
		
		
		if (hasOpenDB) this.db.close();
	} catch(e) {
		if (hasOpenDB) this.db.close();
		elog(konErrorToString(e));
	}		
}


EventDatabase.prototype.clearEventAutoSave = function(iEvent) {
	var hasOpenDB = false;	
	
	try {
		if (!this.db.isOpen()) {
			this.db.open();
			hasOpenDB = true;
		}
		
			
		this.db.exec("DELETE FROM EventAutoSave");
		
		
		
		if (hasOpenDB) this.db.close();
	} catch(e) {
		if (hasOpenDB) this.db.close();
		elog(konErrorToString(e));
	}		
}


EventDatabase.prototype.getEventsFromProjectID = function(iProjectID) {
	var output = [];
	for (var i = 0; i < this.events.length; i++) {
		var e = this.events[i];
		if (e.projectID == iProjectID) output.push(e);
	}
	return output;	
}


EventDatabase.prototype.getPossibleTasksFromProjectID = function(iProjectID) {
	var output = [];
	for (var i = 0; i < this.possibleTasks.length; i++) {
		var e = this.possibleTasks[i];
		if (e.projectID == iProjectID) output.push(e);
	}
	return output;	
}


EventDatabase.prototype.getDefaultProject = function() {
	if (this.projects.length == 0) return null;
	
	for (var i = 0; i < this.projects.length; i++) {
		if (!this.projects[i].archived) return this.projects[i];
	}
	
//	for (var i = 0; i < this.projects.length; i++) {
//		var p = this.projects[i];
//		if (p.id == 1) return p;
//	}
}


EventDatabase.prototype.getTask = function(iID) {
	for (var i = 0; i < this.possibleTasks.length; i++) {
		var p = this.possibleTasks[i];
		if (p.id == iID) return p;
	}
}


EventDatabase.prototype.getProject = function(iID) {
	for (var i = 0; i < this.projects.length; i++) {
		var p = this.projects[i];
		if (p.id == iID) return p;
	}
}


EventDatabase.prototype.isValidProjectID = function(iID) {
	for (var i = 0; i < this.projects.length; i++) {
		var p = this.projects[i];
		if (p.id == iID) return true;
	}
	return false;
}


EventDatabase.prototype.getProjects = function() {
	return this.projects;
}



EventDatabase.prototype.onItemSaved = function(iSource, iParam) {
	this.broadcastEvent(iSource, "itemSaved", iParam);
}


EventDatabase.prototype.deleteItem = function(iItem) {
	var hasOpenDB = false;	
	
	
	if (iItem.id != undefined) {
	
		try {
			if (!this.db.isOpen()) {
				this.db.open();
				hasOpenDB = true;
			}
			
			
			var sql = "";
			
			if (iItem instanceof Project) {
				
				sql = "DELETE FROM Projects WHERE ID = " + iItem.id;
				
			} else if (iItem instanceof ProjectEvent) {		
				
				sql = "DELETE FROM Events WHERE ID = " + iItem.id;
				
			} else if (iItem instanceof ProjectPossibleTask) {		
				
				sql = "DELETE FROM ProjectPossibleTasks WHERE ID = " + iItem.id;
				
			}
			
			
			this.db.exec(sql);
			
			
			if (iItem instanceof Project) {
				sql = "DELETE FROM Events WHERE ProjectID = " + iItem.id;
				this.db.exec(sql);
				sql = "DELETE FROM ProjectPossibleTasks WHERE ProjectID = " + iItem.id;
				this.db.exec(sql);
			} if (iItem instanceof ProjectPossibleTask) {
				sql = "DELETE FROM Events WHERE Description = " + iItem.id;
				this.db.exec(sql);
			}
			
			
			if (hasOpenDB) this.db.close();
		} catch(e) {
			if (hasOpenDB) this.db.close();
			elog(konErrorToString(e));
			return;
		}				
		
	}
	
	
	var itemList;
	
	if (iItem instanceof Project) {
		
		itemList = this.projects;
		
	} else if (iItem instanceof ProjectEvent) {		
		
		itemList = this.events;
		
	}	else if (iItem instanceof ProjectPossibleTask) {		
		
		itemList = this.possibleTasks;
		
	}
		


	if (iItem instanceof Project) {
		
		for (var i = this.events.length - 1; i >= 0; i--) {
			var e = this.events[i];
			if (e.projectID == iItem.id) this.events.splice(i, 1);
		}		
		
		for (var i = this.possibleTasks.length - 1; i >= 0; i--) {
			var e = this.possibleTasks[i];
			if (e.projectID == iItem.id) this.possibleTasks.splice(i, 1);
		}					
		
	} else if (iItem instanceof ProjectEvent) {
		
		
	} else if (iItem instanceof ProjectPossibleTask) {
		
		for (var i = this.events.length - 1; i >= 0; i--) {
			var e = this.events[i];
			if (e.description == iItem.id) this.events.splice(i, 1);
		}				
		
	}
	
	
	
	for (var i = 0; i < itemList.length; i++) {
		var it = itemList[i];
		
		if (it == iItem) {
			itemList.splice(i, 1);
			break;
		}
	}
	
	
	if (iItem instanceof Project) {
		
		this.onProjectCollectionChanged(this, { projects:[iItem] });
		
	} else if (iItem instanceof ProjectEvent) {
		
		this.onEventCollectionChanged(this, { events:[iItem] });
		
	} else if (iItem instanceof ProjectPossibleTask) {
		
		this.onPossibleTaskCollectionChanged(this, { possibleTasks:[iItem] });
		
	}
	
	
}


//EventDatabase.prototype.onItemDeleted = function(iSource, iParam) {
//	this.broadcastEvent(this, "itemDeleted", iParam);
//}


EventDatabase.prototype.saveItem = function(iItem) {
	var hasOpenDB = false;	
	
	try {
		if (!this.db.isOpen()) {
			this.db.open();
			hasOpenDB = true;
		}
		
		var doSave = true;

		var values = [];
		var tableName = "";
		
		if (iItem instanceof Project) {
			
			var createdDate = iItem.createdDate;
			if (createdDate == null) iItem.createdDate = new Date();
			
			values.push(["Name", iItem.name]);
			values.push(["Notes", iItem.notes]);
			values.push(["RatePerHour", iItem.ratePerHour]);
			values.push(["TimeBudget", iItem.timeBudget]);
			values.push(["CreatedDate", iItem.createdDate.getTime().toString()]);
			values.push(["Archived", iItem.archived ? 1 : 0]);
			
			tableName = "Projects";
			
		} else if (iItem instanceof ProjectEvent) {
			
			values.push(["StartDate", iItem.startDate.getTime().toString()]);
			values.push(["EndDate", iItem.endDate.getTime().toString()]);
			values.push(["ProjectID", iItem.projectID]);
			values.push(["Description", iItem.description]);			
			
			tableName = "Events";						
		
		} else if (iItem instanceof ProjectPossibleTask) {
			
			values.push(["Description", iItem.description]);
			values.push(["ProjectID", iItem.projectID]);
			
			tableName = "ProjectPossibleTasks";	
			
		}
			
		
		if (doSave) {
			
			var sql = "";
			
			if (iItem.id == undefined) {
				
				sql = this.db.buildSqlStatement("INSERT", tableName, values);
								
			} else {
				
				sql = this.db.buildSqlStatement("UPDATE", tableName, values, [["ID", iItem.id]]);
				
			}
			
			this.db.exec(sql);
			
			
			
			if (iItem.id == undefined) iItem.id = this.db.getLastInsertRowID();
			
			
			if (iItem instanceof Project) {
				
				this.onProjectCollectionChanged(this, { projects:[iItem] });
				
			} else if (iItem instanceof ProjectEvent) {
				
				this.onEventCollectionChanged(this, { events:[iItem] });
				
			} else if (iItem instanceof ProjectPossibleTask) {
				
				this.onPossibleTaskCollectionChanged(this, { possibleTasks:[iItem] });			
			
			}
			
		}
		
		
		if (hasOpenDB) this.db.close();
		
	} catch(e) {
		
		if (hasOpenDB) this.db.close();
		elog(konErrorToString(e));
		
	}	
	
	
	
}