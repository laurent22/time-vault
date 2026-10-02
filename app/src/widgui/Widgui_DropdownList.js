


function Widgui_DropdownList(iInitialize) {
	if (iInitialize == undefined || iInitialize) this.initialize();
}


Widgui.DropdownList = Widgui_DropdownList;
Widgui_DropdownList.prototype = new Widgui_UserControl(false);
Widgui_DropdownList.prototype.dropdownAncestor = Widgui_UserControl.prototype;


Widgui_DropdownList.prototype.initialize = function() {
	this.dropdownAncestor.initialize.call(this);
	this.addType("DropdownList");
	this.state = "up";
	
	this.rootFrame = this.getRootFrame();
		
	this.rootFrame.__dropdownControl = this;
	
	this.items = [];
	this.selectedIndex = undefined;
	this.textTruncation = true;
	
	this.text = new Text();
	this.text.anchorStyle = "topLeft";
	this.text.data = "";
	this.rootFrame.addSubview(this.text);
	
	this.dropdownStyle = Widgui.Skin.dropdownStyle;
	this.setWidth(this.dropdownStyle.defaultWidth);
	this.setHeight(this.dropdownStyle.defaultHeight);
	this.dropdownStyle.font.applyTo(this.text);
	
	this.updateMouseEventAssignment();
	this.update();
}


Widgui_DropdownList.prototype.setTextTruncation = function(iTruncation) {	
	this.textTruncation = iTruncation;
	this.updateText();
}


Widgui_DropdownList.prototype.updateMouseEventAssignment = function() {	
	if (this.isEnabled()) {
		this.rootFrame.onMouseEnter = function() { this.__dropdownControl.onMouseEnter(); }
		this.rootFrame.onMouseExit = function() { this.__dropdownControl.onMouseExit(); }
		this.rootFrame.onMouseDown = function() { this.__dropdownControl.onMouseDown(); }
		this.rootFrame.onMouseUp = function() { this.__dropdownControl.onMouseUp(); }
	} else {
		this.rootFrame.onMouseEnter = null;
		this.rootFrame.onMouseExit = null;
		this.rootFrame.onMouseDown = null;
		this.rootFrame.onMouseUp = null;
	}
}


Widgui_DropdownList.prototype.onEnabledChanged = function(iSource, iParam) {
	this.dropdownAncestor.onEnabledChanged.call(iSource, iParam);	
	this.updateMouseEventAssignment();
}


Widgui_DropdownList.prototype.fitToLargestText = function() {
	var saveText = this.text.data;
	var saveWidth = this.text.width;
	
	this.text.width = null;
	
	var maxWidth = 0;
	for (var i = 0; i < this.items.length; i++) {
		var it = this.items[i];
		this.text.data = this.objectToString(it.object);
		if (this.text.width > maxWidth) maxWidth = this.text.width;
	}
	
	this.setWidth(maxWidth + this.dropdownStyle.buttonWidth + this.dropdownStyle.textLeftOffset);
	this.text.data = saveText;
	this.text.width = saveWidth;
}


Widgui_DropdownList.prototype.objectCount = function() {
	return this.itemCount();
}


Widgui_DropdownList.prototype.itemCount = function() {
	return this.items.length;
}


Widgui_DropdownList.prototype.selectOneText = function(iText) {
	for (var i = 0; i < this.items.length; i++) {
		var t = this.objectToString(this.items[i].object);
		if (t == iText) {
			this.selectAt(i);
			break;
		}
	}	
}


Widgui_DropdownList.prototype.selectOneObject = function(iObject) {
	for (var i = 0; i < this.items.length; i++) {
		var o = this.items[i].object;
		if (o == iObject) {
			this.selectAt(i);
			break;
		}
	}	
}


Widgui_DropdownList.prototype.selectAt = function(iIndex) {
	var previousIndex = this.selectedIndex;
	this.selectedIndex = iIndex;
	
	if (this.selectedIndex != previousIndex) {
		this.update();
		this.updateText();
	}
}


