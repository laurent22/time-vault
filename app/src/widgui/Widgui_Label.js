


function Widgui_Label(iInitialize) {
	if (iInitialize == undefined || iInitialize) this.initialize();
}

Widgui.Label = Widgui_Label;

Widgui_Label.prototype = new Widgui_UserControl(false);
Widgui_Label.prototype.labelAncestor = Widgui_UserControl.prototype;


Widgui_Label.prototype.initialize = function() {
	this.labelAncestor.initialize.call(this);
	this.addType("Label");
		
	this.text = new Text();
	this.text.anchorStyle = "topLeft";	
	this.text.data = "Label";
//	this.text.bgColor = "#ff0000";
//	this.text.bgOpacity = 125;
	
	this.setStyle(Widgui.Skin.labelStyle.font);
			
	this.getRootFrame().addSubview(this.text);
}


Widgui_Label.prototype.setStyle = function(iStyle) {
	
	this.fontStyle = iStyle.duplicate();
	this.fontStyle.applyTo(this.text);
}


Widgui_Label.prototype.getStyle = function() {
	return this.fontStyle;
}


Widgui_Label.prototype.setText = function(iText) {
	this.text.data = iText;
}


Widgui_Label.prototype.getText = function() {
	return this.text.data;
}


Widgui_Label.prototype.setWrap = function(v) {
	this.text.wrap = v;
}


Widgui_Label.prototype.setWidth = function(iWidth) {
	this.labelAncestor.setWidth.call(this, iWidth);
	this.text.width = iWidth;
}


Widgui_Label.prototype.getHeight = function() {
	return this.text.height;
}


Widgui_Label.prototype.setTruncation = function(v) {
	this.text.truncation = v;
}