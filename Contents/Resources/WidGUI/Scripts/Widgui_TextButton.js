


Widgui.Utils.usingControl("Button");

function Widgui_TextButton(iInitialize, iAlternateSkin) {
	if (iAlternateSkin != undefined) {
		this.alternateSkin = iAlternateSkin;
	} else {
		this.alternateSkin = "";
	}
	if (iInitialize == undefined || iInitialize) this.initialize();
}

Widgui.TextButton = Widgui_TextButton;

Widgui_TextButton.prototype = new Widgui_Button(false);
Widgui_TextButton.prototype.textButtonAncestor = Widgui_Button.prototype;


Widgui_TextButton.prototype.initialize = function() {		
	this.textButtonAncestor.initialize.call(this);
	this.addType("TextButton");
	
	this.text = new Text();
	this.text.anchorStyle = "topLeft";
	this.text.data = "Button";
	this.text.normalY = 0;
	Widgui.Skin.buttonStyle.font.applyTo(this.text);
	
	this.getRootFrame().appendChild(this.text);
	
	var buttonStyle = Widgui.Skin.buttonStyle;
	this.setWidth(buttonStyle.defaultWidth);
	this.setHeight(buttonStyle.defaultHeight);
	
	//this.alternateSkin = "";
}


Widgui_TextButton.prototype.fitToText = function(iExtraPadding) {
	if (iExtraPadding == undefined) iExtraPadding = 8;
	this.setWidth(this.text.width + 16 + iExtraPadding);
}



Widgui_TextButton.prototype.useAlternateSkin = function(iAlternateSkin) {
	//Doesn't work
	
	this.alternateSkin = iAlternateSkin;
	
	if (this.stateProperties != undefined) {
		for (var i = 0; i < this.stateProperties.length; i++) {
			var s = this.stateProperties[i];
			delete s.context;
			s.canvas.removeFromSuperview();
			delete s.canvas;
			delete s.image;
		}
	}
	
	this.stateProperties = undefined;	
	this.update();
}


Widgui_TextButton.prototype.update = function(iDeep) {
	this.textButtonAncestor.update.call(this, iDeep);
	
	if (this.isLayoutSuspended()) return;
		
	if (this.stateProperties == undefined) this.stateProperties = {};
	if (this.alternateSkin == undefined) this.alternateSkin = "";
	
	var currentState = this.getState();
	
	var s = this.stateProperties[currentState];
	
	var canvas, context, img;
	
	if (s == undefined) {
		var rootFrame = this.getRootFrame();
		
		canvas = new Canvas();
		rootFrame.addSubview(canvas);
		
		context = canvas.getContext("2d");
		img = new Image();
		
		var f = Widgui.Skin.getActiveDirectory() + "/" + this.alternateSkin + "Button" + currentState[0].toUpperCase() + currentState.substr(1,currentState.length) + ".png";		
		img.src = f;
						
		s = {};
		s.context = context;
		s.image = img;
		s.canvas = canvas;
		
		this.stateProperties[currentState] = s;
		
		this.setStateFrame(currentState, canvas);		
		this.text.orderAbove(null);
	} else {
		canvas = s.canvas;
		img = s.image;
		context = s.context;
	}
	
	var frameWidth = this.getWidth();
	var frameHeight = this.getHeight();
			
	if (canvas.width != frameWidth || canvas.height != frameHeight) {		
		context.clearRect(0, 0, canvas.width, canvas.height);
		canvas.width = frameWidth;
		canvas.height = frameHeight;
		
		Widgui.Utils.drawRectangleImage(context, img, frameWidth, frameHeight);	
		
		this.updateTextPosition();
	}
}


Widgui_TextButton.prototype.setText = function(iText) {
	this.text.data = iText;
	this.updateTextPosition();
}


Widgui_TextButton.prototype.getText = function() {
	return this.text.data;
}


Widgui_TextButton.prototype.setState = function(iState) {
	this.textButtonAncestor.setState.call(this, iState);
	
	if (iState == "down") {
		this.text.vOffset = this.text.normalY + Widgui.Skin.buttonStyle.downTextOffset;	
	} else {
		this.text.vOffset = this.text.normalY;
	}
}


Widgui_TextButton.prototype.updateTextPosition = function() {
	this.text.hOffset = (this.getWidth() - this.text.width) / 2.0;
	this.text.vOffset = (this.getHeight() - this.text.height) / 2.0;
	this.text.normalY = this.text.vOffset;
}