Widgui_DropdownList.prototype.getSelectedItem = function() {
	if (this.selectedIndex == undefined) return undefined;
	if (this.selectedIndex < 0 || this.selectedIndex >= this.items.length) return undefined;
	
	return this.items[this.selectedIndex];	
}



Widgui_DropdownList.prototype.getSelectedIndex = function() {
	return this.selectedIndex;
}


Widgui_DropdownList.prototype.objectToString = function(iObject) {
	if (typeof(iObject) == "string") return iObject;
	if (iObject == undefined) return "";
	if (iObject.text != undefined) return iObject.text;
	return iObject.toString();
}


Widgui_DropdownList.prototype.getSelectedText = function() {
	var it = this.getSelectedItem();
	if (it == undefined) return undefined;
	
	return this.objectToString(it.object);
}


Widgui_DropdownList.prototype.getSelectedObject = function() {
	var it = this.getSelectedItem();
	if (it == undefined) return undefined;
	
	return it.object;
}


Widgui_DropdownList.prototype.getObjectAt = function(iIndex) {
	return this.items[iIndex].object;
}


Widgui_DropdownList.prototype.addObject = function(iObject) {
	this.addItem(iObject);
}


// To be more consistent, use "addObject"
// An "Item" includes additionnal metadata that 
// are only used internally.
Widgui_DropdownList.prototype.addItem = function(iObject) {
	var it = new MenuItem();
		
	it.object = iObject;
	it.owner = this;
	it.onSelect = function() { this.owner.onMenuItemSelected(this, {}); }
	this.items.push(it);
		
	if (this.selectedIndex == undefined) this.selectAt(0);
}


Widgui_DropdownList.prototype.deleteAt = function(iIndex) {
	this.items.splice(iIndex, 1);
	if (iIndex == this.selectedIndex) {
		if (this.items.length <= 0) {
			this.selectedIndex = undefined;
		} else {
			if (this.selectedIndex >= this.items.length) this.selectedIndex = this.items.length - 1;
		}
		
		this.update();
		this.updateText();		
	}
}


Widgui_DropdownList.prototype.clear = function() {
	this.clearItems();
}


Widgui_DropdownList.prototype.clearItems = function() {
	this.selectedIndex = undefined;
	this.items = [];
	this.update();
	this.updateText();
}


Widgui_DropdownList.prototype.onMenuItemSelected = function(iSource, iParam) {
	var newIndex;
	
	for (var i = 0; i < this.items.length; i++) {
		if (iSource == this.items[i]) {
			newIndex = i;
			break;
		}
	}
	
	if (this.selectedIndex != newIndex) {
		var previousIndex = this.selectedIndex;
		this.selectedIndex = newIndex;
		this.onSelectionChanged(this, { previousIndex:previousIndex });
		this.updateText();
	}
	
	this.broadcastEvent(this, "menuItemSelected", {});
}


Widgui_DropdownList.prototype.onMouseEnter = function() {
	if (this.isDisabled()) return;
	this.setState("over");
}


Widgui_DropdownList.prototype.onMouseExit = function() {
	if (this.isDisabled()) return;
	this.setState("up");
}


Widgui_DropdownList.prototype.onMouseDown = function() {
	if (this.isDisabled()) return;
	
	this.setState("down");
	
	for (var i = 0; i < this.items.length; i++) {
		var it = this.items[i];
		it.title = this.objectToString(it.object);
		it.checked = this.selectedIndex == i;
	}
	
	var c = this.getAbsoluteLocation();
	
	var r = popupMenu(this.items, c.x, c.y + this.getHeight());
	
	this.setState("up");
}


Widgui_DropdownList.prototype.onMouseUp = function() {
	this.setState("up");
}


Widgui_DropdownList.prototype.setState = function(iState) {
	this.state = iState;
	this.update();
}


Widgui_DropdownList.prototype.getState = function() {
	return this.state;
}


Widgui_DropdownList.prototype.setWidth = function(iWidth) {
	this.dropdownAncestor.setWidth.call(this, iWidth);
	this.update();	
}


