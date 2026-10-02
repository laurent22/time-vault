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



function PossibleTaskItem() {
	this.padding = { left:4, top:2, bottom:2, right:0 };
	
	this.frame = new Frame();
	
	this.label = new Widgui.Label();
	this.label.setText("test");
	this.label.setStyle(Styles.normal);
	
	this.clearButton = new Widgui.GraphicButton(undefined, Main.skinFolder + "/ClearButton");
	this.clearButton.setTooltip(loc("global_delete"));
	
	this.editButton = new Widgui.GraphicButton(undefined, Main.skinFolder + "/EditButton");
	this.editButton.setTooltip(loc("global_edit"));
	
	this.overlayImage = new Image();
	this.overlayImage.src = "Resources/Gray50.png";
	this.overlayImage.colorize = "#ffffff";
	this.overlayImage.opacity = 1;
	
	
	this.frame.appendChild(this.overlayImage);
	this.frame.appendChild(this.label.frame);
	this.frame.appendChild(this.clearButton.frame);	
	this.frame.appendChild(this.editButton.frame);	

	this.frame.owner = this;
	this.frame.onMultiClick = function() {
		this.owner.editButton_clicked();
	}	

	this.frame.onMouseEnter = function() { this.owner.onMouseEnter(); }	
	this.frame.onMouseExit = function() { this.owner.onMouseExit(); }
	
	
	this.editButton.registerForEvents(this, "editButton_");
	this.clearButton.registerForEvents(this, "clearButton_");
	
	
	this.fadeOverlayAnimation = new Puppeteer.Animation();
	this.fadeOverlayAnimation.onUpdate = [this.overlayImage, "opacity"];
	
	
	
	this.task = undefined;	
}


PossibleTaskItem.prototype.onMouseEnter = function() {
	this.fadeOverlayAnimation.kill();
	this.overlayImage.opacity = 50;
}


PossibleTaskItem.prototype.onMouseExit = function() {
	this.fadeOverlayAnimation.duration = 200;
	this.fadeOverlayAnimation.startValue = this.overlayImage.opacity;
	this.fadeOverlayAnimation.endValue = 1;
	Puppeteer.start(this.fadeOverlayAnimation)
}


PossibleTaskItem.prototype.editButton_clicked = function() {
	Main.editPossibleTask(this.task);
	this.task.save();
}


PossibleTaskItem.prototype.clearButton_clicked = function() {
	var doIt = Main.deletePossibleTaskMessagebox(this.task);
	if(!doIt) return;
	
	this.task.dispose();
}


PossibleTaskItem.prototype.loadTask = function(iTask) {
	this.task = iTask;
	this.update();
}


Object.defineProperty(PossibleTaskItem.prototype, "width", { get: function() {
	return this.frame.width;
}, configurable: true, enumerable: true });


Object.defineProperty(PossibleTaskItem.prototype, "width", { set: function(v) {
	this.frame.width = v;
	this.update();
}, configurable: true, enumerable: true });


PossibleTaskItem.prototype.update = function() {
	var controlWidth = this.frame.width;
	
	this.clearButton.setLocation(controlWidth - this.clearButton.getWidth(), this.padding.top);
	
	this.editButton.setLocation(this.clearButton.getX() - this.editButton.getWidth() - 4, this.padding.top);
		
	this.label.setText(this.task.description + " (" + Main.getDurationString(this.task.duration) + ")");
	this.label.setWidth(controlWidth - (controlWidth - this.editButton.getX()));
	this.label.setTruncation("end");
	this.label.setLocation(this.padding.left, this.padding.top + (this.editButton.getHeight() - this.label.getHeight()) / 2);
	
	this.overlayImage.width = controlWidth;
	this.overlayImage.height = this.editButton.getHeight() + this.padding.bottom + this.padding.top;
}