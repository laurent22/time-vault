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



Widgui.Utils.usingControl("DropdownList");
Widgui.Utils.usingControl("Label");
Widgui.Utils.usingControl("TextButton");



var DRAWER_AA_OFFSET = { top:45, left:4, right:4, bottom:17 }

var padding = 12;
var DRAWER_INFO_OFFSET = { top:DRAWER_AA_OFFSET.top, left:padding, right:padding, bottom:DRAWER_AA_OFFSET.bottom };
	


function MainDrawer() {
	this.frame = new Frame();
	
	this.selectedProjectID = 1;
	
	
	
	// ******************************************************************
	// Project controls
	// ******************************************************************
	
	this.projectFrame = new Frame();
	
	this.currentProjectLabel = new Widgui.Label();
	this.currentProjectLabel.setText(loc("drawer_projects_currentProjectLabel"));
	this.currentProjectLabel.setStyle(Styles.header);
	
	this.projectItems = [];
	this.possibleTaskItems = [];
	
	this.projectScrollbar = new ScrollBar();
	this.projectScrollbar.autoHide = false;
	
	
	this.projectFrame.scrollbar = true;
	this.projectFrame.vScrollBar = this.projectScrollbar;	
	
	this.projectDivider1 = new Image();
	this.projectDivider1.src = "Resources/White.png";
	this.projectDivider1.opacity = 128;	

	this.projectDivider2 = new Image();
	this.projectDivider2.src = "Resources/White.png";
	this.projectDivider2.opacity = 128;		
	
	this.projectEmptyText = new Widgui.Label();
	this.projectEmptyText.setText(loc("drawer_projectEmptyList", loc("drawer_projects_newProject")));
	this.projectEmptyText.setStyle(Styles.normalItalic);
	this.projectEmptyText.text.__owner = this;
	this.projectEmptyText.text.onMouseUp = function() {
		this.__owner.newProjectButton_clicked();
	}
	
	this.projectBottomSpacer = new Image();
	this.projectBottomSpacer.src = "Resources/Gray50.png";
	this.projectBottomSpacer.height = 14;
	this.projectBottomSpacer.width = 20;
	this.projectBottomSpacer.opacity = 0;
	
	

	this.projectFrame.owner = this;
	
	this.projectFrame.onContextMenu = function() {
		var items = [];
		var it;		
		
		it = new MenuItem();
		it.title = loc("drawer_projects_ctxMenu_showArchivedProjects");
		it.checked = preferences.showArchivedProjects.value == "1";
		it.owner = this;
		it.onSelect = function() {
			var v = preferences.showArchivedProjects.value;
			preferences.showArchivedProjects.value = v == "1" ? "0" : "1";
			savePreferences();
			this.owner.owner.updateProjectList();
			this.owner.owner.update();
		};
		items.push(it);
	
	
		it = new MenuItem();
		it.title = "-";
		items.push(it);	
		
		this.contextMenuItems = items;	
	}
		

	
	
	
	
	// ******************************************************************
	// Summary controls
	// ******************************************************************
	
	this.infoFrame = new Frame();
	
	this.projectLabel = new Widgui.Label();
	this.projectLabel.setText(loc("drawer_projectLabel"));
	
	this.totalTimeLabel = new Widgui.Label();
	this.totalTimeLabel.setText(loc("drawer_totalTime"));
	
	this.totalTimeLabel2 = new Widgui.Label();
	this.totalTimeLabel2.setText("00:00");
		
	this.projectLabel.setStyle(Styles.header);
	this.totalTimeLabel.setStyle(Styles.header);
	
	this.totalTimeLabel2.setStyle(Styles.normal);
	
	this.projectDD = new Widgui.DropdownList();
	this.projectDD.addItem("test1");
	this.projectDD.addItem("test2");
	
	this.divider = new Image();
	this.divider.src = "Resources/White.png";
	this.divider.opacity = 128;
	
	this.divider2 = new Image();
	this.divider2.src = "Resources/White.png";
	this.divider2.opacity = 128;
	
	this.listColumns = [];
//	this.listColumns.push({ label:undefined, title:loc("drawer_taskList_dateHeader"), propertyName:"startDateUserString", sizeType:"fixed", size:Main.useAmPm() ? 100 : 125 });
//	this.listColumns.push({ label:undefined, title:loc("drawer_taskList_durationHeader"), propertyName:"durationUserString", sizeType:"fixed", size:50 });
//	this.listColumns.push({ label:undefined, title:loc("drawer_taskList_descriptionHeader"), propertyName:"descriptionString", sizeType:"percent", size:1.0 });

	this.listColumns.push({ label:undefined, title:loc("drawer_taskList_dateHeader"), propertyName:"startDateUserString", sizeType:"fixed", size:Main.useAmPm() ? 100 : 125 });
	this.listColumns.push({ label:undefined, title:loc("drawer_taskList_durationHeader"), propertyName:"durationUserString", sizeType:"percent", size:0.25 });
	this.listColumns.push({ label:undefined, title:loc("drawer_taskList_descriptionHeader"), propertyName:"descriptionString", sizeType:"percent", size:0.75 });


	for (var i = 0; i < this.listColumns.length; i++) {
		var c = this.listColumns[i];
		c.label = new Widgui.Label();
		c.label.setText(c.title);
		c.label.setStyle(Styles.header);
	}
	
	this.refreshListColumnProperties();
		
	this.summaryScrollbar = new ScrollBar();
	this.summaryScrollbar.autoHide = false;
	this.summaryScrollbar.thumbColor = preferences.glassColor2.value
	
	this.infoFrame.scrollbar = true;
	this.infoFrame.vScrollBar = this.summaryScrollbar;
	
	this.newEventButton = new Widgui.TextButton(undefined, "Crystal");
	this.newEventButton.setText(loc("drawer_taskList_newTask"));
	
	this.deleteAllEventsButton = new Widgui.TextButton(undefined, "Crystal");
	this.deleteAllEventsButton.setText(loc("global_deleteAll"));	
	
	this.listLabels = [];
	
	this.summaryBottomSpacer = new Image();
	this.summaryBottomSpacer.src = "Resources/Gray50.png";
	this.summaryBottomSpacer.height = 14;
	this.summaryBottomSpacer.width = 20;
	this.summaryBottomSpacer.opacity = 0;
	
	
	
	// ******************************************************************
	// Header buttons
	// ******************************************************************
		
	this.headerButtonFrame = new Frame();	
	
	this.summaryButton = new Widgui.TextButton();
	this.summaryButton.setText(loc("drawer_summaryButton"));
	this.summaryButton.setOnOffButton(true);

	this.projectButton = new Widgui.TextButton();
	this.projectButton.setText(loc("drawer_projectButton"));	
	this.projectButton.setOnOffButton(true);

	
	
	
	
	// ******************************************************************
	// Background elements
	// ******************************************************************	
	
	this.bgCanvas = new Canvas();
	
	this.overlayCanvas = new Canvas();
	
	this.bgImage = new Image();
	this.bgImage.src = Main.skinFolder + "/DrawerBackground.png";

	this.drawerOverlayImage = new Image();
	this.drawerOverlayImage.src = Main.skinFolder + "/DrawerOverlay.png";
		
	this.activeAreaClip = new Image();
	this.activeAreaClip.src = Main.skinFolder + "/DrawerActiveAreaClip.png";

	this.activeAreaCanvas = new Canvas();
	
	this.resizeAnchor = new Image();
	this.resizeAnchor.src = "Resources/Gray50.png";
	this.resizeAnchor.width = 18; this.resizeAnchor.height = 18;
	this.resizeAnchor.opacity = 1;
	this.resizeAnchor.owner = this;
	this.resizeAnchor.onMouseDrag = function() { this.owner.resizeAnchor_mouseDrag(); };
	this.resizeAnchor.onMouseDown = function() { this.owner.resizeAnchor_mouseDown(); };
	
	this.newProjectButton = new Widgui.TextButton(undefined, "Crystal");
	
	this.deleteAllProjectsButton = new Widgui.TextButton(undefined, "Crystal");
	
	this.resetAllProjectsButton = new Widgui.TextButton(undefined, "Crystal");
	
	
	


	// ******************************************************************
	// Add the elements to the frame
	// ******************************************************************	
	
	this.headerButtonFrame.appendChild(this.summaryButton.frame);
	this.headerButtonFrame.appendChild(this.projectButton.frame);

	this.infoFrame.appendChild(this.projectLabel.frame);
	this.infoFrame.appendChild(this.totalTimeLabel.frame);
	this.infoFrame.appendChild(this.totalTimeLabel2.frame);
	this.infoFrame.appendChild(this.projectDD.frame);
	this.infoFrame.appendChild(this.divider);
	this.infoFrame.appendChild(this.divider2);
	this.infoFrame.appendChild(this.newEventButton.frame);
	this.infoFrame.appendChild(this.deleteAllEventsButton.frame);
	this.infoFrame.appendChild(this.summaryBottomSpacer);
	this.projectFrame.appendChild(this.projectBottomSpacer);

	this.projectFrame.appendChild(this.currentProjectLabel.frame);
	this.projectFrame.appendChild(this.newProjectButton.frame);
	this.projectFrame.appendChild(this.deleteAllProjectsButton.frame);
	this.projectFrame.appendChild(this.resetAllProjectsButton.frame);
	this.projectFrame.appendChild(this.projectDivider1);
	this.projectFrame.appendChild(this.projectDivider2);
	this.projectFrame.appendChild(this.projectEmptyText.frame);
	
	this.frame.appendChild(this.bgCanvas);
	this.frame.appendChild(this.resizeAnchor);
	this.frame.appendChild(this.headerButtonFrame);
	this.frame.appendChild(this.activeAreaCanvas);
	this.frame.appendChild(this.overlayCanvas);
	this.frame.appendChild(this.infoFrame);
	this.frame.appendChild(this.summaryScrollbar);
	this.frame.appendChild(this.projectScrollbar);
	this.frame.appendChild(this.projectFrame);
	//this.frame.appendChild(this.drawerHL.frame);

	
	for (var i = 0; i < this.listColumns.length; i++) {
		var c = this.listColumns[i];
		this.infoFrame.appendChild(c.label.frame);
	}	





	// ******************************************************************
	// Initial position
	// ******************************************************************	
		
	this.frame.width = 200;
	this.frame.height = 200;
		
	this.activeAreaCanvas.hOffset = this.bgCanvas.hOffset + DRAWER_AA_OFFSET.left;
	this.activeAreaCanvas.vOffset = this.bgCanvas.vOffset + DRAWER_AA_OFFSET.top;
	
	this.infoFrame.hOffset = DRAWER_INFO_OFFSET.left;
	this.infoFrame.vOffset = DRAWER_INFO_OFFSET.top;
	
	this.headerButtonFrame.hOffset = DRAWER_AA_OFFSET.left;
	this.headerButtonFrame.vOffset = DRAWER_AA_OFFSET.top - this.summaryButton.getHeight() - DRAWER_AA_OFFSET.left;
	
//	this.drawerHL.hOffset = DRAWER_AA_OFFSET.left - 1;
//	this.drawerHL.vOffset = DRAWER_AA_OFFSET.top;
	
	
	

	// ******************************************************************
	// Event registration
	// ******************************************************************		
	
	this.projectDD.registerForEvents(this, "projectDD_");
	this.summaryButton.registerForEvents(this, "summaryButton_");
	this.projectButton.registerForEvents(this, "projectButton_");
	this.newProjectButton.registerForEvents(this, "newProjectButton_");
	this.deleteAllProjectsButton.registerForEvents(this, "deleteAllProjectsButton_");
	this.resetAllProjectsButton.registerForEvents(this, "resetAllProjectsButton_");
	this.newEventButton.registerForEvents(this, "newEventButton_");
	this.deleteAllEventsButton.registerForEvents(this, "deleteAllEventsButton_");
	gDatabase.registerForEvents(this, "database_");
	Main.registerForEvents(this, "Main_");
	
	
	
	
	
	
	
	
	this.summaryButton.setOnOffState("on");
	this.summaryButton.enableInteractions(false);
	this.projectButton.enableInteractions(true);	
	
	
	
	
	this.summaryFrameAnimation = new Puppeteer.Animation();
	this.summaryFrameAnimation.duration = 400;
	this.summaryFrameAnimation.onUpdate = [this, "summaryFrameAnimation_update"];
	this.summaryFrameAnimation.onDone = [this, "summaryFrameAnimation_done"];
	this.summaryFrameAnimation.easeType = Puppeteer.EaseType.easeOut;
	
//	this.scrollbarFadeAnimation = new Puppeteer.Animation();
//	this.scrollbarFadeAnimation.duration = 200;
//	this.scrollbarFadeAnimation.onUpdate = [this, "scrollbarFadeAnimation_update"];
//	this.scrollbarFadeAnimation.easeType = Puppeteer.EaseType.easeOut;
//
//	this.scrollbarShown = true;
	this.summaryFrameShown = true;
	
	
	this._project = null;
	
	this.projectFrame.visible = false;
	
	this.populateProjectDD();
	
	
	this.isOpened = false;
	

	this.loadProject(gDatabase.getDefaultProject());
}


