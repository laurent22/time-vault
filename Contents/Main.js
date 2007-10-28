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



// ==== includeFile() ====

// This function includes the file only if it hasn't been
// previously included,

var gIncludedFiles = new Array();

function includeFile(iFile) {
	for (var i = 0; i < gIncludedFiles.length; i++) {
		if (gIncludedFiles[i] == iFile) return;
	}
	
	include(iFile);
	
	gIncludedFiles.push(iFile);
}

// ==== /includeFile() ====



includeFile("Localization.js");
includeFile("StringHelper.js");
includeFile("Log.js");
includeFile("ExtendedTimer.js");
includeFile("EventInterface.js");
includeFile("DateHelper.js");
includeFile("Database.js");
includeFile("Imaging.js");
includeFile("SystemHelper.js");

includeFile("Puppeteer.js");
includeFile("Puppeteer.Animation.js");
includeFile("Puppeteer.EaseEquations.js");

___Widgui_InitialLibraryPath = "Resources/WidGUI";
includeFile("Resources/WidGUI/Scripts/Widgui_Manager.js");
Widgui.Utils.setLocalizationFunction(this, "loc");
Widgui.Utils.using("UserControl");

includeFile("EventDatabase.js");
includeFile("ProjectEvent.js");
includeFile("Project.js");
includeFile("ProjectPossibleTask.js");
//includeFile("ProjectItem.js");
//includeFile("RoundButton.js");
//includeFile("FlashingButton.js");
includeFile("MainWindow.js");
includeFile("MainDrawer.js");



var DEV_MODE = widget.name.indexOf("DEBUG") >= 0;//false;//filesystem.itemExists("../../MarqueurDossierDevWidget.txt");
var MAINWIN_RIGHT_MIN_WIDTH = 145;
var MAINWIN_RIGHT_MAX_WIDTH = 400;
const DATABASE_FILENAME = "Events.db3";


if (preferences.locale.value != "default") {
	__customLocaleCode = preferences.locale.value;
}


preferences.lastRightPartWidth.defaultValue = MAINWIN_RIGHT_MIN_WIDTH;
if (preferences.lastRightPartWidth.value == "setme") preferences.lastRightPartWidth.value = preferences.lastRightPartWidth.defaultValue;

if (preferences.lastDrawerWidth.value == "setme") preferences.lastDrawerWidth.value = MAINWIN_RIGHT_MAX_WIDTH;

if (preferences.lastSelectedProjectID.value == "setme") preferences.lastSelectedProjectID.value = 0;



var Main = new EventInterface();

Main.skinFolder = "Resources/Skin/Default";


Main.trayIconExe = null;


if (preferences.dataFolder.value == "setme") {
	preferences.dataFolder.value = system.widgetDataFolder + "/" + DATABASE_FILENAME;
} 


Main.extractTrayIconExe = function() {
	if (this.trayIconExe == null) {
		this.trayIconExe = widget.extractFile("Resources/TrayIcon/TimeVaultTrayIcon.exe");
	}	
}


Main.showTrayIcon = function(iShow) {
//	return;
//	
//	if (system.platform != "windows") return;
//	if (preferences.useTrayIcon.value == "0") return;
//	
//	this.extractTrayIconExe();
//	
//	if (iShow == null) iShow = true;
//	
//	if (iShow) {
//		runCommandInBg('"' + this.trayIconExe + '"', "akefeozhfioz");
//	} else {
//		runCommandInBg('"' + this.trayIconExe + '" kill', "akefeozhfioz");
//	}
}


Main.hideTrayIcon = function() {
	//this.showTrayIcon(false);
}


Main.cannotCreateDataFolderAlertShown = false;


Main.dataFolder getter = function() {
	var f = getFilePath(preferences.dataFolder.value);
	
	if (!filesystem.itemExists(f)) {
		try {
			filesystem.createDirectory(f);
		} catch(e) {
			elog("Exception: Cannot create data folder: " + e + ". Using widget data folder instead.");
			if (!this.cannotCreateDataFolderAlertShown) {
				alert(loc("main_cannotCreateDataFolder", f));
				this.cannotCreateDataFolderAlertShown = true;
			}
			return system.widgetDataFolder;
		}		
	}
	
	return f;
}


