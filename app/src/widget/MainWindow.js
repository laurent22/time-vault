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



var MAINWIN_INFO_AREA_OFFSET_LEFT = 8;
var MAINWIN_INFO_AREA_OFFSET_TOP = 11;
var MAINWIN_INFO_AREA_OFFSET_RIGHT = 9;
var MAINWIN_MAX_CENTRAL_GAP = 8;
var MAINWIN_MIN_CENTRAL_GAP = -1;
var MAINWIN_START_BUTTON_LEFT = 12;
var MAINWIN_START_BUTTON_TOP = 15;

var MAINWIN_AA_OFFSET_LEFT = 3;
var MAINWIN_AA_OFFSET_RIGHT = 4;
var MAINWIN_AA_OFFSET_TOP = 2;




var MAINWIN_DRAWER_WIDTH_INC = 30;



Widgui.Utils.usingControl("GraphicButton");


function MainWindow() {
	this.win = new Window();	
	
	
	
	var l = preferences.windowLocation.value.split(",");
	if (l.length == 2) {
		this.win.hOffset = l[0];
		this.win.vOffset = l[1];
	}
	
	windowLocationSanityCheck(this.win);
	
	
	this.win.title = widget.name;
	
	
	this.win.onMultiClick = function() {
		if (DEV_MODE) windowSaveImageToFile(this, "c://test.png", "png")
	}
	
	
	this.lastDrawerWidth = Number(preferences.lastDrawerWidth.value);
	this.lastRightBackgroundWidth = Number(preferences.lastRightPartWidth.value);

	
	
	// *******************************************************
	// Right part - Create elements
	// *******************************************************
	
	this.rightFrame = new Frame();
	
	this.rightBackground = new ThreePiecesRectangle(Main.skinFolder + "/BackgroundRight_");
	this.rightBackground.width = preferences.lastRightPartWidth.value;	
	
	this.infoAreaCanvas = new Canvas();
	this.infoAreaActiveCanvas = new Canvas();
	this.infoAreaActiveCanvas.opacity = 0;
	
	this.infoAreaClip0 = new Image();
	this.infoAreaClip0.src = Main.skinFolder + "/InfoArea_Left.png";
	this.infoAreaClip1 = new Image();
	this.infoAreaClip1.src = Main.skinFolder + "/InfoArea_Middle.png";
	this.infoAreaClip2 = new Image();
	this.infoAreaClip2.src = Main.skinFolder + "/InfoArea_Right.png";
	
	this.infoActiveAreaClip0 = new Image();
	this.infoActiveAreaClip0.src = Main.skinFolder + "/InfoArea_ActiveAreaClip0.png";
	this.infoActiveAreaClip1 = new Image();
	this.infoActiveAreaClip1.src = Main.skinFolder + "/InfoArea_ActiveAreaClip1.png";
	this.infoActiveAreaClip2 = new Image();
	this.infoActiveAreaClip2.src = Main.skinFolder + "/InfoArea_ActiveAreaClip2.png";
	
	this.infoAreaInactiveImage = new Image();
	this.infoAreaInactiveImage.src = Main.skinFolder + "/InfoArea_InactiveBackground.png";

	this.infoAreaActiveImage = new Image();
	this.infoAreaActiveImage.src = Main.skinFolder + "/InfoArea_ActiveBackground.png";
	
	
	this.infoAreaHL = new ThreePiecesRectangle(Main.skinFolder + "/InfoAreaHL_"); 
	
	this.eventFrame = new Frame();
	
	this.eventTimeText = new Text();
	this.eventTimeText.anchorStyle = "topLeft";
	this.eventTimeText.data = "12h 15m 17s";
	this.eventTimeText.style.fontWeight = "bold";
	this.eventTimeText.style.fontSize = "22px";
	this.eventTimeText.style.color = "#ffffff";
	//this.eventTimeText.style.KonShadowColor = "#777777";
	//this.eventTimeText.style.KonShadowOffset = "0px -1px";
	//this.eventTimeText.tooltip = loc("mainWindow_timeTooltip0");
	
	this.projectNameText = new Text();
	this.projectNameText.anchorStyle = "topLeft";
	this.projectNameText.data = "test";//loc("mainWindow_noProjectLoaded")//"< No project >";
	this.projectNameText.style.fontWeight = "bold";
	this.projectNameText.style.fontSize = "12px";
	this.projectNameText.style.color = "#ffffff";
	this.projectNameText.tooltip = loc("mainWindow_projectTooltip");
	// Both these labels open a menu but look like the static text around
	// them. The underline only shows while the mouse is over the widget, so
	// the cursor is what identifies them as you actually reach for one.
	this.projectNameText.cursor = "pointer";
	
	this.projectOptionText = new Text();
	this.projectOptionText.anchorStyle = "topLeft";
	this.projectOptionText.data = "[+]";
	this.projectOptionText.style.fontWeight = "bold";
	this.projectOptionText.style.fontSize = "12px";
	this.projectOptionText.style.color = "#ffffff";
	this.projectOptionText.tooltip = loc("mainWindow_projectOptionTooltip");
	this.projectOptionText.cursor = "pointer";
		
	this.projectNameTextUnderline = new Image();
	this.projectNameTextUnderline.src = "Resources/White.png";

	// The task label opens a menu just as the project name does, so it gets
	// the same underline — without one it read as a plain caption and nobody
	// would think to click it.
	this.projectOptionTextUnderline = new Image();
	this.projectOptionTextUnderline.src = "Resources/White.png";

	includeFile("RoundButton.js");
	
	this.expandButton = new RoundButton(Main.skinFolder + "/RoundButtonDownArrowIcon.png");//new FlashingButton(Main.skinFolder + "/ExpandButtonUp.png");
	this.expandButton.tooltip = loc("mainWindow_expandButtonTooltip");
	this.expandButton.grayscale = true;
		
	this.resizeButton = new RoundButton(Main.skinFolder + "/RoundButtonResizeIcon.png");
	this.resizeButton.tooltip = loc("mainWindow_resizeButtonTooltip");
	this.resizeButton.grayscale = true;
		
	
	
	
	

	// *******************************************************
	// Left part - Create elements
	// *******************************************************
	
	this.leftFrame = new Frame();
	
	this.leftBackground = new Image();
	this.leftBackground.src = Main.skinFolder + "/BackgroundLeft.png";

	this.leftBackgroundHL = new Image();
	this.leftBackgroundHL.src = Main.skinFolder + "/BackgroundLeftHL.png";	
		
	this.screwImage = new Image();
	this.screwImage.src = Main.skinFolder + "/Screw.png";	
	
	this.startButtonClip = new Image();
	this.startButtonClip.src = Main.skinFolder + "/StartButtonClip.png";	
	
	this.startButton = new Canvas();
	this.startButton.width = this.startButtonClip.width;
	this.startButton.height = this.startButtonClip.height;
	this.startButton.tooltip = loc("mainWindow_startButtonTooltip");
	
	this.startButton.owner = this;
	this.startButton.onMouseUp = function() { this.owner.startButton_mouseUp(); };
	this.startButton.onMouseDown = function() { this.owner.startButton_mouseDown(); };
	
	this.startButtonPlayIcon = new Image();
	this.startButtonPlayIcon.src = Main.skinFolder + "/StartButtonPlayIcon.png";	

	this.startButtonStopIcon = new Image();
	this.startButtonStopIcon.src = Main.skinFolder + "/StartButtonStopIcon.png";	
		
	this.startButtonIconFrame = new Frame();
	
		
	
	// *******************************************************
	// Central part - Create elements
	// *******************************************************
	
	this.centralPart = new Image();
	this.centralPart.src = Main.skinFolder + "/CentralPart.png";
	



	// *******************************************************
	// Drawer
	// *******************************************************
	
	this.drawerContainer = new Frame();
	
	this.drawer = new MainDrawer();
	
	
	
	
	
	// *******************************************************
	// Add elements to window
	// *******************************************************
	
	this.startButtonIconFrame.appendChild(this.startButtonPlayIcon);
	this.startButtonIconFrame.appendChild(this.startButtonStopIcon);	
	
	this.drawerContainer.appendChild(this.drawer.frame);
	
	this.eventFrame.appendChild(this.eventTimeText);
//	this.eventFrame.appendChild(this.projectNameLabel);
	this.eventFrame.appendChild(this.projectNameText);
	this.eventFrame.appendChild(this.projectOptionText);
//	this.eventFrame.appendChild(this.taskNameLabel);
//	this.eventFrame.appendChild(this.taskNameTextArea);
	this.eventFrame.appendChild(this.projectNameTextUnderline);
	this.eventFrame.appendChild(this.projectOptionTextUnderline);

	this.rightFrame.appendChild(this.rightBackground.frame);
	this.rightFrame.appendChild(this.infoAreaCanvas);
	this.rightFrame.appendChild(this.infoAreaActiveCanvas);
	this.rightFrame.appendChild(this.infoAreaHL.frame);
	this.rightFrame.appendChild(this.eventFrame);
	
	this.leftFrame.appendChild(this.leftBackground);
	this.leftFrame.appendChild(this.startButton);
	this.leftFrame.appendChild(this.startButtonIconFrame);
	this.leftFrame.appendChild(this.leftBackgroundHL);

	this.win.appendChild(this.drawerContainer);
	this.win.appendChild(this.centralPart);
	this.win.appendChild(this.rightFrame);
	this.win.appendChild(this.leftFrame);
	this.win.appendChild(this.screwImage);
	this.win.appendChild(this.resizeButton.frame);
	this.win.appendChild(this.expandButton.frame);
	
//	var t = new RoundButton(Main.skinFolder + "/RoundButtonUpArrowIcon.png"	);
//	this.win.appendChild(t.frame);
	
	
	// *******************************************************
	// Initial position
	// *******************************************************
	
	this.infoAreaCanvas.height = this.infoAreaClip0.height;	
	this.infoAreaCanvas.hOffset = MAINWIN_INFO_AREA_OFFSET_LEFT;
	this.infoAreaCanvas.vOffset = MAINWIN_INFO_AREA_OFFSET_TOP;
	
	this.infoAreaActiveCanvas.height = this.infoActiveAreaClip0.height;
	this.infoAreaActiveCanvas.hOffset = this.infoAreaCanvas.hOffset + MAINWIN_AA_OFFSET_LEFT;
	this.infoAreaActiveCanvas.vOffset = this.infoAreaCanvas.vOffset + MAINWIN_AA_OFFSET_TOP;

	this.infoAreaHL.hOffset = MAINWIN_INFO_AREA_OFFSET_LEFT;
	this.infoAreaHL.vOffset = MAINWIN_INFO_AREA_OFFSET_TOP - 1;	
	
	this.centralPart.vOffset = (this.rightBackground.height - this.centralPart.height) / 2;
	this.centralPart.hOffset = (this.leftBackground.width - 2);
	
	this.screwImage.hAlign = "center";
	this.screwImage.vAlign = "center";
	this.screwImage.vOffset = (this.leftBackground.height - this.screwImage.height) / 2 + this.screwImage.height / 2;
	
	this.startButton.hOffset = MAINWIN_START_BUTTON_LEFT;
	this.startButton.vOffset = MAINWIN_START_BUTTON_TOP;
	
	this.startButtonIconFrame.hOffset = (this.leftBackground.width - this.startButtonIconFrame.width) / 2 + 3;
	this.startButtonIconFrame.vOffset = (this.leftBackground.height - this.startButtonIconFrame.height) / 2;
	
	
	this.eventTimeText.data = "00";
	this.projectNameText.vOffset = this.eventTimeText.height + 0;
	this.projectOptionText.vOffset = this.projectNameText.vOffset;
//	this.projectNameLabel.vOffset = this.projectNameText.vOffset;
//	this.projectNameText.hOffset = this.projectNameLabel.hOffset + this.projectNameLabel.width + 4;
//	this.taskNameLabel.vOffset = this.projectNameLabel.vOffset + this.projectNameLabel.height;
//	this.taskNameTextArea.vOffset = this.taskNameLabel.vOffset;
//	this.taskNameTextArea.hOffset = this.taskNameLabel.hOffset+  this.taskNameLabel.width + 4;
	
	
	this.eventFrame.vOffset = (this.rightFrame.height - this.eventFrame.height) / 2 - 1;
	this.eventFrame.hOffset = MAINWIN_INFO_AREA_OFFSET_LEFT + 16;
	
	this.drawer.frame.height = preferences.lastDrawerHeight.value;
	this.drawerContainer.hOffset = 20;
	this.drawerContainer.vOffset = 66;
	this.drawer.frame.width = MAINWIN_DRAWER_WIDTH_INC + this.rightBackground.width;
	this.drawerContainer.width = this.drawer.frame.width;
	this.drawer.update();
	
	
	
	this.opened = true;
	
	this.centralGap = MAINWIN_MAX_CENTRAL_GAP;
	
	this.openCloseAnimation = new Puppeteer.Animation();
	this.openCloseAnimation.duration = 250;
	this.openCloseAnimation.updater = [this, "updateFramesFromCentralGap"];
	this.openCloseAnimation.easeType = Puppeteer.EaseType.easeOut;

	
	
	
	
	this.updateEventTimer = new ExtendedTimer();
	this.updateEventTimer.ticking = false;
	this.updateEventTimer.interval = 1;
	this.updateEventTimer.onTimerFired = [this, "updateEventTimer_fired"];
	
	
	
	
	
	
	Main.registerForEvents(this, "Main_");
	this.expandButton.registerForEvents(this, "expandButton_");
	this.resizeButton.registerForEvents(this, "resizeButton_");
	this.drawer.registerForEvents(this, "drawer_");
	gDatabase.registerForEvents(this, "database_");
	
	
	
	
	
	
	this.projectNameText.owner = this;
	
	this.projectNameText.onMouseDown = function() {
		var items = [];
		var it;
		var projects = gDatabase.getProjects();
							
		for (var i = 0; i < projects.length; i++) {
			var p = projects[i];
			
			if (p.archived) continue;
			
			it = new MenuItem();
			it.title = p.name;
			it.owner = this;
			it.__project = p;
			it.checked = p.id == this.owner.projectEvent.projectID;
			it.onSelect = function() {
				
				if (preferences.restartOnProjectChange.value == "1") this.owner.owner.stopAndStart();
				
				this.owner.owner.projectEvent.projectID = this.__project.id;
				this.owner.owner.updateProjectEventDisplay();				
				
				preferences.lastSelectedProjectID.value = this.__project.id;
				
			}
			
			items.push(it);
		}
		
		if (items.length > 0) {
			it = new MenuItem();
			it.title = "-";
			items.push(it);
		}
		
		it = new MenuItem();
		it.title = loc("mainWindow_projectPopup_addNewProject");
		it.owner = this;
		it.onSelect = function() {
			this.owner.owner.expandDrawerAndShowProjects();
		}
		items.push(it);		
		
		var l = getAbsoluteLocation(this);
		
		popupMenu(items, l.x, l.y + this.height);		
	}
	
	
	
	this.projectOptionText.owner = this;
	
	this.projectOptionText.onMouseDown = function() {
		if (this.owner.projectEvent == null) return;
		
		var items = [];
		var it;
		var tasks = this.owner.projectEvent.project.getPossibleTasks();
		
		it = new MenuItem();
		it.title = loc("mainWindow_projectOptionPopup_selectTask");
		it.enabled = false;
		items.push(it);
		
		it = new MenuItem();
		it.title = "-";
		items.push(it);
				
		it = new MenuItem();
		it.title = loc("mainWindow_projectOptionPopup_none");
		it.owner = this;
		it.checked = this.owner.projectEvent.description == 0;
		it.onSelect = function() {			
			this.owner.owner.projectEvent.description = 0;
			preferences.lastSelectedTaskID.value = 0;
			// The capsule shows the task now, so clearing it has to repaint.
			this.owner.owner.updateProjectEventDisplay();
		}
		items.push(it);
			
		it = new MenuItem();
		it.title = "-";
		items.push(it);
				
		for (var i = 0; i < tasks.length; i++) {
			var t = tasks[i];
			
			it = new MenuItem();
			it.title = t.description;
			it.owner = this;
			it.__task = t;
			it.checked = t.id == this.owner.projectEvent.description;
			it.onSelect = function() {
				
				this.owner.owner.projectEvent.description = this.__task.id;
				// The capsule shows the task now, so picking one has to
				// repaint it — this was dead code while it showed the
				// project, whose name never changed here.
				this.owner.owner.updateProjectEventDisplay();

				preferences.lastSelectedTaskID.value = this.__task.id;
			}
			
			items.push(it);
		}
				
		if (tasks.length > 0) {
			it = new MenuItem();
			it.title = "-";
			items.push(it);
		}
		
		it = new MenuItem();
		it.title = loc("mainWindow_projectOptionPopup_manageTasks");
		it.owner = this;
		it.onSelect = function() {
			this.owner.owner.expandDrawerAndShowProjects();
		}
		items.push(it);		
		
		var l = getAbsoluteLocation(this);
		
		popupMenu(items, l.x, l.y + this.height);		
	}
	
	
	
	this.win.owner = this;
	this.win.onMouseEnter = function() { this.owner.win_mouseEnter(); }
	this.win.onMouseExit = function() { this.owner.win_mouseExit(); }
	
	
	
	
	this.drawerOpened = false;
	this.drawerContainer.visible = false;
	
	
	this.drawerOpenedAnimation = new Puppeteer.Animation();
	this.drawerOpenedAnimation.duration = 500;
	this.drawerOpenedAnimation.onUpdate = [this, "drawerOpenedAnimation_update"];
	this.drawerOpenedAnimation.onDone = [this, "drawerOpenedAnimation_done"];
	this.drawerOpenedAnimation.easeType = Puppeteer.EaseType.easeOut;


	this.buttonFadeAnimation = new Puppeteer.Animation();
	this.buttonFadeAnimation.duration = 350;
	this.buttonFadeAnimation.onUpdate = [this, "buttonFadeAnimation_update"];
	this.buttonFadeAnimation.easeType = Puppeteer.EaseType.easeOut;	


	
	
	this.updateGlassColor();
	
	
	var e = gDatabase.createEvent();
	var projectID = preferences.lastSelectedProjectID.value;
	
	if (!gDatabase.isValidProjectID(projectID)) {
		var defaultProject = gDatabase.getDefaultProject();
		if (defaultProject != null) {
			projectID = defaultProject.id;
		} else {
			projectID = null;
		}
	}
		
	if (projectID != null) {
		e.projectID = projectID;
		
		var taskID = preferences.lastSelectedTaskID.value;
		if (e.project.hasPossibleTask(taskID)) e.description = taskID;
	} else {
		e = null;
	}
	
	this.loadProjectEvent(e);
	
	
	this.showButtons(false, false);
	
	this.buttonFadeTimer = new ExtendedTimer();
	this.buttonFadeTimer.ticking = false;
	this.buttonFadeTimer.onTimerFired = [this, "buttonFadeTimer_fired"];
	this.buttonFadeTimer.interval = 3;
	
	
	
	this.stopAndStartTimer = new ExtendedTimer();
	this.stopAndStartTimer.ticking = false;
	this.stopAndStartTimer.onTimerFired = [this, "stopAndStartTimer_fired"];
	this.stopAndStartTimer.interval = 0.3;
	
	
	
	this.autoSaveTimer = new ExtendedTimer();
	this.autoSaveTimer.ticking = false;
	this.autoSaveTimer.onTimerFired = [this, "autoSaveTimer_fired"];
	this.autoSaveTimer.interval = 60;
	
	
	
	
	
	this.update();
	this.updateFramesFromCentralGap(MAINWIN_MAX_CENTRAL_GAP);
	
	
	this.win.owner = this;
	this.win.onContextMenu = function() { this.owner.onContextMenu(); }

	
	
	this.restoreFromAutoSave();
	

	
}