MainDrawer.prototype = new EventInterface();



MainDrawer.prototype.project getter = function() {
	if (!this._project) return null;
	if (this._project.archived) return null;
	return this._project;
}


MainDrawer.prototype.project setter = function(v) {
	this._project = v;
}


MainDrawer.prototype.refreshListColumnProperties = function() {
	this.listColumns[0].size = Main.useAmPm() ? 125 : 110;
}


MainDrawer.prototype.Main_preferenceChanged = function(iSource, iParam) {	
	
	
	switch (iParam.name) {
		
		case "glassColor1":
		case "glassColor2":
		case "colorScheme":
		
			this.updateScrollbars();
			this.update();
			break;
			
		case "useAmpm":
		case "numberDateFormat":
	
			this.refreshListColumnProperties();	
			this.updateListData();
			this.update();
			break;
		
	}
	
	
}


MainDrawer.prototype.database_eventCollectionChanged = function(iSource, iParam) {
	if (!this.isOpened) return;
	
	this.updateListData();
	this.update();
}


MainDrawer.prototype.database_projectCollectionChanged = function(iSource, iParam) {
	if (this.project == null) {
		var p = gDatabase.getDefaultProject();
		if (p == null) return;
		if (p.archived) return;
		this.loadProject(p);
	}
	
	if (this.project.disposed) {
		var p = gDatabase.getDefaultProject();
		this.loadProject(p);
	}
	
	if (!this.isOpened) return;	
	
	this.populateProjectDD();
	this.updateProjectList();
	this.update();
}