Main.revealReportFolder = function() {
	var items = filesystem.getDirectoryContents(Main.reportFolder);
	if (items.length > 0) {
		filesystem.reveal(Main.reportFolder + "/" + items[0]);
	} else {
		filesystem.reveal(Main.reportFolder);
	}	
}


Main.reportFolder getter = function() {
	var output = this.dataFolder + "/" + loc("main_reportFolder");
	if (!filesystem.itemExists(output)) {
		try {
			filesystem.createDirectory(output);
		} catch(e) {
			elog(e);
		}
	}
	return output;
}


//if (!filesystem.itemExists(Main.dataFolder)) {
//	try {
//		filesystem.createDirectory(Main.dataFolder);
//	} catch(e) {
//		elog("Exception: Cannot create data folder: " + e);
//		alert(loc("main_cannotCreateDataFolder", Main.dataFolder));
//	}
//}
//
//if (!filesystem.itemExists(Main.reportFolder)) {
//	try {
//		filesystem.createDirectory(Main.reportFolder);
//	} catch(e) {
//		elog("Exception: Cannot create report folder: " + e);
//		alert(loc("main_cannotCreateReportFolder", Main.reportFolder));
//	}	
//}


ilog("Data folder: " + Main.dataFolder);
ilog("Report folder: " + Main.reportFolder);


Main.onPreferenceChanged = function(iSource, iParam) {
	this.broadcastEvent(iSource, "preferenceChanged", iParam);
}


Main.getNumericDate = function(iDate) {
	if (preferences.numberDateFormat.value == "0") {
		return twoDigits(iDate.getDate()) + "/" + twoDigits(iDate.getMonth() + 1) + "/" + twoDigits(iDate.getFullYear());
	} else {
		return twoDigits(iDate.getMonth() + 1) + "/" + twoDigits(iDate.getDate()) + "/" + twoDigits(iDate.getFullYear());
	}
}


Main.useAmPm = function() {
	return preferences.useAmpm.value == "1";
}


Main.publishProjects = function() {
	var projects = gDatabase.getProjects();
	for (var i = 0; i < projects.length; i++) {
		if (projects[i].archived) continue;
		this.publishProject(projects[i]);
	}
}


Main.publishProject = function(iProject, iDailyReports) {
	var suffix = "";
	if (iDailyReports === true) {
		suffix = " (daily)";
	}
	
	var headers = this.getReportHeaders();
	var filePath = this.reportFolder + "/" + getSafeFilename(iProject.name) + suffix + ".csv";
	iProject.publish(filePath, headers, iDailyReports);
}


Main.publishDailyProjects = function() {
	var projects = gDatabase.getProjects();
	for (var i = 0; i < projects.length; i++) {
		if (projects[i].archived) continue;
		this.publishProject(projects[i], true);
	}
}


Main.getTimeString = function(iDateTime) {
	var timeString;
	
	if (this.useAmPm()) {
		timeString = getFormattedDateString(iDateTime, "h1:m2 AMPM");
	} else {
		timeString = getFormattedDateString(iDateTime, "H2:m2");
	}
	
	return timeString;
}


Main.getReportHeaders = function() {
	var output = [];
	
	if (this.possibleHeaders == undefined) {	
		this.possibleHeaders = [];
		this.possibleHeaders.push({ title:loc("preferencesOption_reportHeader1"), propertyName:"startDateExcelString" });
		this.possibleHeaders.push({ title:loc("preferencesOption_reportHeader2"), propertyName:"endDateExcelString" });
		this.possibleHeaders.push({ title:loc("preferencesOption_reportHeader3"), propertyName:"durationExcelString" });
		this.possibleHeaders.push({ title:loc("preferencesOption_reportHeader4"), propertyName:"descriptionString" });
	}
	
	for (var i = 0; i <= 10; i++) {
		var p = preferences["reportColumn" + i];
		if (p == undefined) break;
		
		var v = Number(p.value);
		if (v == 0) continue;
		
		output.push(this.possibleHeaders[v - 1]);
	}	
	
	return output;
}


Main.getDurationString = function(iMilliseconds) {
	var t = getTimeFromMilliseconds(iMilliseconds);
	return twoDigits(t.hours) + ":" + twoDigits(t.minutes); 
}


