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

function konErrorToString(iID) {	
	var sourceName = undefined;
	
	var iMessage = "";
	var e = iID;
	
	if (typeof(iID) == "object") {		
		if (e.errCode != undefined) { // Wrap the SQLiteError objects
			sourceName = "SQLite Exception";
			iID = e.errCode;
			iMessage = e.errMsg;
		} else {
			if (e.name != undefined) { // Wrap the standard Konfabulator exceptions
				sourceName = "Script Exception"
				iID = e.name;
				iMessage = e.message + " (" + e.fileName + ": Line " + e.lineNumber + ")";
			} else {
				sourceName = e.sourceName;
				iID = e.getID();
				iMessage = e.getMessage();			
			}
		}
	}	
	
//	if (sourceName == undefined) {
//		return iID.toString();
//	} else {
		return sourceName + " (" + iID + ") : " + iMessage;
//	}
}



function getSafeFilename(iString) {
	var output = "";
	var badChars = '\\/:*?"<>|';
	for (var i = 0; i < iString.length; i++) {
		var c = iString.charAt(i);
		if (badChars.indexOf(c) >= 0) {
			output += "-";
		} else {
			output += c;
		}
	}	
	return output;
}


String.prototype.toTitleCase = function() {
	return this[0].toUpperCase() + this.substring(1, this.length).toLowerCase();
}


function dump(iObject, iMaxRecurrence) {
	__dump(iObject, undefined, undefined, iMaxRecurrence);
}


function __dump(iObject, iObjectName, iIndentCount, iMaxRecurrence) {
	if (iIndentCount == undefined) iIndentCount = 0;
	if (iObjectName == undefined) iObjectName = "Object";
	
	var objectType = typeof(iObject);	
	if (objectType == "function") return;
	
	if (iObject instanceof Array) objectType = "Array";
	if (iObject instanceof Date) objectType = "Date";
	if (iObject === undefined) objectType = "undefined";
	if (iObject === null) objectType = "null";
	
	var s = "";
	for (var i = 0; i < iIndentCount; i++) s += "   ";
	if (iObjectName[0] != "[") {
		s += iObjectName + ": ";
	} else {
		s += iObjectName + " ";
	}
	
	var recur = true;
	if (iMaxRecurrence != undefined) {
		recur = iIndentCount <= iMaxRecurrence;
	}
			
	if (objectType == "object" || objectType == "Array" && recur) {		
		var hasProperties = false;		
		
		for (var n in iObject) {
			hasProperties = true;
			break;
		}
		
		if (!hasProperties) {
			s += "{}";
			print(s);
		} else {
			print(s);
			for (var n in iObject) {
				var p = iObject[n];	
				if (objectType == "Array") {
					__dump(p, "[" + n + "]", iIndentCount + 1, iMaxRecurrence);
				} else {		
					__dump(p, n, iIndentCount + 1, iMaxRecurrence);
				}
			}			
		}
	} else {
		if (iObject === undefined) {
			s += "undefined";	
		} else if (iObject === null) {
			s += "null";	
		} else if (objectType == "string") {
			s += '"' + iObject + '"';
		} else if (objectType == "object") {
			s += "object";
		} else if (objectType == "Array") {
			s += "[";
			for (var i = 0; i < iObject.length; i++) {
				if (i != 0) s += ", ";
				s += iObject[i];
			}
		} else {
			s += iObject.toString();
		}
		print(s);
	}
}



function twoDigits(iNumber) {
	result = iNumber.toString();			
	while (result.length < 2) result = "0" + result;			
	return result;
}


function zeroPadding(iNumber, iDigitCount) {
	var output = iNumber.toString();			
	while (output.length < iDigitCount) output = "0" + output;			
	return output;	
}


String.prototype.trim = function() {
	var spaceCharacters = " 	\n\r";
	
	var stringLength = this.length;
	
	if (stringLength == 0) return "";
	
	var firstCharIndex = 0;
	var isEmptyString = true;
	for (var charIndex = 0; charIndex < stringLength; charIndex++) {		
		if (spaceCharacters.indexOf(this[charIndex]) < 0) {
			firstCharIndex = charIndex;
			isEmptyString = false;
			break;
		}
	}
	
	if (isEmptyString) return "";
	
	var lastCharIndex = stringLength - 1;
	for (var charIndex = stringLength - 1; charIndex >= 0; charIndex--) {
		if (spaceCharacters.indexOf(this[charIndex]) < 0) {
			lastCharIndex = charIndex;
			break;
		}
	}
	
	return this.substring(firstCharIndex, lastCharIndex + 1);
}


function getFileExtension(iFile) {
	var result = "";
	
	var foundDot = false;
	for (var i = iFile.length - 1; i >= 0; i--) {
		var c = iFile[i];
		if (c == ":" || c == "/" || c == "\\") {
			break;
		}
		
		if (c == ".") {
			foundDot = true;
			break;
		}
		
		result = c + result;
	}
	
	if (!foundDot) result = "";
	
	return result;
}


function getFilename(iFile, iIncludeExtension) {
	if (iIncludeExtension == undefined) iIncludeExtension = true;
	
	var result = "";
	
	for (var i = iFile.length - 1; i >= 0; i--) {
		var c = iFile[i];
		if (c == ":" || c == "/" || c == "\\") {
			break;
		} else {
			result = c + result;
		}
	}
	
	if (!iIncludeExtension) {
		var ext = getFileExtension(result);
		if (ext.length > 0) {
			result = result.substr(0, result.length - ext.length - 1);
		}
	}
	
	return result;
}


function getFilePath(iFile) {
	var filename = getFilename(iFile);
	
	return iFile.substr(0, iFile.length - filename.length - 1);
}


function normalizePath(iPath) {	
	// *** Remove any "/", "\" character from the end of the path
	
	var output = iPath.toString();
	
	while (true) {
		var lastChar = output[output.length - 1];
		if (lastChar == "/" || lastChar == "\\") {
			output = output.substr(0, output.length - 1);
		} else {
			break;
		}
	}	
	
	// *** Convert all the "\\" to "/"
	
	var re = /\\/g;
	
	return output.replace(re, "/");	
}


