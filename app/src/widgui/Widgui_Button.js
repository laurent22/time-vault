
// This is virtual class which implements the basic functionnalities of a button

function Widgui_Button(iInitialize) {
	if (iInitialize == undefined || iInitialize) this.initialize();
}


Widgui_Button.prototype = new Widgui_UserControl(false);
Widgui_Button.prototype.buttonAncestor = Widgui_UserControl.prototype;


Widgui_Button.prototype.initialize = function() {
	this.buttonAncestor.initialize.call(this);
	this.addType("Button");
	
	this.rootFrame = this.getRootFrame();
		
	this.rootFrame.__buttonControl = this;
	
	this.updateMouseEventAssignment();
	
	this.stateFrames = {};
		
	this.isOnOffButton = false;
	this.onOffState = "off";
	this.clicked = false;
	this.doClick = false;
	this.state = "up";
}


Widgui_Button.prototype.getOnOffState = function() {	
	if (!this.isOnOffButton) return undefined;
	return this.onOffState;
}


Widgui_Button.prototype.setOnOffState = function(v) {	
	if (v == "on") {
		this.onOffState = v;	
	} else {
		this.onOffState = "off";
	}
	
	if (this.onOffState == "on") {
		this.setState("down");
	} else {
		this.setState("up");
	}
}


Widgui_Button.prototype.setOnOffButton = function(v) {	
	this.isOnOffButton = v;
}


Widgui_Button.prototype.getOnOffButton = function() {	
	return this.isOnOffButton;
}


Widgui_Button.prototype.enableInteractions = function(iEnable) {
	if (iEnable == undefined) iEnable = true;
		
	if (iEnable) {
		this.rootFrame.onMouseEnter = function() { this.__buttonControl.onMouseEnter(); }
		this.rootFrame.onMouseExit = function() { this.__buttonControl.onMouseExit(); }
		this.rootFrame.onMouseDown = function() { this.__buttonControl.onMouseDown(); }
		this.rootFrame.onMouseUp = function() { this.__buttonControl.onMouseUp(); }
		this.rootFrame.onMultiClick = function() { this.__buttonControl.onMultiClick(); }
	} else {
		this.rootFrame.onMouseEnter = null;
		this.rootFrame.onMouseExit = null;
		this.rootFrame.onMouseDown = null;
		this.rootFrame.onMouseUp = null;
		this.rootFrame.onMultiClick = null;
	}
}


Widgui_Button.prototype.updateMouseEventAssignment = function() {
	this.enableInteractions(this.isEnabled());
	
//	if (this.isEnabled()) {
//		this.rootFrame.onMouseEnter = function() { this.__buttonControl.onMouseEnter(); }
//		this.rootFrame.onMouseExit = function() { this.__buttonControl.onMouseExit(); }
//		this.rootFrame.onMouseDown = function() { this.__buttonControl.onMouseDown(); }
//		this.rootFrame.onMouseUp = function() { this.__buttonControl.onMouseUp(); }
//		this.rootFrame.onMultiClick = function() { this.__buttonControl.onMultiClick(); }
//	} else {
//		this.rootFrame.onMouseEnter = null;
//		this.rootFrame.onMouseExit = null;
//		this.rootFrame.onMouseDown = null;
//		this.rootFrame.onMouseUp = null;
//		this.rootFrame.onMultiClick = null;
//	}
}


Widgui_Button.prototype.onEnabledChanged = function(iSource, iParam) {
	this.setState("up");
	this.buttonAncestor.onEnabledChanged.call(iSource, iParam);	
	this.updateMouseEventAssignment();
}


Widgui_Button.prototype.setStateFrame = function(iState, iFrame) {
	this.stateFrames[iState] = iFrame;
}


Widgui_Button.prototype.setState = function(iState) {
	for (var i in this.stateFrames) {
		var f = this.stateFrames[i];
		f.visible = i == iState;
	}
	
	this.state = iState;
	
	this.update();
}


Widgui_Button.prototype.setWidth = function(iWidth) {
	this.buttonAncestor.setWidth.call(this, iWidth);
	this.update();
}


Widgui_Button.prototype.setHeight = function(iHeight) {
	this.buttonAncestor.setHeight.call(this, iHeight);
	this.update();
}


Widgui_Button.prototype.getState = function() {
	return this.state;
}


Widgui_Button.prototype.onMouseEnter = function() {
	if (this.clicked) {
		this.setState("down");
		this.doClick = true;
	} else {
		if (this.isOnOffButton) {
			if (this.getOnOffState() == "off") this.setState("over");
		} else {
			this.setState("over");
		}
	}
	
	this.broadcastEvent("mouseEnter");
}


Widgui_Button.prototype.onMouseExit = function() {
	if (this.isOnOffButton) {
		if (this.getOnOffState() == "off") this.setState("up");
	} else {
		this.setState("up");
	}
	
	this.doClick = false;
	
	this.broadcastEvent("mouseExit");
}


Widgui_Button.prototype.onMouseDown = function() {
	if (this.isOnOffButton) {
		if (this.getOnOffState() == "off") this.setState("down");
	} else {
		this.setState("down");
	}	
	
	this.clicked = true;	
	this.doClick = true;
}


Widgui_Button.prototype.onMouseUp = function() {
	if (this.clicked && this.doClick) {
		
		if (this.getOnOffState() == "off") {
			this.onOffState = "on";
		} else {
			this.onOffState = "off";
		}
		
		this.onClicked(this, {});
		
		if (!this.isEnabled()) {
			this.setState("up");
		} else {
			if (this.isOnOffButton) {
				if (this.getOnOffState() == "off") this.setState("over");
			} else if (this.getState() != "up") {
				this.setState("over");
			}
		}
		
	} else {
		if (this.isOnOffButton) {
			if (this.getOnOffState() == "off") this.setState("up");
		} else {
			this.setState("up");
		}
	}
	
	this.clicked = false;
}


Widgui_Button.prototype.onMultiClick = function() {
	this.onClicked(this, {});
	
	if (this.isOnOffButton) {
		if (this.getOnOffState() == "off") this.setState("over");
	} else {
		this.setState("over");
	}
	
	this.clicked = false;
}


Widgui_Button.prototype.isClicked = function() {
	return this.clicked;
}


Widgui_Button.prototype.onClicked = function(iSource, iParam) {
	this.broadcastEvent(iSource, "clicked", iParam);
}


Widgui_Button.prototype.update = function() {

}