MainWindow.prototype.stopAndStart = function() {
	if (this.opened) return;
	
	this.startButton_mouseUp();	
	this.stopAndStartTimer.ticking = true;
	this.stopAndStartTimer.reset();	
}


MainWindow.prototype.stopAndStartTimer_fired = function() {
	this.stopAndStartTimer.ticking = false;
	if (this.opened) this.startButton_mouseUp();
}


MainWindow.prototype.onContextMenu = function() {
	var items = [];
	var it;
		
	it = new MenuItem();
	it.title = loc("mainWindow_ctxMenu_viewReports");
	it.onSelect = function() {
		Main.revealReportFolder();
	};
	items.push(it);


	it = new MenuItem();
	it.title = loc("mainWindow_ctxMenu_publishAllReports");
	it.onSelect = function() {
		Main.publishProjects();
		Main.revealReportFolder();
	};
	items.push(it);


	it = new MenuItem();
	it.title = loc("mainWindow_ctxMenu_publishDailyReports");
	it.onSelect = function() {
		Main.publishDailyProjects();
		Main.revealReportFolder();
	};
	items.push(it);		

	
	this.win.contextMenuItems = items;
}


MainWindow.prototype.restoreFromAutoSave = function() {
	if (preferences.enableAutoSave.value == "0") return;
	
	var e = gDatabase.getAutoSavedEvent();
	if (e == undefined) return;
	
	e.save();
	
	gDatabase.addEvent(e);
	
	this.clearAutoSave();

	ilog("Auto saved event has been restored.");
	alert(loc("messageBox_restoreAutoSave", e.project));
}


