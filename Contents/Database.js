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


// Wraps the functions of the SQLite class and provides some extra functionalities:

// * Function to know if the database is already open
// * Commit / end transaction
// * Function to build an SQL query



function Database(iFilePath) {
	this.db = new SQLite();
	this.filePath = iFilePath;
	this.dbOpen = false;
		
	this.dateConstructor = (new Date()).constructor;
	this.arrayConstructor = (new Array()).constructor;
	
	this.transactionStarted = false;
	
	this.sqlResults = [];
}


Database.prototype.setFilePath = function(iFilePath) {
	this.filePath = iFilePath;
}


Database.prototype.getFilePath = function() {
	return this.filePath;
}


Database.prototype.beginTransaction = function() {
	if (!this.dbOpen) this.open();
	if (this.transactionStarted) return;
	
	this.db.exec("BEGIN TRANSACTION");
	this.transactionStarted = true;
}


Database.prototype.commitTransaction = function() {
	if (!this.dbOpen) return;
	if (!this.transactionStarted) return;
	
	this.db.exec("COMMIT TRANSACTION");
	this.transactionStarted = false;
}


Database.prototype.rollbackTransaction = function() {
	if (!this.dbOpen) return;
	if (!this.transactionStarted) return;
	
	this.db.exec("ROLLBACK TRANSACTION");
	this.transactionStarted = false;
}


Database.prototype.disposeAllResults = function() {
	for (var i = 0; i < this.sqlResults.length; i++) {
		var r = this.sqlResults[i];
		r.dispose();
	}
	this.sqlResults = [];
}


Database.prototype.isOpen = function() {
	return this.dbOpen;
}


Database.prototype.open = function() {
	if (this.filePath == undefined) throw "NoFileSpecified";
	if (this.dbOpen) return;
	
	try {
		this.db.open(this.filePath);
		this.dbOpen = true;
	} catch(e) {
		print("SQL error: " + e.errMsg);
	}
}


Database.prototype.close = function() {
	if (!this.dbOpen) return;
	
	if (this.transactionStarted) this.commitTransaction();
	
	try {
		this.db.close();
		this.dbOpen = false;
	} catch(e) {
		
		if (e.errCode == 5) { // Some queries have not been disposed
			this.disposeAllResults();
						
			try { // Now try to close it again
				this.db.close();
				this.dbOpen = false;
			} catch(e2) {
				print("SQL error: " + e2.errMsg);
			}
			
		} else {
			throw e;
		}
	}
	
	this.sqlResults = [];
}


Database.prototype.query = function(iSQL) {
	if (!this.dbOpen) throw "DatabaseNotOpened";
		
	var output;
	
	try {
		output = this.db.query(iSQL);
		this.sqlResults.push(output);
	} catch(e) {
		print("SQL ERROR: " + iSQL);
	}
	
	return output;
}


Database.prototype.exec = function(iSQL) {
	if (!this.dbOpen) {
		elog("exec() not possible. Database is not open. SQL: " + iSQL);
		throw "DatabaseNotOpened";
	}
				
	try {
		this.db.exec(iSQL);
	} catch(e) {
		print("SQL ERROR: " + iSQL);
		throw new "sqlError";
	}
}


Database.prototype.lastInsertRowID getter = function() {
	return this.db.lastInsertRowID;
}


Database.prototype.getLastInsertRowID = function() {
	return this.db.lastInsertRowID;
}


Database.prototype.getNumRowsAffected = function() {
	return this.db.numRowsAffected;
}