MainDrawer.prototype.database_possibleTaskCollectionChanged = function(iSource, iParam) {
	if (!this.isOpened) return;	
		
	//this.populateProjectDD();
	this.updateListData();
	this.updateProjectList();
	this.update();
}


MainDrawer.prototype.newProjectButton_clicked = function(iSource, iParam) {
	var p = Main.editProject();
	if (p == undefined) return;
		
	gDatabase.addProject(p);
	
}


MainDrawer.prototype.deleteAllProjectsButton_clicked = function(iSource, iParam) {
	var answer = alert(loc("drawer_projects_deleteAllProjectsMessageBox"), loc("global_yesButton"), loc("global_noButton"));
	if (answer == 2) return;
	
	var projects = gDatabase.getProjects();
	
	var showArchivedProjects = preferences.showArchivedProjects.value == "1";
		
	for (var i = projects.length - 1; i >= 0; i--) {
		var p = projects[i];
						
		if (!showArchivedProjects) {
			if (p.archived) continue;
		}
		
		p.dispose();
	}
	
	this.updateProjectList();
	this.update();
}


MainDrawer.prototype.resetAllProjectsButton_clicked = function(iSource, iParam) {
	var answer = alert(loc("drawer_projects_resetAllProjectsMessageBox"), loc("global_yesButton"), loc("global_noButton"));
	if (answer == 2) return;
	
	var projects = gDatabase.getProjects();
	
	var showArchivedProjects = preferences.showArchivedProjects.value == "1";
	
	for (var i = projects.length - 1; i >= 0; i--) {
		var p = projects[i];
		
		if (!showArchivedProjects) {
			if (p.archived) continue;
		}
		
		var events = p.getEvents();
		
		for (var j = events.length - 1; j >= 0; j--) {
			var e = events[j];
			e.dispose();
		}
		
		p.save();		
	}
}