Main.editProject = function(iProject) {	
	var formTitle = loc("editProject_title");
	
	if (iProject == undefined) {
		iProject = gDatabase.createProject();
		
		if (gDatabase.getProjects().length == 0) {
			formTitle = loc("editProject_titleFirstProject");
		} else {
			formTitle = loc("editProject_titleNew");
		}
	}
	
	var items = [];
	var it;
		
	it = new FormField();
	it.title = loc("editProject_projectName");
	it.type = "text";
	it.description = loc("editProject_projectNameDescription");
	it.defaultValue = iProject.name;
	items.push(it);
	
	it = new FormField();
	it.title = loc("editProject_projectTimeBudget");
	it.type = "text";
	it.defaultValue = iProject.timeBudget != null ? iProject.timeBudget : "";
	items.push(it);
	
	it = new FormField();
	it.title = loc("editProject_projectRatePerHour");
	it.type = "text";
	it.defaultValue = iProject.ratePerHour != null ? iProject.ratePerHour : "";
	items.push(it);
	
	it = new FormField();
	it.title = loc("editProject_projectNotes");
	it.type = "text";
	it.description = loc("editProject_projectNotesDescription");
	it.defaultValue = iProject.notes != null ? iProject.notes : "";
	items.push(it);
	
	it = new FormField();
	it.title = loc("editProject_Archived");
	it.type = "checkbox";
	it.description = loc("editProject_ArchivedDescription");
	it.defaultValue = iProject.archived ? 1 : 0;
	items.push(it);
	
	var results = form(items, formTitle, loc("global_saveButton"));
	
	if (results == null) return;
	
	var projectName = results[0].trim();	
	if (projectName == "") return;
	
	iProject.name = projectName;
	iProject.timeBudget = results[1].trim();	
	iProject.ratePerHour = results[2].trim();	
	iProject.notes = results[3].trim();	
	iProject.archived = results[4] == "1";
	
	iProject.save();
		
	return iProject;
}


Main.editPossibleTask = function(iTask) {
	var formTitle = loc("editPossibleTask_title");
	
	if (iTask == undefined) {
		iTask = gDatabase.createPossibleTask();
		formTitle = loc("editPossibleTask_titleNew");
	}
	
	var items = [];
	var it;
		
	it = new FormField();
	it.title = loc("editPossibleTask_description");
	it.type = "text";
	it.defaultValue = iTask.description;
	
	items.push(it);
	
	var results = form(items, formTitle, loc("global_saveButton"));
	
	if (results == null) return;
	
	var taskDesc = results[0].trim();
	
	if (taskDesc == "") return;
	
	iTask.description = taskDesc;
	
	iTask.save();
	
	return iTask;
}


