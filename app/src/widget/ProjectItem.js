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


function ProjectItem() {
	this.frame = new Frame();
	
	this.label = new Widgui.Label();
	this.label.setText("test");
	this.label.setStyle(Styles.header);
	
	this.clearButton = new Widgui.GraphicButton(undefined, Main.skinFolder + "/ClearButton");
	this.clearButton.setTooltip(loc("global_delete"));
	
	this.editButton = new Widgui.GraphicButton(undefined, Main.skinFolder + "/EditButton");
	this.editButton.setTooltip(loc("global_edit"));
	
	this.addTaskButton = new Widgui.GraphicButton(undefined, Main.skinFolder + "/AddTaskButton");
	this.addTaskButton.setTooltip(loc("projectItem_addTask"));
	
	this.frame.appendChild(this.label.frame);
	this.frame.appendChild(this.clearButton.frame);	
	this.frame.appendChild(this.editButton.frame);
	this.frame.appendChild(this.addTaskButton.frame);
	
	this.frame.owner = this;
	this.frame.onMultiClick = function() {
		this.owner.editButton_clicked();
	}	
	
	this.editButton.registerForEvents(this, "editButton_");
	this.clearButton.registerForEvents(this, "clearButton_");
	this.addTaskButton.registerForEvents(this, "addTaskButton_");
	

	
	this.project = undefined;	
}


ProjectItem.prototype.editButton_clicked = function() {
	Main.editProject(this.project);
	this.project.save();
}


ProjectItem.prototype.clearButton_clicked = function() {
	var doIt = Main.deleteProjectMessagebox(this.project);
	if(!doIt) return;
	
	this.project.dispose();
}


ProjectItem.prototype.addTaskButton_clicked = function() {
	var t = gDatabase.createPossibleTask(this.project);
	t.description = loc("possibleTask_defaultDescription");
	t = Main.editPossibleTask(t);
	
	if (t == undefined) return;
	
	gDatabase.addPossibleTask(t);
}


ProjectItem.prototype.loadProject = function(iProject) {
	this.project = iProject;
	this.update();
}


Object.defineProperty(ProjectItem.prototype, "width", { get: function() {
	return this.frame.width;
}, configurable: true, enumerable: true });


Object.defineProperty(ProjectItem.prototype, "width", { set: function(v) {
	this.frame.width = v;
	this.update();
}, configurable: true, enumerable: true });


ProjectItem.prototype.update = function() {
	var controlWidth = this.frame.width;
	
	this.clearButton.setLocation(controlWidth - this.clearButton.getWidth(), 0);
	
	this.editButton.setLocation(this.clearButton.getX() - this.editButton.getWidth() - 4, 0);
	
	this.addTaskButton.setLocation(this.editButton.getX() - this.addTaskButton.getWidth() - 4, 0);
	
	this.label.setText(this.project.name + " (" + this.project.durationUserString + ")");
	this.label.setWidth(controlWidth - (controlWidth - this.addTaskButton.getX()));
	this.label.setTruncation("end");

	//this.editButton.setVisible(this.project.id != 1);
	//this.clearButton.setVisible(this.project.id != 1);	
}