//MainDrawer.prototype.newProjectButton_clicked = function(iSource, iParam) {
//	var p = Main.editProject();
//	if (p == undefined) return;
//		
//	gDatabase.addProject(p);
//}


MainDrawer.prototype.newEventButton_clicked = function(iSource, iParam) {
	if (this.project == null) return;
	
	var e = Main.editEvent(undefined, this.project);
	if (e == undefined) return;
	
	gDatabase.addEvent(e);
}


MainDrawer.prototype.deleteAllEventsButton_clicked = function(iSource, iParam) {
	if (this.project == null) return;
	
	var answer = alert(loc("drawer_taskList_deleteAllEventsMessageBox", this.project.name), loc("global_yesButton"), loc("global_noButton"));
	if (answer == 2) return;
	
	var events = this.project.getEvents();
	
	for (var i = events.length - 1; i >= 0; i--) {
		events[i].dispose();
	}
}


MainDrawer.prototype.summaryButton_clicked = function() {
	this.summaryButton.setOnOffState("on");
	this.projectButton.setOnOffState("off");
	this.projectButton.enableInteractions(true);
	this.summaryButton.enableInteractions(false);
	
	this.showSummaryFrame(true);
}


MainDrawer.prototype.projectButton_clicked = function() {
	this.projectButton.setOnOffState("on");
	this.summaryButton.setOnOffState("off");
	this.summaryButton.enableInteractions(true);
	this.projectButton.enableInteractions(false);
	
	this.showSummaryFrame(false);
}


MainDrawer.prototype.projectDD_selectionChanged = function() {
	this.loadProject(this.projectDD.getSelectedObject());	
}


MainDrawer.prototype.summaryFrameAnimation_update = function(iNewOffset) {
	this.infoFrame.hOffset = iNewOffset;
	this.projectFrame.hOffset = this.infoFrame.hOffset + this.summaryScrollbar.width + this.infoFrame.width + DRAWER_INFO_OFFSET.left;
	this.projectFrame.vOffset = this.infoFrame.vOffset;
	
	this.updateScrollbars();
}


MainDrawer.prototype.summaryFrameAnimation_done = function() {
	this.infoFrame.visible = this.summaryFrameShown;
	this.projectFrame.visible = !this.summaryFrameShown;
	this.updateScrollbars();
}


MainDrawer.prototype.showSummaryFrame = function(iShow) {
	if (iShow == undefined) iShow = true;
	
	this.summaryFrameAnimation.kill();
		
	if (iShow == this.summaryFrameShown) return;
	
	
	
	
	if (!iShow) {
		
		this.updateProjectList();
		this.projectFrame.visible = true;
		this.update();
		this.summaryFrameAnimation.endValue = -this.infoFrame.width - this.summaryScrollbar.width;
				
	} else {
		
		this.infoFrame.visible = true;
		this.infoFrame.hOffset = this.projectFrame.hOffset - this.summaryScrollbar.width - this.infoFrame.width;// + DRAWER_INFO_OFFSET.left;
		this.summaryFrameAnimation.endValue = DRAWER_INFO_OFFSET.left;
		
	}	
	
	
	this.summaryFrameAnimation.startValue = this.infoFrame.hOffset;
	
	
	this.updateScrollbars();
	
	
	this.summaryFrameShown = iShow;
	
	
	Puppeteer.start(this.summaryFrameAnimation);
	
}


MainDrawer.prototype.onOpen = function() {
	this.isOpened = true;
	
	this.populateProjectDD();
	this.updateListData();
	this.update();
}


MainDrawer.prototype.onClose = function() {
	this.isOpened = false;
}


MainDrawer.prototype.populateProjectDD = function() {
	this.projectDD.clear();
	
	var projects = gDatabase.getProjects();
	
	for (var i = 0; i < projects.length; i++) {
		if (projects[i].archived) continue;
		this.projectDD.addItem(projects[i]);
	}	
	
	this.projectDD.selectOneObject(this.project);
}


MainDrawer.prototype.resizeAnchor_mouseDown = function() {
	this.resizingData = {};
	this.resizingData.initialMouseLoc = { x:system.event.screenX, y:system.event.screenY };
	this.resizingData.initialDimensions = { width:this.frame.width, height:this.frame.height };
}