MainWindow.prototype.database_projectCollectionChanged = function(iSource, iParam) {
			
	if (this.projectEvent == null) {	
		var p = gDatabase.getDefaultProject();
		if (p == null) return;
		if (p.archived) return;
		
		var e = this.createEventFromProject(p);
		
		this.loadProjectEvent(e);
	}
	
	if (this.projectEvent.project == undefined) {
		
		var p = gDatabase.getDefaultProject();
		
		if (p == null) {
			this.loadProjectEvent(null);
		} else {
			if (p.archived) {
				this.loadProjectEvent(null);
			} else {
				this.projectEvent.projectID = p.id;
			}
		}
		
	} else {
		if (this.projectEvent.project.archived) {
			this.loadProjectEvent(null);
		}
	}
	
	this.updateProjectEventDisplay();

	if (this.projectEvent == null) {
		if (!this.opened) this.openCapsule();//this.toggleEventTimer(false);
	}
}


MainWindow.prototype.showButtons = function(iShow, iAnimate) {
	if (iShow == undefined) iShow = true;
	if (iAnimate == undefined) iAnimate = true;
	
	if (!iAnimate) {
		this.expandButton.opacity = 0;
		this.resizeButton.opacity = 0;
		this.buttonShown = iShow;
		this.projectNameTextUnderline.opacity = 0;
		this.projectOptionTextUnderline.opacity = 0;
		return;
	}
		
	this.expandButton.show(iShow);
	this.resizeButton.show(iShow);
	
	if (this.projectNameTextUnderline.__fadeAnimation == undefined) {
		this.projectNameTextUnderline.__fadeAnimation = new Puppeteer.Animation();
		this.projectNameTextUnderline.__fadeAnimation.duration = 500;
		// One animation drives both underlines, so they can't drift apart.
		// A function rather than the [object, "property"] form the original
		// used, which can only reach a single target.
		var thisObject = this;
		this.projectNameTextUnderline.__fadeAnimation.onUpdate = function(iValue) {
			thisObject.projectNameTextUnderline.opacity = iValue;
			thisObject.projectOptionTextUnderline.opacity = iValue;
		}
	}
	
	this.projectNameTextUnderline.__fadeAnimation.startValue = this.projectNameTextUnderline.opacity;
	this.projectNameTextUnderline.__fadeAnimation.endValue = iShow ? 128 : 0;
	
	Puppeteer.start(this.projectNameTextUnderline.__fadeAnimation);
}


