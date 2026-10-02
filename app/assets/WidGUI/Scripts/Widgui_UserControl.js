


function Widgui_UserControl(iInitialize) {
	if (iInitialize == undefined || iInitialize) this.initialize();
}

Widgui.UserControl = Widgui_UserControl;


Widgui_UserControl.prototype.initialize = function() {
	this.frame = new Frame();
	this.layoutSuspended = false;
	this.controls = [];
	this.parentControl = undefined;
	this.types = ["UserControl"];
	this.id = Widgui.Utils.getUniqueID();
	this.name = "Control" + this.id;
	this.enabled = true;
	this.alternateSkinDirectory = undefined;
	
	Widgui.rememberControl(this);
}


Widgui_UserControl.prototype.getRight = function() {
	return this.getX() + this.getWidth();
}


Widgui_UserControl.prototype.getBottom = function() {
	return this.getY() + this.getHeight();
}



Widgui_UserControl.prototype.getID = function() {
	return this.id;
}


Widgui_UserControl.prototype.setSkinDirectory = function(iDirectory) {
	if (this.alternateSkinDirectory != iDirectory) {
		this.alternateSkinDirectory = iDirectory;
		this.onSkinDirectoryChanged(this, {});
	}
}


Widgui_UserControl.prototype.getSkinDirectory = function() {
	if (this.alternateSkinDirectory == undefined) return Widgui.Skin.getActiveDirectory();
	return this.alternateSkinDirectory;
}


Widgui_UserControl.prototype.isOfType = function(iType) {
	for (var i = 0; i < this.types.length; i++) {
		if (this.types[i] == iType) return true;
	}
	return false;
}


//Widgui_UserControl.prototype.setHslAdjustment = function(v) {
//	this.hslAdjustment = v;
//}


Widgui_UserControl.prototype.isMouseInside = function() {
	var m = this.getRelativeMouseLoc();
	return m.x >= 0 && m.x <= this.getWidth() && m.y >= 0 && m.y <= this.getHeight();
}


Widgui_UserControl.prototype.getRelativeMouseLoc = function(iObject) {
	if (iObject == undefined) iObject = this.getRootFrame();
	
	var mx = system.event.screenX;
	var my = system.event.screenY;
	
	var parentObject = iObject;
	
	while (true) {
		var px = parentObject.hOffset;
		var py = parentObject.vOffset;
		
		if (px == undefined) px = 0;
		if (py == undefined) py = 0;
		
		mx -= px;
		my -= py;
				
		if (parentObject.toString().indexOf("Window") >= 0) break;
		
		var newParentObject = parentObject.parentNode;
		
		if (newParentObject.toString().indexOf("Root") >= 0) {
			parentObject = parentObject.window;
		} else {
			parentObject = newParentObject;
		}
	}
	
	return new Point(mx, my);
}


Widgui_UserControl.prototype.onEnabledChanged = function(iSource, iParam) {
	this.broadcastEvent(iSource, "enabledChanged", iParam);
}


Widgui_UserControl.prototype.onMessageReceived = function(iSource, iMessage, iParam) {

}


Widgui_UserControl.prototype.getContentDimensions = function() {
	var controlCount = this.controlCount();
	var maxRight = 0;
	var maxBottom = 0;
	
	for (var i = 0; i < controlCount; i++) {
		var c = this.getControlAt(i);
		var r = c.getWidth() + c.getX();
		var b = c.getHeight() + c.getY();
		if (r > maxRight) maxRight = r;
		if (b > maxBottom) maxBottom = b;
	}
	
	return { width:maxRight, height:maxBottom };
}


Widgui_UserControl.prototype.getAbsoluteLocation = function() {
	
	var currentView = this.frame;
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
	
	
//	var currentControl = this;
//	var x = 0;
//	var y = 0;
//	
//	while (true) {
//		x += currentControl.getX();
//		y += currentControl.getY();
//		
//		currentControl = currentControl.getParent();
//		if (currentControl == undefined) break;		
//		if (currentControl.isOfType("Form")) break;
//	}
//		
//	return {x:x, y:y};
}


Widgui_UserControl.prototype.__getFullControlList = function(iList) {
	var controlCount = this.controlCount();
	for (var i = 0; i < controlCount; i++) {
		var c = this.getControlAt(i);
		iList.push(c);
		c.__getFullControlList(iList);
	}
}


Widgui_UserControl.prototype.getFullControlList = function() {
	var output = [];
	this.__getFullControlList(output);
	return output;
}


Widgui_UserControl.prototype.enableAnimationUpdate = function(iValue) {
	this.frame.opacity = iValue;
}