Main.editEvent = function(iEvent, iProject) {
	var formTitle = loc("editEvent_title");
	
	if (iEvent == undefined) {
		iEvent = gDatabase.createEvent();
		iEvent.startDate = new Date();
		iEvent.endDate = iEvent.startDate.duplicate();
		iEvent.endDate.setHours(iEvent.endDate.getHours() + 1);
	
		formTitle = loc("editEvent_titleNew");
	}	
	
	if (iProject != undefined) iEvent.projectID = iProject.id
	
	var items = [];
	var it;
	var itOptions, itValues;
	
	
	
	
	
	
	it = new FormField();
	it.title = loc("editEvent_project");
	it.type = "popup";
	
	itOptions = [];
	itValues = [];
	
	var projects = gDatabase.getProjects();
	for (var i = 0; i < projects.length; i++) {
		itOptions.push(projects[i].name);
		itValues.push(projects[i].id);
	}
	
	it.option = itOptions;
	it.optionValue = itValues;
	it.defaultValue = iEvent.projectID;
	
	items.push(it);
	
	



	it = new FormField();
	it.title = loc("editEvent_task");
	it.type = "popup";
	it.description = loc("editEvent_taskDescription", loc("drawer_projectButton"));
	
	itOptions = ["< " + loc("global_none") + " >"];
	itValues = [0];
	
	var tasks = gDatabase.getPossibleTasksFromProjectID(iEvent.projectID);
	for (var i = 0; i < tasks.length; i++) {
		itOptions.push(tasks[i].description);
		itValues.push(tasks[i].id);
	}
	
	it.option = itOptions;
	it.optionValue = itValues;
	it.defaultValue = iEvent.description;
	
	items.push(it);
		
	
	
	
	
		
	it = new FormField();
	it.title = loc("editEvent_startDate");
	it.description = loc("editEvent_startDateDescription", loc("month7"));
	it.type = "text";
	it.defaultValue = Main.getNumericDate(iEvent.startDate);
	
	items.push(it);
	
	it = new FormField();
	it.title = loc("editEvent_startTime");
	it.description = loc("editEvent_startTimeDescription");
	it.type = "text";
	it.defaultValue = Main.getTimeString(iEvent.startDate);
	
	items.push(it);
	
	it = new FormField();
	it.title = loc("editEvent_duration");
	it.description = loc("editEvent_durationDescription");
	it.type = "text";
	it.defaultValue = iEvent.durationUserString;
	
	items.push(it);
	
	
	
	var results = form(items, formTitle, loc("global_saveButton"));
	
	if (results == null) return;
	
	
	
	var projectID = results[0];
	var taskID = results[1];
	var startDateString = results[2].trim();
	var startTimeString = results[3].trim();
	var durationString = results[4].trim();
	
	
	
	
	
	
	var startDate = new Date();
	var duration = 0;
	
	if (startDateString != "") {
		
		if (this.getDateFormat() == "ddmm" && startDateString.indexOf("/") > 0) {
			var s = startDateString.split("/");
			startDateString = s[1] + "/" + s[0] + "/" + s[2];
		}
		
		startDate = new Date(Date.parse(startDateString));
		if (startDate == "Invalid Date") {
			alert(loc("editEvent_invalidDateError", startDateString));
			return;
		}
	}
	
	startDate.setSeconds(0);
	startDate.setMilliseconds(0);
	
	if (startTimeString != "") {
		var p = parseTimeString(startTimeString);
		if (p == undefined) {
			alert(loc("editEvent_invalidTimeError", startTimeString));
		} else {
			startDate.setHours(p.hours);
			startDate.setMinutes(p.minutes);
		}
	}	
	
	if (durationString != "") {
		
		if (durationString.indexOf(":") < 0) {
			duration = Number(durationString);
			if (isNaN(duration)) duration = 0;
		} else {
			var s = durationString.split(":");	
			
			var n = Number(s[0]);
			if (isNaN(n)) n = 0;
			
			duration = n;
			
			n = Number(s[1]);
			if (isNaN(n)) n = 0;
			
			duration += n / 60;
		}		
		
	}
	
	
	var endDate = startDate.getTime() + duration * 60 * 60 * 1000;
	endDate = new Date(endDate);
	
	
	var t = gDatabase.getTask(taskID);
	if (t == undefined) {
		taskID = undefined;
	} else {
		if (projectID != t.projectID) taskID = undefined;
	}
	
	iEvent.projectID = projectID;
	iEvent.description = taskID;
	iEvent.startDate = startDate;
	iEvent.endDate = endDate;
	
	iEvent.save();
		
	return iEvent;
}


Main.getDateFormat = function() {
	return preferences.numberDateFormat.value == "0" ? "ddmm" : "mmdd";
}


Main.deleteProjectMessagebox = function(iProject) {
//	if (iProject.id == 1) {
//		alert(loc("cannotDeleteDefaultProjectMessageBox"), loc("global_okButton"));
//		return false;
//	} else {
		var answer = alert(loc("confirmProjectDeletionMessageBox", iProject.name), loc("global_yesButton"), loc("global_noButton"));
		return answer == 1;
//	}
}


Main.deletePossibleTaskMessagebox = function(iTask) {
	var answer = alert(loc("confirmPossibleTaskDeletionMessageBox", iTask.description), loc("global_yesButton"), loc("global_noButton"));
	return answer == 1;
}


Main.updateDockIcon = function() {	
	var doc = XMLDOM.parse(filesystem.readFile("vitality.xml"));	
	widget.setDockItem(doc, "fade");
}


