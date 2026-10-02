

Widgui.Utils.usingControl("Button");

function Widgui_GraphicButton(iInitialize, iImageFilePrefix) {
	if (iInitialize == undefined || iInitialize) this.initialize(iImageFilePrefix);
}

Widgui.GraphicButton = Widgui_GraphicButton;

Widgui_GraphicButton.prototype = new Widgui_Button(false);
Widgui_GraphicButton.prototype.graphicButtonAncestor = Widgui_Button.prototype;


Widgui_GraphicButton.prototype.initialize = function(iImageFilePrefix) {		
	this.graphicButtonAncestor.initialize.call(this);
	this.addType("GraphicButton");
	
	this.imageFilePrefix = iImageFilePrefix;
	
	this.update();
}


Widgui_GraphicButton.prototype.setButtonFilePrefix = function(iImageFilePrefix) {
	this.imageFilePrefix = iImageFilePrefix;
	
	if (this.stateProperties != undefined) {
		for (var n in this.stateProperties) {
			var s = this.stateProperties[n];
			var f = this.imageFilePrefix + n[0].toUpperCase() + n.substr(1,n.length) + ".png";
			if (!filesystem.itemExists(f)) f = this.imageFilePrefix + "Up.png";
			s.image.src = f;
		}
	}
	
	this.update();
}


Widgui_GraphicButton.prototype.update = function(iDeep) {
	this.graphicButtonAncestor.update.call(this, iDeep);
	
	if (this.isLayoutSuspended()) return;
		
	if (this.stateProperties == undefined) this.stateProperties = {};
	
	var currentState = this.getState();
		
	var s = this.stateProperties[currentState];
	
	var img;
	
	if (s == undefined) {
		var rootFrame = this.getRootFrame();
		
		img = new Image();		
		var f = this.imageFilePrefix + currentState[0].toUpperCase() + currentState.substr(1,currentState.length) + ".png";
		img.src = f;
		
		s = {};
		s.image = img;
		
		rootFrame.addSubview(img);
		
		this.stateProperties[currentState] = s;
		
		this.setStateFrame(currentState, img);
	} else {
		img = s.image;
	}
	
	this.getRootFrame().width = img.width;
	this.getRootFrame().height = img.height;
	
	
//	var frameWidth = this.getWidth();
//	var frameHeight = this.getHeight();
//			
//	if (canvas.width != frameWidth || canvas.height != frameHeight) {		
//		context.clearRect(0, 0, canvas.width, canvas.height);
//		canvas.width = frameWidth;
//		canvas.height = frameHeight;
//		
//		Widgui.Utils.drawRectangleImage(context, img, frameWidth, frameHeight);	
//		
//		this.updateTextPosition();
//	}
}