Widgui_UserControl.prototype.enable = function(iEnabled) {
	if (iEnabled == undefined) iEnabled = true;
		
	if (iEnabled != this.enabled) {
		this.enabled = iEnabled;
		
		if (this.enableAnimation != undefined) this.enableAnimation.kill();
				
		var endOpacity = this.enabled ? 255 : 122;
				
		if (false) {
			var duration = this.enabled ? 500 : 500;		
			this.enableAnimation = new Widgui.Utils.FunctionAnimation(this, "enableAnimationUpdate", this.frame.opacity, endOpacity, duration, animator.kEaseOut);
			animator.start(this.enableAnimation);
		} else {		
			this.frame.opacity = endOpacity;
		}
		
		var fullControlList = this.getFullControlList();
		var controlCount = fullControlList.length;
		for (var i = 0; i < controlCount; i++) {
			var c = fullControlList[i];
			c.onEnabledChanged(c, {});			
		}
		
		this.onEnabledChanged(this, {});
	}
}


Widgui_UserControl.prototype.disable = function() {
	this.enable(false);
}


Widgui_UserControl.prototype.isEnabled = function() {
	if (!this.enabled) return false;
	
	var p = this.getParent();
	while (p != undefined) {
		if (!p.isEnabled()) return false;
		p = p.getParent();
	}
	
	return true;
}


Widgui_UserControl.prototype.isDisabled = function() {
	return !this.isEnabled();
}


Widgui_UserControl.prototype.addType = function(iType) {
	this.types.push(iType);
}


Widgui_UserControl.prototype.getParentForm = function() {	
	var currentControl = this;
	while (true) {
		if (currentControl.isOfType("Form")) {
			return currentControl;
		}
		currentControl = currentControl.getParent();
		if (currentControl == undefined) return undefined;
	}
}


Widgui_UserControl.prototype.attachToWindow = function(iWindow) {
	this.frame.removeFromSuperview();
	iWindow.root.addSubview(this.frame);
}


Widgui_UserControl.prototype.addControl = function(iControl) {
	var p = iControl.getParent();
	if (p != undefined) p.removeControl(iControl);
	
	var f = iControl.getRootFrame();
	this.frame.addSubview(f);
	iControl._setParent(this);
	this.controls.push(iControl);
	
	this.onControlAdded(this, {control:iControl});
	iControl.onAddedToControl(this, {});
}


Widgui_UserControl.prototype.onSkinDirectoryChanged = function(iSource, iParam) {
	
}


Widgui_UserControl.prototype.onControlAdded = function(iSource, iParam) {
	
}


Widgui_UserControl.prototype.onAddedToControl = function(iSource, iParam) {
	
}


Widgui_UserControl.prototype.onControlRemoved = function(iSource, iParam) {
	
}


Widgui_UserControl.prototype.removeControl = function(iControl) {
	var removed = false;
	
	for (var i = 0; i < this.controls.length; i++) {
		var c = this.controls[i];
		if (c == iControl) {
			c.getRootFrame().removeFromSuperview();
			this.controls.splice(i, 1);
			removed = true;
			break;
		}
	}
	
	if (removed) this.onControlRemoved();
}


Widgui_UserControl.prototype.onDestroying = function(iSource, iParam) {	
	
}


Widgui_UserControl.prototype.destroy = function() {	
	this.onDestroying(this, {});
	
	for (var i = this.controls.length - 1; i >= 0; i--) {
		this.controls[i].destroy();
	}
	var p = this.getParent();
	if (p != undefined) this.getParent().removeControl(this); // Forms do not have a parent object
	Widgui.forgetControl(this);
	
	// Remove the children objects that have been
	// added without using addControl()
	
	function __getAllChildren(iObject, iList) {
		if (iObject == null) return;
		
		var child = iObject.firstChild;
		
		while (child != null) {
			iList.push(child);
			__getAllChildren(child, iList);
			child = child.nextSibling;
		}
	}
	
	
	function getAllChildren(iObject) {
		var output = [];
		__getAllChildren(iObject, output)
		return output;
	}
	
	var c = getAllChildren(this.frame);
	for (var i = 0; i < c.length; i++) {
		c[i].removeFromSuperview();
	}
}


Widgui_UserControl.prototype.destroyAllChildren = function() {	
	for (var i = this.controls.length - 1; i >= 0; i--) {
		this.controls[i].destroy();
	}
}


Widgui_UserControl.prototype.controlCount = function() {
	return this.controls.length;
}


Widgui_UserControl.prototype.getControlAt = function(iIndex) {
	return this.controls[iIndex];
}


Widgui_UserControl.prototype.getParent = function() {
	return this.parentControl;
}