Main.database_eventCollectionChanged = function(iSource, iParam) {
	if (preferences.publishReports.value == "0" && preferences.publishDailyReports.value == "0") return;
	
	var projects = [];
	for (var i = 0; i < iParam.events.length; i++) {
		var p = iParam.events[i].project;
		
		var publishIt = true;
				
		for (var j = 0; j < projects.length; j++) {
			var p2 = projects[j];
			if (p2.id == p.id) publishIt = false;
		}
		
		if (publishIt) projects.push(p);
	}	
	
	if (preferences.publishReports.value == "1") {
		for (var i = 0; i < projects.length; i++) {
			var p = projects[i];
			this.publishProject(p);
		}	
	}
	
	if (preferences.publishDailyReports.value == "1") {
		for (var i = 0; i < projects.length; i++) {
			var p = projects[i];
			this.publishProject(p, true);
		}	
	}
}


Main.database_projectCollectionChanged = function(iSource, iParam) {
	if (preferences.publishReports.value == "0" && preferences.publishDailyReports.value == "0") return;
	
	if (preferences.publishReports.value == "1") {
		for (var i = 0; i < iParam.projects.length; i++) {
			var p = iParam.projects[i];
			this.publishProject(p);
		}
	}
	
	if (preferences.publishDailyReports.value == "1") {
		for (var i = 0; i < iParam.projects.length; i++) {
			var p = iParam.projects[i];
			this.publishProject(p, true);
		}
	}
}





var gDatabase = new EventDatabase();
gDatabase.registerForEvents(Main, "database_");




//var c = splitColor(preferences.glassColor1.value);
//c = rgb2lab(c[0], c[1], c[2]);
//
//if (c.l <= 127) {
//	preferences.normalFontColor.value = "#ffffff";
//} else {
//	preferences.normalFontColor.value = "#000000";
//}


preferences.normalFontColor.value = "#ffffff";

var Styles = {};

Styles.header = new Widgui.Skin.FontStyle();
Styles.header.fontSize = "12px";
Styles.header.fontWeight= "bold";
Styles.header.color = preferences.headerFontColor.value;

Styles.normal = new Widgui.Skin.FontStyle();
Styles.normal.fontSize = "12px";
Styles.normal.color = preferences.normalFontColor.value;

Styles.normalItalic = new Widgui.Skin.FontStyle();
Styles.normalItalic.fontSize = "12px";
Styles.normalItalic.color = preferences.normalFontColor.value;
Styles.normalItalic.fontStyle = "italic";

Styles.normalBold = new Widgui.Skin.FontStyle();
Styles.normalBold.fontSize = "12px";
Styles.normalBold.color = preferences.normalFontColor.value;
Styles.normalBold.fontWeight= "bold";

Styles.crystalButton = new Widgui.Skin.FontStyle();
Styles.crystalButton.color = preferences.normalFontColor.value;

//Styles.project = new Widgui.Skin.FontStyle();
//Styles.project.fontSize = "12px";
//Styles.project.fontWeight= "bold";
//Styles.project.color = preferences.normalFontColor.value;



function getTimeFromMilliseconds(iMilliseconds) {
  var temp = Math.floor(iMilliseconds / 1000);
  var secs = temp % 60;
	temp = Math.round((temp - secs) / 60);
  var mins = temp % 60;
  var hours = Math.round((temp - mins) / 60);	
  
  return { hours:hours, minutes:mins, seconds:secs };
}



//preferences.glassColor1.value = preferences.glassColor1.defaultValue;
//preferences.glassColor2.value = preferences.glassColor2.defaultValue;




function updateGradientColorsFromScheme() {
	switch (Number(preferences.colorScheme.value)) {
	
		case 1:
		
			preferences.glassColor1.value = "#F02400";
			preferences.glassColor2.value = "#FF8000";
			
			break;

		case 2:
		
			preferences.glassColor1.value = "#009300";
			preferences.glassColor2.value = "#81FF0F";					
			break;
			
		case 3:

			preferences.glassColor1.value = "#00008B";
			preferences.glassColor2.value = "#4B0082";					
			break;
			
		case 4:
		
			preferences.glassColor1.value = "#01469A";
			preferences.glassColor2.value = "#007CE1";					
			break;			
					
	}	
}

updateGradientColorsFromScheme();


// ******************** Localize preferences ********************

var initialPreferences;
var previousDataFolder;