// The database must be open to call this method
Database.prototype.addField = function(iTableName, iFieldName, iFieldType) {
	
	//CREATE TEMPORARY TABLE TEMP_TABLE(ID, Name);
	//INSERT INTO TEMP_TABLE SELECT ID, Name FROM EventTypes;
	//DROP TABLE EventTypes;
	//CREATE TABLE EventTypes (NewField TEXT, ID INTEGER PRIMARY KEY, Name TEXT);
	//INSERT INTO EventTypes(ID, Name) SELECT ID, Name FROM TEMP_TABLE;
	//DROP TABLE TEMP_TABLE;
	
	//ID, Name
	//NewField TEXT, ID INTEGER PRIMARY KEY, Name TEXT
	
	
	var res = this.db.query("PRAGMA TABLE_INFO(" + iTableName + ")");
			
	var tableFields = [];
		
	var fieldAlreadyExists = false;
		
	while (true) {			
		var row = res.current();
		if (row == null) break;
		
		var fName = row["name"];
		var fType = row["type"];
		
		if (fName.toLowerCase() == iFieldName.toLowerCase()) {
			fieldAlreadyExists = true;
			break;
		}
		
		if (row["pk"] == 1) fType += " PRIMARY KEY";
					
		tableFields.push({ name:fName, type:fType });
								
		res.next();	
	}		
	
	res.dispose();
	
	if (fieldAlreadyExists) {
		print("The field '" + iFieldName + "' already exists.");
		return;
	}
	
	this.beginTransaction();
	
	var oldFieldStringNoType = "";
	
	for (var i = 0; i < tableFields.length; i++) {
		if (oldFieldStringNoType != "") oldFieldStringNoType += ", ";
		oldFieldStringNoType += tableFields[i].name;
	}
		
	tableFields.push({ name:iFieldName, type:iFieldType });
	
	var newFieldString = "";
	for (var i = 0; i < tableFields.length; i++) {
		if (newFieldString != "") newFieldString += ", ";
		newFieldString += tableFields[i].name + " " + tableFields[i].type;
	}

	var sql1 = "CREATE TEMPORARY TABLE TEMP_TABLE(" + oldFieldStringNoType + ")"
	var sql2 = "INSERT INTO TEMP_TABLE SELECT " + oldFieldStringNoType + " FROM " + iTableName;
	var sql3 = "DROP TABLE " + iTableName;
	var sql4 = "CREATE TABLE " + iTableName + " (" + newFieldString + ")";
	var sql5 = "INSERT INTO " + iTableName + "(" + oldFieldStringNoType + ") SELECT " + oldFieldStringNoType + " FROM TEMP_TABLE";
	var sql6 = "DROP TABLE TEMP_TABLE";
	
	try {
		this.db.exec(sql1);
		this.db.exec(sql2);
		this.db.exec(sql3);
		this.db.exec(sql4);
		this.db.exec(sql5);				
		this.db.exec(sql6);		
		
		this.commitTransaction();
	} catch(e) {
		this.rollbackTransaction();
		print("Error adding field to table: " + e.errCode + ": " + e.errMsg);		
	}
}


Database.prototype.convertToDbValue = function(iObject) {	
	if (iObject == undefined) return "null";
	
	if (typeof(iObject) == "boolean") return iObject ? 1 : 0;
	
	if (typeof(iObject) == "string") {
		if (iObject == "") return "null";
		return '"' + iObject + '"';
	}

	if (iObject.constructor == this.dateConstructor) return Number(iObject);
	
	if (iObject.constructor == this.arrayConstructor) {
		if (iObject.length <= 0) {
			return "null";
		} else {			
			return '"' + iObject.toString() + '"';
		}
	}
	return iObject;	
}



Database.prototype.buildSqlStatement = function(iType, iTableName, iValues, iConditions) {
	var output;
	
	switch (iType.toLowerCase()) {
		
		case "update":
		
			output = "UPDATE " + iTableName + " SET ";
			
			var setString = "";			
			for (var i in iValues) {
				if (setString != "") setString += ",";
				var v = iValues[i];
				setString += v[0] + "=" + this.convertToDbValue(v[1]);
			}
			
			var whereString = "";
			for (var i in iConditions) {
				if (whereString != "") whereString += " AND ";
				var c = iConditions[i];
				whereString += c[0] + "=" + this.convertToDbValue(c[1]);				
			}
			
			output += setString;
			
			if (whereString != "") output += " WHERE " + whereString;						
			
			output += ";";
			break;
			
		case "insert":
		
			output = "INSERT INTO " + iTableName;
			
			var columnString = "";
			var valueString = "";
			for (var i in iValues) {
				if (columnString != "") columnString += ",";
				if (valueString != "") valueString += ",";
				var v = iValues[i];
				columnString += v[0];
				valueString += this.convertToDbValue(v[1]);
			}
			
			output += "(" + columnString + ") VALUES (" + valueString + ");";
			break;
		
	}
	
	return output;
}