// This is only meant to be used by this class. Use addControl() / removeControl()
// to create a hierarchy of controls
Widgui_UserControl.prototype._setParent = function(iControl) {
	this.parentControl = iControl;
}


Widgui_UserControl.prototype.isLayoutSuspended = function() {	
	if (this.layoutSuspended) return true;
	if (this.isOfType("Form")) return this.layoutSuspended;
		
	var f = this.getParentForm();
	if (f == undefined) return false;
	return f.isLayoutSuspended();
}


Widgui_UserControl.prototype.suspendLayout = function() {
	this.layoutSuspended = true;
}


Widgui_UserControl.prototype.resumeLayout = function() {
	this.layoutSuspended = false;
}


Widgui_UserControl.prototype.getRootFrame = function() {
	return this.frame;
}


Widgui_UserControl.prototype.setX = function(v) {
	this.frame.hOffset = v;	
}


Widgui_UserControl.prototype.setY = function(v) {
	this.frame.vOffset = v;	
}


Widgui_UserControl.prototype.setLocation = function(x, y) {
	this.frame.hOffset = x;
	this.frame.vOffset = y;
}


Widgui_UserControl.prototype.setOpacity = function(iOpacity) {
	this.frame.opacity = iOpacity;
}


Widgui_UserControl.prototype.getOpacity = function() {
	return this.frame.opacity;
}


Widgui_UserControl.prototype.setName = function(iName) {
	this.name = iName;
}


Widgui_UserControl.prototype.getName = function() {
	return this.name;
}


Widgui_UserControl.prototype.getX = function() {
	return this.frame.hOffset;
}


Widgui_UserControl.prototype.getY = function() {
	return this.frame.vOffset;
}


Widgui_UserControl.prototype.getWidth = function() {
	return this.frame.width;
}


Widgui_UserControl.prototype.getHeight = function() {
	return this.frame.height;
}


Widgui_UserControl.prototype.setWidth = function(v) {
	this.frame.width = v;
}


Widgui_UserControl.prototype.setHeight = function(v) {
	this.frame.height = v;
}


Widgui_UserControl.prototype.setTooltip = function(v) {
	this.frame.tooltip = v;
}


Widgui_UserControl.prototype.setAssociatedObject = function(v) {
	this.associatedObject = v;
}


Widgui_UserControl.prototype.getAssociatedObject = function() {
	return this.associatedObject;
}


Widgui_UserControl.prototype.getLocation = function() {
	return { x:this.frame.hOffset, y:this.frame.vOffset };
}


Widgui_UserControl.prototype.setVisible = function(v) {
	this.frame.visible = v;
}


Widgui_UserControl.prototype.getVisible = function() {
	return this.frame.visible;
}


Widgui_UserControl.prototype.update = function(iDeep) {
	if (iDeep == undefined) iDeep = false;
	
	if (iDeep) {
		var controlCount = this.controls.length;
		for (var i = 0; i < controlCount; i++) {
			var c = this.controls[i];
			c.update(iDeep);
		}
	}
}


Widgui_UserControl.prototype.toString = function() {
	return "[Widgui." + this.types[this.types.length - 1] + "] " + this.getName();
}


Widgui_UserControl.prototype.isRegistered = function(iObject) {
	if (this.register == undefined) return;
	
	for (var i in this.register) {
		var r = this.register[i];
		
		if (r.object == iObject) return true;
	}
	
	return false;
}


Widgui_UserControl.prototype.unregister = function(iObject) {
	if (this.register == undefined) return;
	
	for (var i = this.register.length - 1; i >= 0; i--) {
		var r = this.register[i];
		if (r.object == iObject) this.register.splice(i, 1);
	}
}


Widgui_UserControl.prototype.registerForEvents = function(iObject, iCallbackPrefix) {
	if (this.register == undefined) this.register = [];
	if (this.isRegistered(iObject)) return;
	
	if (iCallbackPrefix == undefined) iCallbackPrefix = "";	
	
	var o = {};
	o.object = iObject;
	o.callbackPrefix = iCallbackPrefix;
		
	this.register.push(o);
}


Widgui_UserControl.prototype.broadcastEvent = function(iSource, iEventName, iEventParam) {		
	if (this.register == undefined) return;
	
	for (var i in this.register) {
		var r = this.register[i];
		
		var o = r.object;
		var f = r.callbackPrefix + iEventName;
		var p = r.userParam;
		
		var functionToCall;
				
		if (o == undefined) {
			functionToCall = eval(f);						
			if (functionToCall != undefined) functionToCall(iSource, iEventParam);
		} else {
			functionToCall = o[f];
			if (functionToCall != undefined) o[f](iSource, iEventParam);
		}		
	}
}