MainWindow.prototype.buttonFadeTimer_fired = function() {	
	this.showButtons(false)
}


MainWindow.prototype.win_mouseEnter = function() {		
	this.showButtons();
	this.buttonFadeTimer.ticking = false;
	
}


MainWindow.prototype.win_mouseExit = function() {	
	this.buttonFadeTimer.ticking = true;
	this.buttonFadeTimer.reset();
	
}


MainWindow.prototype.buttonFadeAnimation_update = function(iValue) {	
	this.expandButton.opacity = iValue;
	this.resizeButton.opacity = iValue;
		
	this.projectNameTextUnderline.opacity = iValue / 2;
	this.projectOptionTextUnderline.opacity = iValue / 2;
	
//	if (iValue == 255 && this.buttonShown) {
//		print("ici");
//		this.expandButton.flash();
//		this.resizeButton.flash();
//	}
	
	
}


MainWindow.prototype.drawerOpenedAnimation_done = function() {	
	
}


MainWindow.prototype.attachExpandButtonToDrawer = function() {		
	this.expandButton.hOffset = this.rightBackground.hOffset + this.rightBackground.width + 15;

	var y = this.drawer.frame.vOffset + this.drawerContainer.vOffset + this.drawer.frame.height - this.expandButton.height - 1;
	
	if (y < this.expandButtonClosedDrawerVOffset) y = this.expandButtonClosedDrawerVOffset;
	
	this.expandButton.vOffset = y;	
}