function populateExpandStylePreference() {
	var ddOptionValues = [0,1,2,3,4];
	var ddOptions = [];
	for (var i = 0; i < ddOptionValues.length; i++) {
		ddOptions.push(loc("preferencesOption_expandStyle" + i));
	}	
	
	preferences.expandStyle.option = ddOptions;
	preferences.expandStyle.optionValue = ddOptionValues;
}


function populateColorSchemePreference() {
	var ddOptionValues = [0,1,2,3,4];
	var ddOptions = [];
	for (var i = 0; i < ddOptionValues.length; i++) {
		ddOptions.push(loc("preferencesOption_colorScheme" + i));
	}	
	
	preferences.colorScheme.option = ddOptions;
	preferences.colorScheme.optionValue = ddOptionValues;
}


function populateReportColumnPreference() {
	var ddOptionValues = [0,1,2,3,4];
	var ddOptions = [];

	for (var i = 0; i < ddOptionValues.length; i++) {
		ddOptions.push(loc("preferencesOption_reportHeader" + i));
	}
		
	for (var i = 0; i <= 10; i++) {
		var p = preferences["reportColumn" + i];
		if (p == undefined) break;
				
		p.option = ddOptions;
		p.optionValue = ddOptionValues;
	}
}


for (var n in preferenceGroups) {
	if (n[0] == "_") continue;
	preferenceGroups[n].title = loc("preferenceGroup_" + n);
}


for (var n in preferences) {
	if (n[0] == "_") continue;
	if (n.substr(0, "konfabulator".length) == "konfabulator") continue;
	preferences[n].title = loc("preferencesTitle_" + n);
	var descID = "preferencesDesc_" + n;
	var s = loc(descID);
	if (s != descID) preferences[n].description = s;
}


widget.onWillChangePreferences = function() {
	initialPreferences = {};
	for (var n in preferences) initialPreferences[n] = preferences[n].value;
	
	populateColorSchemePreference();
	populateExpandStylePreference();
	populateReportColumnPreference();
	
	previousDataFolder = Main.dataFolder;
}


widget.onPreferencesChanged = function() {
	var rebootWidget = false;
	var refreshReports = false;
	
	updateGradientColorsFromScheme();
	
	for (var n in initialPreferences) {
		if (initialPreferences[n] != preferences[n].value) {
			Main.onPreferenceChanged(Main, {name:n});
			
			if (n == "dataFolder") {
				preferences.dataFolder.value = preferences.dataFolder.value.trim();				
				if (preferences.dataFolder.value == "") preferences.dataFolder.value = system.widgetDataFolder + "/" + DATABASE_FILENAME;
				
				filesystem.copy(previousDataFolder + "/" + DATABASE_FILENAME, Main.dataFolder + "/" + DATABASE_FILENAME);
				Main.publishProjects();
				rebootWidget = true;
			}
			
			if (n.indexOf("reportColumn") >= 0) {
				refreshReports = true;
			}
			
			if (n == "locale") {
				rebootWidget = true;
			}
			
		}
	}
	
			
	if (rebootWidget) {
		reloadWidget();
		//var answer = alert(loc("messageBox_rebootWidget"), loc("global_yesButton"), loc("global_noButton"));
		//if (answer == 1) reloadWidget();
	}
	
	if (refreshReports) {
		ilog("Publishing all projects");
		Main.publishProjects();
	}
}


function getAbsoluteLocation(iView) {
	
	var currentView = iView;
	var x = 0;
	var y = 0;
	
	while (true) {
		x += currentView.hOffset;
		y += currentView.vOffset;
		
		currentView = currentView.parentNode;
		if (currentView == undefined) break;
		if (currentView instanceof Window) break;
	}
		
	return {x:x, y:y};
}