Widgui_DropdownList.prototype.setHeight = function(iHeight) {
	// do nothing - the dropdown list can't be resized vertically
}


Widgui_DropdownList.prototype.getText = function() {
	return this.getSelectedText();
}


Widgui_DropdownList.prototype.onSelectionChanged = function(iSource, iParam) {
	this.broadcastEvent(iSource, "selectionChanged", iParam);	
}


Widgui_DropdownList.prototype.getHeight = function() {
	return this.stateProperties[this.getState()].image.height;
}


Widgui_DropdownList.prototype.updateText = function() {
	var state = this.stateProperties[this.getState()];
	
	this.text.data = this.getSelectedText();
	this.text.hOffset = this.dropdownStyle.textLeftOffset;
	this.text.vOffset = (this.getHeight() - this.text.height) / 2.0;
	this.text.normalY = this.text.vOffset;	
	
	if (this.textTruncation) {
		this.text.width = state.canvas.width - this.text.hOffset - this.dropdownStyle.buttonWidth + 4;
		this.text.truncation = "end";
	} else {
		this.text.truncation = null;
		this.text.width = state.canvas.width - this.text.hOffset * 2; 
	}
}


Widgui_DropdownList.prototype.onSkinDirectoryChanged = function(iSource, iParam) {
	this.dropdownAncestor.onSkinDirectoryChanged.call(this, iSource, iParam);
	
	if (this.stateProperties != undefined) {
		for (var n in this.stateProperties) {
			var s = this.stateProperties[n];
			s.canvas.removeFromSuperview();
		}
		this.stateProperties = undefined;
	}
	
	this.update();
}


Widgui_DropdownList.prototype.update = function(iDeep) {
	this.dropdownAncestor.update.call(this, iDeep);
	if (this.isLayoutSuspended()) return;
	
	if (this.stateProperties == undefined) this.stateProperties = {};
	
	var dropdownStyle = Widgui.Skin.dropdownStyle;
	
	var currentState = this.getState();
	
	var s = this.stateProperties[currentState];
	
	var canvas, context, img;
	
	if (s == undefined) {
		var rootFrame = this.getRootFrame();
		
		canvas = new Canvas();
		rootFrame.addSubview(canvas);
		
		context = canvas.getContext("2d");
		img = new Image();
		
		var f = this.getSkinDirectory() + "/Dropdown" + currentState[0].toUpperCase() + currentState.substr(1,currentState.length) + ".png";
		//if (!filesystem.itemExists(f)) f = Widgui.Skin.getActiveDirectory() + "/ButtonUp.png";
		
		img.src = f;
				
		s = {};
		s.context = context;
		s.image = img;
		s.canvas = canvas;
		
		this.stateProperties[currentState] = s;
		
		this.text.orderAbove(null);
	} else {
		canvas = s.canvas;
		img = s.image;
		context = s.context;
	}
	
	var frameWidth = this.getWidth();
	var frameHeight = this.getHeight();
	var buttonWidth = dropdownStyle.buttonWidth;
	
	if (canvas.width != frameWidth || canvas.height != frameHeight) {		
		context.clearRect(0, 0, canvas.width, canvas.height);
		canvas.width = frameWidth;
		canvas.height = frameHeight;
		
		context.drawImage(img, 0, 0, buttonWidth, img.height, 0, 0, buttonWidth, img.height);
		context.drawImage(img, buttonWidth, 0, 1, img.height, buttonWidth, 0, frameWidth - buttonWidth * 2, img.height);
		context.drawImage(img, img.width - buttonWidth, 0, buttonWidth, img.height, frameWidth - buttonWidth, 0, buttonWidth, img.height);
					
		//Widgui.Utils.drawRectangleImage(context, img, frameWidth, frameHeight);		
		this.updateText();
	}	
	
	for (var stateName in this.stateProperties) {
		this.stateProperties[stateName].canvas.visible = currentState == stateName;
	}
	
	if (currentState == "down") {
		this.text.vOffset = this.text.normalY + 1;
	} else {
		this.text.vOffset = this.text.normalY;
	}
}