MainWindow.prototype.drawerOpenedAnimation_update = function(iValue) {	
	var percent = iValue[0];
	var rightBackgroundWidth = iValue[1];
	var drawerWidth = iValue[2]
		
	this.drawer.frame.vOffset = -this.drawer.frame.height * (1.0 - percent);
	
	
	
	if (!this.drawerOpened) {
		this.rightBackground.width = rightBackgroundWidth;
		this.update();
		this.onResized(this, {});
	}
	
	if (drawerWidth > 0) {
		this.drawer.frame.width = drawerWidth;
		this.drawer.update();
		this.drawer.onResized(this.drawer, {});
	}
	
	
	
	switch (this.windowDockData.hAlign) {
		
		case "right":
			
			this.win.hOffset = screen.width - this.windowDockData.hOffset - this.win.width;
			break;
			
		case "center":
		
			this.win.hOffset = this.windowDockData.hOffset - this.win.width / 2;
			break;
			
	}
			
	//print(this.rightBackground.height + " " + (getAbsoluteLocation(this.drawer.frame).y + this.drawer.frame.height))
	
	//print(Math.max(this.rightBackground.height, (getAbsoluteLocation(this.drawer.frame).y + this.drawer.frame.height)))
	
	
	
	//print(this.getHeight())
	
	switch (this.windowDockData.vAlign) {
		
		case "bottom":
			
			this.win.vOffset = screen.height - this.windowDockData.vOffset - this.getHeight();
			break;
			
		case "center":
		
			print("todo");
			break;
			
	}		
			
	
	
	
	this.attachExpandButtonToDrawer();	
	
	
	
}


MainWindow.prototype.expandDrawerAndShowProjects_fired = function() {
	this.expandDrawerAndShowProjectsTimer.ticking = false;
	this.drawer.projectButton_clicked();
}


MainWindow.prototype.expandDrawerAndShowProjects = function() {
	if (this.expandDrawerAndShowProjectsTimer == undefined) {
		this.expandDrawerAndShowProjectsTimer = new ExtendedTimer();
	}
		
	if (!this.drawerOpened) {
		this.expandButton_clicked();
		this.expandDrawerAndShowProjectsTimer.interval = this.drawerOpenedAnimation.duration / 1000.0;
		this.expandDrawerAndShowProjectsTimer.ticking = true;
		this.expandDrawerAndShowProjectsTimer.reset();
		this.expandDrawerAndShowProjectsTimer.onTimerFired = [this, "expandDrawerAndShowProjects_fired"];
	} else {
		this.drawer.projectButton_clicked();
	}
}


MainWindow.prototype.expandButton_clicked = function() {
	if (!this.drawerOpened) {
		this.lastRightBackgroundWidth = this.rightBackground.width;
	} else {
		this.lastDrawerWidth = this.drawer.frame.width;
	}
	
	this.toggleDrawer();
	
	this.expandButton.setIconImage(this.drawerOpened ? (Main.skinFolder + "/RoundButtonUpArrowIcon.png") : (Main.skinFolder + "/RoundButtonDownArrowIcon.png"));
}


MainWindow.prototype.drawer_resized = function() {
	this.rightBackground.width = this.drawer.frame.width - MAINWIN_DRAWER_WIDTH_INC;
	this.drawerContainer.width = this.drawer.frame.width;
	this.drawerContainer.height = this.drawer.frame.height;
	this.update();
}


MainWindow.prototype.updateEventTimer_fired = function() {
	this.updateProjectEventDisplay();
}


MainWindow.prototype.updateGlassColor = function() {
	var ctx = this.startButton.getContext("2d");

	
	ctx.drawImage(this.startButtonClip, 0, 0);
	
	ctx.globalCompositeOperation = "source-atop";
			
	
	var grad = ctx.createLinearGradient(0, 0, 0, this.startButton.height);
	grad.addColorStop(0, preferences.glassColor1.value);
	grad.addColorStop(1, preferences.glassColor2.value);
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, this.startButton.width, this.startButton.height);
	
	
	this.resizeButton.update();
	this.expandButton.update();
	
	
	this.update();
}


MainWindow.prototype.Main_preferenceChanged = function(iSource, iParam) {	
	switch (iParam.name) {
		
		case "glassColor1":
		case "glassColor2":
		case "colorScheme":
		
			this.updateGlassColor();
			break;
		
	}
}


MainWindow.prototype.loadProjectEvent = function(iProjectEvent) {
	this.projectEvent = iProjectEvent;
	this.updateProjectEventDisplay();
}