function windowSaveImageToFile(iWindow, iImageFile, iFormat) {
	
	var canvas = new Canvas();
	var ctx = canvas.getContext("2d");
	var img = new Image();
	
	var child = iWindow.firstChild;
		
	var idx = 0;
	
	canvas.width = iWindow.width;
	canvas.height = iWindow.height;
	
	var maxWidth = 0;
	var maxHeight = 0;
	
	var ssImages = [];
	
	while (child != null) {
		if (child.visible) {		
			var f = system.widgetDataFolder + "/__temp" + idx + ".png";
			child.saveImageToFile(f, "png");
					
			img.src = f;
			
			var x = child.hOffset;
			var y = child.vOffset;
			var childRight = x + child.width;
			var childBottom = y + child.height;
						
			if (child.hAlign == "center") {
				x -= child.width / 2;
				childRight -= child.width / 2;
			} else if (child.hAlign == "right") {
				x -= child.width;
				childRight -= child.width;
			}
						
			if (child.vAlign == "center") {
				y -= child.height / 2;
				childBottom -= child.height / 2;
			} else if (child.vAlign == "bottom") {
				y -= child.height;
				childBottom -= child.height;
			}
						
			ctx.drawImage(img, x, y);
		
			if (childRight > maxWidth) maxWidth = childRight;
			if (childBottom > maxHeight) maxHeight = childBottom;
			
			filesystem.remove(f);
		}
				
		child = child.nextSibling;
		idx++;
	}
		
	canvas.saveImageToFile(iImageFile, iFormat);
	
	img = undefined; delete img;
	ctx = undefined; delete ctx;
	canvas = undefined; delete canvas;	
}














function onUnload() {
	//this.hideTrayIcon();
	
	preferences.lastRightPartWidth.value = gMainWindow.lastRightBackgroundWidth;//gMainWindow.rightBackground.width;
	preferences.lastDrawerHeight.value = gMainWindow.drawer.frame.height;
	preferences.windowLocation.value = gMainWindow.win.hOffset + "," + gMainWindow.win.vOffset;	
	preferences.lastDrawerWidth.value = gMainWindow.lastDrawerWidth;
	
	savePreferences();
}



function windowLocationSanityCheck(iWindow) {
	if (iWindow.hOffset < 0) iWindow.hOffset = 0;
	if (iWindow.vOffset < 0) iWindow.vOffset = 0;
}






var gMainWindow = new MainWindow();




Main.updateDockIcon()







// ======================================================
// VERSION CHECKING
// ======================================================

var __checkVersionURL = null;


function checkVersionURL_done(iURL) {
	
	// "versionChecker_newVersionAvailable" = "A new version of this widget is available!";
	// "versionChecker_yes" = "Download it now";
	// "versionChecker_no" = "Do it later";
	
	function compareVersions(v1, v2) {
		var s1 = v1.split(".");
		var s2 = v2.split(".");
		
		for (var i = 0; i < s1.length; i++) s1[i] = Number(s1[i]);		
		for (var i = 0; i < s2.length; i++) s2[i] = Number(s2[i]);
		
		while (s1.length < s2.length) s1.push(0);
		while (s2.length < s1.length) s2.push(0);
				
		for (var i = 0; i < s1.length; i++) {
			var e1 = s1[i];
			var e2 = s2[i];
			
			if (e1 > e2) return +1;
			if (e1 < e2) return -1;
		}
		
		return 0
	}
	
	var dom;	
						
	try {
		dom = XMLDOM.parse(iURL.responseData);
				
		var eProperties = dom.evaluate("feed/entry/prop");
		
		var currentVersion = "0";
		var versionURL = "http://www.pogopixels.com/download/";
		
		for (var i = 0; i < eProperties.length; i++) {
			var p = eProperties.item(i);
			var pName = p.getAttribute("name");
			var pValue = p.firstChild;
			if (pValue == null) continue;
			var pValue = pValue.data;
			
			if (pName == "CurrentVersion") currentVersion = pValue;
			if (pName == "URL") versionURL = pValue;
		}
				
		if (compareVersions(currentVersion, widget.version) > 0) {
			this.ilog("A new version is available");
			var answerIndex = alert(loc("versionChecker_newVersionAvailable"), loc("global_yesButton"), loc("global_noButton"));
			if (answerIndex == 1) openURL(versionURL);
		} else {
			this.ilog("No new version available");
		}
		
	} catch(e) {;
		this.elog("Couldn't parse version checking XML: " + e);		
	}
}


function checkVersion() {
	if (preferences.checkForNewVersion.value != "1") return;
	
	__checkVersionURL = new URL();
	__checkVersionURL.location = "http://api.pogopixels.com/?class=VersionChecker&action=check&itemID=TimeVault";
	__checkVersionURL.fetchAsync(checkVersionURL_done);
}


checkVersion();

// ======================================================
// VERSION CHECKING
// ======================================================