MainDrawer.prototype.resizeAnchor_mouseDrag = function() {
	var ox = system.event.screenX - this.resizingData.initialMouseLoc.x;
	var oy = system.event.screenY - this.resizingData.initialMouseLoc.y;
	
	var h = this.resizingData.initialDimensions.height + oy;
	var w = this.resizingData.initialDimensions.width + ox;
	
	var minH = 110;
	var maxH = 640;
	var minW = MAINWIN_RIGHT_MIN_WIDTH + MAINWIN_DRAWER_WIDTH_INC;//175;
	var maxW = MAINWIN_RIGHT_MAX_WIDTH + MAINWIN_DRAWER_WIDTH_INC;//300;
	
	if (w < minW) w = minW;
	if (h < minH) h = minH;
	if (w > maxW) w = maxW;
	if (h > maxH) h = maxH;
	
	if (this.frame.width != w || this.frame.height != h) {
		this.frame.width = w;
		this.frame.height = h;		
		this.update();
		this.onResized(this, {});
	}
		
}


MainDrawer.prototype.onResized = function(iSource, iParam) {
	this.broadcastEvent(this, "resized", iParam);
}


MainDrawer.prototype.loadProject = function(iProject) {
	this.project = iProject;
	this.updateListData();
	this.update();
}


MainDrawer.prototype.updateProjectList = function() {
	
	includeFile("ProjectItem.js");
	includeFile("PossibleTaskItem.js");
	
	
	var projects = gDatabase.getProjects();
	
	for (var i = 0; i < this.projectItems.length; i++) {
		var l = this.projectItems[i];
		l.frame.visible = false;
		l.frame.hOffset = 0;
		l.frame.vOffset = 0;
	}
	
	for (var i = 0; i < this.possibleTaskItems.length; i++) {
		var l = this.possibleTaskItems[i];
		l.frame.visible = false;
		l.frame.hOffset = 0;
		l.frame.vOffset = 0;
	}
	
	var possibleTaskItemIndex = 0;
	
	var showArchivedProjects = preferences.showArchivedProjects.value == "1";
	
	for (var i = 0; i < projects.length; i++) {
		var p = projects[i];
		
		if (!showArchivedProjects) {
			if (p.archived) continue;
		}		
		
		var it;
		
		if (this.projectItems.length <= i) {
			it = new ProjectItem();
			this.projectFrame.appendChild(it.frame);
			this.projectItems.push(it);
		} else {
			it = this.projectItems[i];
		}		
		
		it.loadProject(p);		
			
		it.frame.visible = true;
		
		var tasks = p.getPossibleTasks();
		var taskItems = [];
		
		for (var j = 0; j < tasks.length; j++) {
			var possibleTask = tasks[j];
			var possibleTaskItem;
						
			if (this.possibleTaskItems.length <= possibleTaskItemIndex) {
				possibleTaskItem = new PossibleTaskItem();
				this.projectFrame.appendChild(possibleTaskItem.frame);
				this.possibleTaskItems.push(possibleTaskItem);
			} else {
				possibleTaskItem = this.possibleTaskItems[possibleTaskItemIndex];
			}	
			
			possibleTaskItem.loadTask(possibleTask);
			
			possibleTaskItem.frame.visible = true;
			
			taskItems.push(possibleTaskItem);
			
			possibleTaskItemIndex++;			
		}
		
		it.__taskItems = taskItems;
		
	}
}