MainWindow.prototype.updateProjectEventDisplay = function() {
	if (this.projectEvent == null) {
		this.projectNameText.data = loc("mainWindow_noProjectLoaded");
		this.eventTimeText.data = "--:--";
	} else {
	
		var d = this.projectEvent.duration;
		d = getTimeFromMilliseconds(d);		
		
		if (this.opened) {
			this.eventTimeText.data = "00:00:00";
		} else {
			this.eventTimeText.data = twoDigits(d.hours) + ":" + twoDigits(d.minutes) + ":" + twoDigits(d.seconds);
		}
		
		this.projectNameText.data = this.projectEvent.project.name;

		// The task goes in the [+] label beside the name rather than being
		// appended to it: that control's menu is what picks the task, so the
		// current one belongs on it, and keeping them separate lets the
		// project name truncate and underline on its own as before.
		//
		// Set lighter and non-bold so the pair reads as "project, then what
		// I'm doing on it" rather than as one long run of text. With no task
		// selected it stays as [+], which is the affordance for choosing one.
		var task = this.projectEvent.descriptionString;
		this.projectOptionText.data = task != "" ? task : "[+]";
		this.projectOptionText.style.fontWeight = task != "" ? "normal" : "bold";
	}
	
	this.update();
}


MainWindow.prototype.createEventFromProject = function(iProject) {
	if (iProject == null) return;
	
	var e = gDatabase.createEvent();
	e.projectID = iProject.id;
	var taskID = preferences.lastSelectedTaskID.value;
	if (e.project.hasPossibleTask(taskID)) e.description = taskID;
	
	return e;			
}


MainWindow.prototype.closeCapsule = function() {
	this.openCapsule(false);
}


MainWindow.prototype.openCapsule = function(iOpen) {
	if (iOpen == null) iOpen = true;
	
	if (this.open == iOpen) return;
	
	this.leftBackgroundHL.opacity = 255;
	
	if (this.centralGap != MAINWIN_MIN_CENTRAL_GAP && this.centralGap != MAINWIN_MAX_CENTRAL_GAP) return;
	
	this.openCloseAnimation.kill();
	
	this.openCloseAnimation.startValue = this.centralGap;
	this.openCloseAnimation.endValue = !iOpen ? MAINWIN_MIN_CENTRAL_GAP : MAINWIN_MAX_CENTRAL_GAP;
	
	this.opened = iOpen;//!this.opened;
	
	this.expandButton.grayscale = this.opened;
	this.resizeButton.grayscale = this.opened;

	this.updateEventTimer.ticking = !this.opened;
	
	Puppeteer.start(this.openCloseAnimation);
}


MainWindow.prototype.toggleEventTimer = function(iSaveEvent) {
	if (iSaveEvent == null) iSaveEvent = true;
	
	if (this.projectEvent == null) {
				
		var p = Main.editProject(null);
		if (p == null) return;
		
		gDatabase.addProject(p);
		
		var e = this.createEventFromProject(p);
		
		this.loadProjectEvent(e);
		
		if (this.projectEvent != null) this.startButton_mouseUp();
		
	} else {
		
		this.openCapsule(!this.opened);
	
//		this.leftBackgroundHL.opacity = 255;
//		
//		if (this.centralGap != MAINWIN_MIN_CENTRAL_GAP && this.centralGap != MAINWIN_MAX_CENTRAL_GAP) return;
//		
//		this.openCloseAnimation.kill();
//		
//		this.openCloseAnimation.startValue = this.centralGap;
//		this.openCloseAnimation.endValue = this.opened ? MAINWIN_MIN_CENTRAL_GAP : MAINWIN_MAX_CENTRAL_GAP;
//		
//		this.opened = !this.opened;
//		
//		this.expandButton.grayscale = this.opened;
//		this.resizeButton.grayscale = this.opened;
		
		if (!this.opened) {
			
			this.projectEvent.startDate = new Date();
			this.onTimerStarted();
		} else {
			if (this.projectEvent != undefined) {
				
				if (iSaveEvent) {
				
					this.projectEvent.endDate = new Date();
					this.projectEvent.save();
					gDatabase.addEvent(this.projectEvent);
				
				}
				
				var e = gDatabase.createEvent();
				e.projectID = this.projectEvent.projectID;
				e.description = this.projectEvent.description;
				this.loadProjectEvent(e);
			}
			
			this.onTimerStopped();
		}
		
//		this.updateEventTimer.ticking = !this.opened;
//		
//		Puppeteer.start(this.openCloseAnimation);
	}	
}


//MainWindow.prototype.toggleEventTimer = function(iSaveEvent) {
//	if (iSaveEvent == null) iSaveEvent = true;
//
//
//	this.leftBackgroundHL.opacity = 255;
//	
//	if (this.centralGap != MAINWIN_MIN_CENTRAL_GAP && this.centralGap != MAINWIN_MAX_CENTRAL_GAP) return;
//	
//	this.openCloseAnimation.kill();
//	
//	this.openCloseAnimation.startValue = this.centralGap;
//	this.openCloseAnimation.endValue = this.opened ? MAINWIN_MIN_CENTRAL_GAP : MAINWIN_MAX_CENTRAL_GAP;
//
//		
//
//	
//	if (this.projectEvent == null) {
//				
//		var p = Main.editProject(null);
//		if (p == null) return;
//		
//		gDatabase.addProject(p);
//		
//		var e = this.createEventFromProject(p);
//		
//		this.loadProjectEvent(e);
//		
//		if (this.projectEvent != null) this.startButton_mouseUp();
//				
//	} else {
//		
//		if (!this.opened) {
//			
//			this.projectEvent.startDate = new Date();
//			this.onTimerStarted();
//		} else {
//			if (this.projectEvent != undefined) {
//				
//				if (iSaveEvent) {
//				
//					this.projectEvent.endDate = new Date();
//					this.projectEvent.save();
//					gDatabase.addEvent(this.projectEvent);
//				
//				}
//				
//				var e = gDatabase.createEvent();
//				e.projectID = this.projectEvent.projectID;
//				e.description = this.projectEvent.description;
//				this.loadProjectEvent(e);
//			}
//			
//			this.onTimerStopped();
//		}
//		
//	}	
//	
//
//	
//	this.opened = !this.opened;
//	
//	this.expandButton.grayscale = this.opened;
//	this.resizeButton.grayscale = this.opened;
//		
//	this.updateEventTimer.ticking = !this.opened;
//	
//	Puppeteer.start(this.openCloseAnimation);
//}


