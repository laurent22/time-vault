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

var __log_toFile = false;
var __log_filePath = undefined;
var __log_toDebugWindow = true;
var __log_showErrorLog = true;
var __log_showWarningLog = true;
var __log_showInfoLog = true;


function ilog(iString) {
	if (!__log_showInfoLog) return;
	printLog("Info", iString);
}


function elog(iString) {
	if (!__log_showErrorLog) return;
	printLog("Error", iString);
}


function wlog(iString) {
	if (!__log_showWarningLog) return;
	printLog("Warning", iString);
}


function twoDigits(iNumber) {
	result = iNumber.toString();			
	while (result.length < 2) result = "0" + result;			
	return result;
}


function printLog(iHeading, iString) {	
	var d = new Date();
	
	if (__log_toFile) {
		var f = __log_filePath;		
		if (f == undefined || f == "") f = system.widgetDataFolder + "/Log.txt";		
		filesystem.writeFile(f, "[" + iHeading + " " + d.getFullYear() + "/" + twoDigits(d.getMonth()) + "/" + twoDigits(d.getDate()) + " " + twoDigits(d.getHours()) + ":" + twoDigits(d.getMinutes()) + ":" + twoDigits(d.getSeconds()) + "] " + iString + "\n", true);
	}
	
	if (__log_toDebugWindow) print("[" + twoDigits(d.getHours()) + ":" + twoDigits(d.getMinutes()) + ":" + twoDigits(d.getSeconds()) + " " + iHeading + "] " + iString);
}