MainDrawer.prototype.updateListData = function() {
	var events;
	
	if (this.project == null) {
		events = [];
	} else {
		if (this.project.archived) {
			events = [];
		} else {
			events = this.project.getEvents();
		}
	}
	
	
	for (var j = 0; j < this.listColumns.length; j++) {
		for (var i = 0; i < this.listLabels.length; i++) {
			var l = this.listLabels[i][j];
			l.setVisible(false);
			l.setLocation(0,0);
			
			if (j == 0) {
				l.__overlayImage.hOffset = 0;
				l.__overlayImage.vOffset = 0;
				l.__overlayImage.visible = false;
			}
		}
	}
	
	
	
	var thisObject = this;
		
	
	for (var i = 0; i < events.length; i++) {
		
		var event = events[i];
						
		var labels = [];
		
		if (this.listLabels.length <= i) {
			
			for (var j = 0; j < this.listColumns.length; j++) {
				var c = this.listColumns[j];
				
				var l = new Widgui.Label();
				l.setStyle(Styles.normal);
				
				this.infoFrame.appendChild(l.frame);
				
				if (j == 0) {
					var overlayImage = new Image();
					overlayImage.src = "Resources/Gray50.png";
					overlayImage.opacity = 1;
					overlayImage.colorize = "#ffffff";
					overlayImage.tooltip = loc("global_rightClickForMore");
					overlayImage.__fadeAnimation = new Puppeteer.Animation();
					overlayImage.__fadeAnimation.onUpdate = [overlayImage, "opacity"];
					//overlayImage.__event = event;
					
					overlayImage.onMouseEnter = function() {
						this.__fadeAnimation.kill();
						this.opacity = 50;
					}
					
					overlayImage.onMouseExit = function() {
						this.__fadeAnimation.duration = 200;
						this.__fadeAnimation.startValue = this.opacity;
						this.__fadeAnimation.endValue = 1;
						Puppeteer.start(this.__fadeAnimation)
					}
					
					overlayImage.onMultiClick = function() {
						thisObject.eventMenuItem_selected(this, { name:"edit", event:this.__event });
					}	
					
					l.__overlayImage = overlayImage;
					this.infoFrame.appendChild(overlayImage);
				}
								
				labels.push(l);
			}
			
			this.listLabels.push(labels);
			
		} else {
			labels = this.listLabels[i];
		}
		
		
		
		for (var j = 0; j < this.listColumns.length; j++) {
			var c = this.listColumns[j];
			var l = labels[j];
						
			var v = event[c.propertyName];			
			l.setText(v);
			l.setVisible(true);
									
			if (l.__overlayImage != undefined) {
				l.__overlayImage.visible = true;
				l.__overlayImage.__event = event;
				
				l.__overlayImage.onContextMenu = function() {
					var items = []
					var it;
																						
					it = new MenuItem();
					it.title = loc("global_edit");
					it.__event = this.__event;
					it.onSelect = function() { thisObject.eventMenuItem_selected(this, { name:"edit", event:this.__event }); }
					
					items.push(it);
					
					it = new MenuItem();
					it.title = loc("global_delete");
					it.__event = this.__event;
					it.onSelect = function() { thisObject.eventMenuItem_selected(this, { name:"delete", event:this.__event }); }
					
					items.push(it);
					
					it = new MenuItem();
					it.title = "-";
					
					items.push(it);
					
					this.contextMenuItems = items;
				}
			}
						
			if (j == 0) {
//				l.frame.onMultiClick = function() {
//					thisObject.eventMenuItem_selected(this, { name:"edit", event:this.__event });
//				}
//
//				l.frame.__event = event;
//				
//				l.frame.onContextMenu = function() {
//					var items = []
//					var it;
//										
//					it = new MenuItem();
//					it.title = loc("global_edit");
//					it.__event = this.__event;
//					it.onSelect = function() { thisObject.eventMenuItem_selected(this, { name:"edit", event:this.__event }); }
//					
//					items.push(it);
//					
//					it = new MenuItem();
//					it.title = loc("global_delete");
//					it.__event = this.__event;
//					it.onSelect = function() { thisObject.eventMenuItem_selected(this, { name:"delete", event:this.__event }); }
//					
//					items.push(it);
//					
//					it = new MenuItem();
//					it.title = "-";
//					
//					items.push(it);
//					
//					this.contextMenuItems = items;
//				}
			}
		}
				
	}
}


MainDrawer.prototype.eventMenuItem_selected = function(iSource, iParam) {
	
	var event = iParam.event;
	
	
	
	switch (iParam.name) {
		
		case "delete":
		
			var answer = alert(loc("drawer_taskList_deleteEvent"), loc("global_yesButton"), loc("global_noButton"));
			if (answer == 1) event.dispose();
			break;
			
		case "edit":
		
			Main.editEvent(event);
			break;
			
	}
}


MainDrawer.prototype.updateScrollbars = function() {
	this.summaryScrollbar.hOffset = this.infoFrame.hOffset + this.infoFrame.width - this.summaryScrollbar.width + 5;
	this.summaryScrollbar.vOffset = this.infoFrame.vOffset + 4;
	this.summaryScrollbar.height = this.infoFrame.height - 8;
	this.summaryScrollbar.visible = this.infoFrame.visible;
	
	this.projectScrollbar.hOffset = this.projectFrame.hOffset + this.projectFrame.width - this.projectScrollbar.width + 5;
	this.projectScrollbar.vOffset = this.projectFrame.vOffset + 4;
	this.projectScrollbar.height = this.projectFrame.height - 8;
	this.projectScrollbar.visible = this.projectFrame.visible;
	
	this.summaryScrollbar.thumbColor = preferences.glassColor2.value
	this.projectScrollbar.thumbColor = preferences.glassColor2.value
}