MainWindow.prototype.startButton_mouseUp = function() {
	this.toggleEventTimer();
}


MainWindow.prototype.autoSaveTimer_fired = function() {
	this.makeAutoSave();
}


MainWindow.prototype.makeAutoSave = function() {		
	if (this.projectEvent == undefined) return;

	ilog("Auto saving...");
	
	gDatabase.makeEventAutoSave(this.projectEvent);
}


MainWindow.prototype.clearAutoSave = function() {
	gDatabase.clearEventAutoSave();
}


MainWindow.prototype.onTimerStarted = function() {
	ilog("Starting timer...");
	this.autoSaveTimer.ticking = true;
	this.autoSaveTimer.reset();
	this.clearAutoSave();
	
	Main.showTrayIcon();
}


MainWindow.prototype.onTimerStopped = function() {
	ilog("Stopping timer...");
	this.autoSaveTimer.ticking = false;
	this.clearAutoSave();
	
	Main.hideTrayIcon();
	//this.showButtons(true, false)
}


MainWindow.prototype.startButton_mouseDown = function() {
	if (this.centralGap != MAINWIN_MIN_CENTRAL_GAP && this.centralGap != MAINWIN_MAX_CENTRAL_GAP) return;
	
	this.leftBackgroundHL.opacity = 211;
}


MainWindow.prototype.getHeight = function() {
	if (!this.drawerContainer.visible) return this.rightBackground.height;
	return Math.max(this.rightBackground.height, (getAbsoluteLocation(this.drawer.frame).y + this.drawer.frame.height))
}


MainWindow.prototype.getWindowDockData = function(iExpandStyleID) {
	var d;
	
	switch (iExpandStyleID) {
		
		case 0:
		
			var x = this.win.hOffset + this.win.width / 2;
			var y = this.win.vOffset + this.getHeight() / 2;
			var w = screen.width / 2;
			var h = screen.height / 2;
			
			if (x <= w && y <= h) return this.getWindowDockData(1);
			if (x >= w && y <= h) return this.getWindowDockData(2);
			if (x <= w && y >= h) return this.getWindowDockData(3);
			if (x >= w && y >= h) return this.getWindowDockData(4);
			
			break;
			
		case 1:
		case 2:
		
			d = { vAlign:"top" }
			break;
			
		case 3:
		case 4:
		
			d = { vAlign:"bottom", vOffset:screen.height - (this.win.vOffset + this.getHeight()) }
			break;
		
	}		
	
	switch (iExpandStyleID) {
						
		case 1:
		case 3:
		
			d.hAlign = "left";
			break;
			
		case 2:
		case 4:
		
			d.hAlign = "right";
			d.hOffset = screen.width - (this.win.hOffset + this.win.width);
			break;
		
	}	
	
	return d;	
}


MainWindow.prototype.toggleDrawer = function() {
	
	this.drawerOpenedAnimation.kill();
	
	this.windowDockData = this.getWindowDockData(Number(preferences.expandStyle.value));
		
	if (this.drawerOpened) { // drawer is going to close
		
		this.drawerContainer.height = this.drawer.frame.height;
		
		this.drawerOpenedAnimation.startValue = [1, this.rightBackground.width, -1];
		this.drawerOpenedAnimation.endValue = [0, this.lastRightBackgroundWidth, -1];
		
		this.drawer.onClose();
				
	} else { // drawer is going to open
		
		this.drawerContainer.visible = true;
				
		this.drawerContainer.height = this.drawer.frame.height;
		
		var startWidth = this.drawer.frame.width;
		var targetWidth = this.lastDrawerWidth;
		if (targetWidth == undefined) {
			targetWidth = -1;
			startWidth = -1;
		}
		
		
		
		this.drawerOpenedAnimation.startValue = [0, this.rightBackground.width, startWidth];
		this.drawerOpenedAnimation.endValue = [1, this.rightBackground.width, targetWidth];
		
		this.drawer.onOpen();				
	}




	
	this.drawerOpened = !this.drawerOpened;

	Puppeteer.start(this.drawerOpenedAnimation);
	
	this.drawerOpenedAnimation_update(this.drawerOpenedAnimation.startValue);
}


MainWindow.prototype.resizeButton_mouseDown = function() {
	this.resizingData = {};
	this.resizingData.initialMouseLoc = { x:system.event.screenX, y:system.event.screenY };
	this.resizingData.initialDimensions = { width:this.rightBackground.width} //, height:this.frame.height };
	
	this.resizeButton.colorize = "#555555";
}


MainWindow.prototype.resizeButton_mouseUp = function() {
	this.resizeButton.colorize = null;
}


MainWindow.prototype.resizeButton_mouseDrag = function() {
	var ox = system.event.screenX - this.resizingData.initialMouseLoc.x;
	
	var w = this.resizingData.initialDimensions.width + ox;
	
	var minW = MAINWIN_RIGHT_MIN_WIDTH;
	var maxW = MAINWIN_RIGHT_MAX_WIDTH;
	
	if (w > maxW) w = maxW;
	if (w < minW) w = minW;
		
	if (this.rightBackground.width != w) {
		this.rightBackground.width = w;
		this.update();		
		this.onResized(this, {});
	}
}


MainWindow.prototype.onResized = function(iSource, iParam) {	
	this.drawer.frame.width = MAINWIN_DRAWER_WIDTH_INC + this.rightBackground.width;
	this.drawerContainer.width = this.drawer.frame.width;
	this.drawerContainer.height = this.drawer.frame.height;
	this.drawer.update();
}


MainWindow.prototype.updateResizeButtonLocation = function() {
	this.resizeButton.hOffset = this.rightFrame.hOffset + this.rightFrame.width -this.resizeButton.width + 5;
	this.resizeButton.vOffset = this.rightFrame.height / 2-this.resizeButton.width /2;	
}


MainWindow.prototype.updateFramesFromCentralGap = function(iCentralGap) {
	this.centralGap = iCentralGap;
	
	this.leftFrame.hOffset = MAINWIN_MAX_CENTRAL_GAP - this.centralGap;
	this.rightFrame.hOffset = 61;
	//this.rightFrame.hOffset = this.leftFrame.hOffset + this.leftFrame.width + this.centralGap;
	this.screwImage.hOffset = this.leftFrame.hOffset + (this.leftBackground.width - this.screwImage.width / 2) + this.screwImage.width / 2;
		
	var p = (this.centralGap - MAINWIN_MIN_CENTRAL_GAP) / (MAINWIN_MAX_CENTRAL_GAP - MAINWIN_MIN_CENTRAL_GAP);
	
	this.screwImage.rotation = -p * 360;
	
	this.startButton.opacity = 1 + 254 - p * 254;
	
	this.infoAreaActiveCanvas.opacity = 255 - p * 255;
	
	this.eventFrame.opacity = 177 + (1 - p) * 255;
	
	this.startButtonStopIcon.opacity = (1 - p) * 255;
	this.startButtonPlayIcon.opacity = (p) * 255;
	
	this.updateResizeButtonLocation();
}


MainWindow.prototype.update = function() {
	
	var canvases = [this.infoAreaCanvas, this.infoAreaActiveCanvas];
	
	for (var i = 0; i < canvases.length; i++) {
		var canvas = canvases[i];
		
		canvas.width = this.rightBackground.width - MAINWIN_INFO_AREA_OFFSET_LEFT - MAINWIN_INFO_AREA_OFFSET_RIGHT;
	
		if (i == 1) canvas.width -= MAINWIN_AA_OFFSET_RIGHT + MAINWIN_AA_OFFSET_LEFT;
	
		var ctx = canvas.getContext("2d");
		
		if (i == 1) {
			ctx.drawImage(this.infoActiveAreaClip0, 0, 0);
			ctx.drawImage(this.infoActiveAreaClip1, this.infoActiveAreaClip0.width, 0, canvas.width - this.infoActiveAreaClip0.width - this.infoActiveAreaClip2.width, this.infoAreaClip0.height);
			ctx.drawImage(this.infoActiveAreaClip2, this.infoActiveAreaClip0.width + (canvas.width - this.infoActiveAreaClip0.width - this.infoActiveAreaClip2.width), 0);			

			ctx.globalCompositeOperation = "source-atop";

			var grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
			grad.addColorStop(0, preferences.glassColor1.value);
			grad.addColorStop(1, preferences.glassColor2.value);
			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		
		} else {
			ctx.drawImage(this.infoAreaClip0, 0, 0);
			ctx.drawImage(this.infoAreaClip1, this.infoAreaClip0.width, 0, canvas.width - this.infoAreaClip0.width - this.infoAreaClip2.width, this.infoAreaClip0.height);
			ctx.drawImage(this.infoAreaClip2, this.infoAreaClip0.width + (canvas.width - this.infoAreaClip0.width - this.infoAreaClip2.width), 0);
		
			ctx.globalCompositeOperation = "source-atop";
			
			ctx.drawImage(i == 0 ? this.infoAreaInactiveImage : this.infoAreaActiveImage, 0, 0);
		}		
	}
	
	this.infoAreaHL.width = this.infoAreaCanvas.width;
	
	
	
	this.expandButtonClosedDrawerVOffset = this.rightBackground.height - this.expandButton.height + 2
	
	if (this.drawerOpened) {
		this.attachExpandButtonToDrawer();
	} else {		
		this.expandButton.hOffset = this.rightBackground.hOffset + this.rightBackground.width + 15
		this.expandButton.vOffset = this.expandButtonClosedDrawerVOffset;
	}

	
	// The two labels share one line, so the space has to be divided rather
	// than given to whichever is measured first. This used to subtract the
	// option label's width outright, which was safe while it was always the
	// 20px "[+]" — now that it can hold a task name, a long one starved the
	// project name down to a bare ellipsis.
	//
	// The project name gets first claim, capped at half the line so it can't
	// starve the task either, and the task takes whatever is left.
	this.projectOptionText.width = null;
	this.projectOptionText.truncation = null;

	var available = this.infoAreaCanvas.width - 35;
	var gap = 4;

	this.projectNameText.width = null;
	this.projectNameText.truncation = null;

	var nameWidth = this.projectNameText.width;
	var taskWidth = this.projectOptionText.width;

	if (nameWidth + gap + taskWidth > available) {
		var nameBudget = Math.max(Math.floor((available - gap) / 2), available - gap - taskWidth);
		if (nameWidth > nameBudget) {
			nameWidth = nameBudget;
			this.projectNameText.width = nameWidth;
			this.projectNameText.truncation = "end";
		}

		var taskBudget = available - gap - nameWidth;
		if (taskWidth > taskBudget) {
			this.projectOptionText.width = Math.max(taskBudget, 0);
			this.projectOptionText.truncation = "end";
		}
	}

	this.projectOptionText.hOffset = this.projectNameText.hOffset + this.projectNameText.width + gap;
	
	
	this.projectNameTextUnderline.hOffset = this.projectNameText.hOffset;
	this.projectNameTextUnderline.vOffset = this.projectNameText.vOffset + this.projectNameText.height;
	this.projectNameTextUnderline.width = this.projectNameText.width;

	// Underlined only when it names a task. The bare [+] is already read as
	// a button — underlining the brackets just looks like a mistake.
	this.projectOptionTextUnderline.hOffset = this.projectOptionText.hOffset;
	this.projectOptionTextUnderline.vOffset = this.projectOptionText.vOffset + this.projectOptionText.height;
	this.projectOptionTextUnderline.visible = this.projectOptionText.data != "[+]";
	this.projectOptionTextUnderline.width = this.projectOptionText.width;

	
	// Dimmed when it names the current task, so it reads as secondary to the
	// project name; full strength as the bare [+] affordance, which needs to
	// be noticeable enough to invite a click.
	if (this.projectEvent == null) {
		this.projectOptionText.opacity = 100;
	} else {
		this.projectOptionText.opacity = this.projectOptionText.data == "[+]" ? 255 : 190;
	}
	

	this.updateResizeButtonLocation();
	
}