MainDrawer.prototype.update = function() {
	var controlWidth = this.frame.width;
	var controlHeight = this.frame.height;
	
	var controlVOffset = 8; 
	var controlHOffset = 6;
	
	
	
	
	
	
	// ******************************************************************
	// Background elements
	// ******************************************************************	
	
	this.bgCanvas.width = controlWidth;
	this.bgCanvas.height = controlHeight;
	
	this.activeAreaCanvas.width = this.bgCanvas.width - DRAWER_AA_OFFSET.left - DRAWER_AA_OFFSET.right;
	this.activeAreaCanvas.height = this.bgCanvas.height - DRAWER_AA_OFFSET.top - DRAWER_AA_OFFSET.bottom;
	
	var ctx = this.bgCanvas.getContext("2d");
	
	ctx.clearRect(0,0,this.bgCanvas.width, this.bgCanvas.height);	
	
	drawRectangleImage(ctx, this.bgImage, this.bgCanvas.width, this.bgCanvas.height);	
	
	ctx = this.activeAreaCanvas.getContext("2d");
	
	drawRectangleImage(ctx, this.activeAreaClip, this.activeAreaCanvas.width, this.activeAreaCanvas.height);

	ctx.globalCompositeOperation = "source-atop";

	var grad = ctx.createLinearGradient(0, 0, this.activeAreaCanvas.width, this.activeAreaCanvas.height);
	grad.addColorStop(0, preferences.glassColor1.value);
	grad.addColorStop(1, preferences.glassColor2.value);

	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, this.activeAreaCanvas.width, this.activeAreaCanvas.height);	
	
	this.resizeAnchor.hOffset = controlWidth - this.resizeAnchor.width;
	this.resizeAnchor.vOffset = controlHeight - this.resizeAnchor.height;
	
	
	this.overlayCanvas.width = this.activeAreaCanvas.width;
	this.overlayCanvas.height = this.activeAreaCanvas.height;
	this.overlayCanvas.hOffset = this.activeAreaCanvas.hOffset;
	this.overlayCanvas.vOffset = this.activeAreaCanvas.vOffset;
	
	ctx = this.overlayCanvas.getContext("2d");
	
	ctx.clearRect(0,0,this.overlayCanvas.width, this.overlayCanvas.height);	
	
	drawRectangleImage(ctx, this.drawerOverlayImage, this.overlayCanvas.width, this.overlayCanvas.height);	
	
	this.overlayCanvas.hOffset = this.activeAreaCanvas.hOffset;
	this.overlayCanvas.vOffset = this.activeAreaCanvas.vOffset;
	
	
	
	
	
	
	
	
	
	// ******************************************************************
	// Summary elements
	// ******************************************************************	
	
	this.newEventButton.enable(this.project != null);
	this.deleteAllEventsButton.enable(this.project != null);
	
	var infoWidth = controlWidth - DRAWER_INFO_OFFSET.left - DRAWER_INFO_OFFSET.right;
	var infoHeight = controlHeight - DRAWER_INFO_OFFSET.top - DRAWER_INFO_OFFSET.bottom;
	
	this.infoFrame.width = infoWidth;
	this.infoFrame.height = infoHeight;
	
	infoWidth -= this.summaryScrollbar.width;
	
	var topLabels = [ this.projectLabel, this.totalTimeLabel ];
	var labelMaxWidth = 0;
	for (var i = 0; i < topLabels.length; i++) {
		var l = topLabels[i];
		if (l.getWidth() > labelMaxWidth) labelMaxWidth = l.getWidth();
	}
	
	var labelY = 6;
	for (var i = 0; i < topLabels.length; i++) {
		var l = topLabels[i];
		l.setX(labelMaxWidth - l.getWidth());
		l.setY(labelY);
		labelY += l.getHeight() + controlVOffset;
	}
	
	
	if (this.project != null) {
		this.totalTimeLabel2.setText(this.project.durationUserString);
		this.projectDD.enable();
	} else {
		this.totalTimeLabel2.setText("--:--");
		this.projectDD.disable();
	}
	
	
	this.projectDD.setWidth(infoWidth - this.projectLabel.getRight() - controlHOffset);
	this.projectDD.setLocation(this.projectLabel.getRight() + controlHOffset, this.projectLabel.getY() - (this.projectDD.getHeight() - this.projectLabel.getHeight()) / 2);
	
	this.totalTimeLabel2.setLocation(this.totalTimeLabel.getRight() + controlHOffset, this.totalTimeLabel.getY());
	
	this.divider.width = infoWidth;
	this.divider.vOffset = this.totalTimeLabel.getY() + this.totalTimeLabel.getHeight() + controlVOffset;


	// ********* Calculate the list remaining width

	var columnInitialRemainingWidth = infoWidth;

	for (var i = 0; i < this.listColumns.length; i++) {
		var c = this.listColumns[i];		
		if (c.sizeType == "fixed") {
			columnInitialRemainingWidth -= c.size;
		}
	}
	
	
	// ********* Set header positions
	
	var headerX = 0;
	var headerY = this.divider.vOffset + this.divider.height + controlVOffset;
	
	for (var i = 0; i < this.listColumns.length; i++) {
		var c = this.listColumns[i];
				
		c.label.setLocation(headerX, headerY);

		var labelWidth = 0;
		
		if (c.sizeType == "percent") {
			labelWidth = columnInitialRemainingWidth * c.size;
		} else {
			labelWidth = c.size;
		}
		
		c.label.setWidth(labelWidth);
		c.label.setTruncation("end");
		
		headerX += labelWidth;
	}
	
	
	
	// ********* Set data position

	var fieldX = 0;
	var fieldY = 0;

	for (var i = 0; i < this.listColumns.length; i++) {
		var c = this.listColumns[i];
							
		var labelWidth = 0;
		
		if (c.sizeType == "percent") {
			labelWidth = columnInitialRemainingWidth * c.size;
		} else {
			labelWidth = c.size;
		}
		
		fieldY = headerY + this.listColumns[0].label.getHeight() + controlVOffset;
			
		for (var j = 0; j < this.listLabels.length; j++) {		
			var labels = this.listLabels[j];
			
			var l = labels[i];
			
			if (!l.getVisible()) break;
						
			l.setLocation(fieldX, fieldY);			
			l.setWidth(labelWidth);
			l.setTruncation("end");		
						
			if (i == 0) {
				var oPadding = 4;
				l.__overlayImage.hOffset = l.getX() - oPadding;
				l.__overlayImage.vOffset = l.getY() - oPadding;
				l.__overlayImage.width = infoWidth + oPadding * 2;
				l.__overlayImage.height = l.getHeight() + oPadding * 2;
				l.__overlayImage.orderBelow(null);
			}
			
			fieldY += l.getHeight() + controlVOffset;
		}
						
		fieldX += labelWidth;
	}
	
		
	this.divider2.width = infoWidth;
	this.divider2.vOffset = fieldY + 4 ;
	
	this.newEventButton.setY(this.divider2.vOffset + controlVOffset * 1.5);
	Styles.crystalButton.applyTo(this.newEventButton.text);
	this.newEventButton.fitToText();		
	
	this.deleteAllEventsButton.setX(this.newEventButton.getX() + this.newEventButton.getWidth() + controlHOffset);
	this.deleteAllEventsButton.setY(this.newEventButton.getY());
	Styles.crystalButton.applyTo(this.deleteAllEventsButton.text);
	this.deleteAllEventsButton.fitToText();		
	
	this.summaryBottomSpacer.vOffset = this.newEventButton.getY() + this.newEventButton.getHeight();
	
	
	
	
	
	
	
	
	// ******************************************************************
	// Project elements
	// ******************************************************************		
		
	this.projectFrame.width = infoWidth + this.summaryScrollbar.width;
	this.projectFrame.height = infoHeight;
		
	this.currentProjectLabel.setLocation(0, this.projectLabel.getY());
	
	this.projectDivider1.width = infoWidth;
	this.projectDivider1.vOffset = this.currentProjectLabel.getY() + this.currentProjectLabel.getHeight() + controlVOffset;
	

	
	var x = 0;
	var y = this.currentProjectLabel.getY() + this.currentProjectLabel.getHeight() + controlVOffset * 2;
	var taskIndent = 16;
	var taskVMargin = 0//controlVOffset//controlVOffset * 0.2;
	
	var oneProjectVisible = false;
	
	for (var i = 0; i < this.projectItems.length; i++) {
		var it = this.projectItems[i];
				
		if (!it.frame.visible) continue;
		
		oneProjectVisible = true;
		
		it.frame.hOffset = x;
		it.frame.vOffset = y;
		
		it.width = infoWidth;
		
		var taskItems = it.__taskItems;
		
		
		if (taskItems.length == 0) {
			
			y += it.frame.height + controlVOffset;
			
		} else {
			
			y += it.frame.height + taskVMargin;
			
			for (var j = 0; j < taskItems.length; j++) {
				var taskItem = taskItems[j];
				taskItem.frame.hOffset = x + taskIndent;
				taskItem.frame.vOffset = y;
				taskItem.width = infoWidth - taskIndent;
				y += taskItem.frame.height + taskVMargin;
			}
			
			y -= taskVMargin;
			y += controlVOffset
			
		}
		
	}
	
	
	if (this.project == null && !oneProjectVisible) {
		this.projectEmptyText.setVisible(true);
		this.projectEmptyText.setLocation(this.projectDivider1.hOffset, this.projectDivider1.vOffset + controlVOffset);
	} else {
		this.projectEmptyText.setVisible(false);
	}
	
	
	this.projectDivider2.width = infoWidth;
	
	if (this.project == null && !oneProjectVisible) {
		this.projectDivider2.vOffset = this.projectEmptyText.getY() + this.projectEmptyText.getHeight() + controlVOffset;
	} else {
		this.projectDivider2.vOffset = y;
	}
	
	this.newProjectButton.setLocation(this.currentProjectLabel.getX(), this.projectDivider2.vOffset + controlVOffset * 1.5);
	Styles.crystalButton.applyTo(this.newProjectButton.text);
	this.newProjectButton.setText(loc("drawer_projects_newProject"));
	this.newProjectButton.fitToText();
	
	this.deleteAllProjectsButton.setLocation(this.newProjectButton.getRight() + controlHOffset, this.newProjectButton.getY());
	Styles.crystalButton.applyTo(this.deleteAllProjectsButton.text);
	this.deleteAllProjectsButton.setText(loc("global_deleteAll"));
	this.deleteAllProjectsButton.fitToText();

	this.resetAllProjectsButton.setLocation(this.deleteAllProjectsButton.getRight() + controlHOffset, this.newProjectButton.getY());
	Styles.crystalButton.applyTo(this.resetAllProjectsButton.text);
	this.resetAllProjectsButton.setText(loc("drawer_projects_resetAllProjects"));
	this.resetAllProjectsButton.fitToText();
	
	this.projectBottomSpacer.vOffset = this.resetAllProjectsButton.getY() + this.resetAllProjectsButton.getHeight();
	
	
	this.deleteAllProjectsButton.enable(this.project != null || oneProjectVisible);
	this.resetAllProjectsButton.enable(this.project != null || oneProjectVisible);
			
	
	this.updateScrollbars();
	
	
	
	
	
	// ******************************************************************
	// Header buttons
	// ******************************************************************			
	
	this.headerButtonFrame.width = controlWidth - DRAWER_AA_OFFSET.right - DRAWER_AA_OFFSET.left;
	
	var buttonGap = 6;
	this.projectButton.setWidth((this.headerButtonFrame.width - buttonGap) / 2);
	this.summaryButton.setWidth(this.projectButton.getWidth());
	
	this.projectButton.setLocation(this.headerButtonFrame.width - this.projectButton.getWidth(), this.summaryButton.getY());
	
	
	
	
	
}