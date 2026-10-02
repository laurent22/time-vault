


function Widgui_Manager() {
	this.controls = [];
	this.libraryPath = ".";
}


Widgui_Manager.prototype.getLibraryPath = function() {
	return this.libraryPath;
}


Widgui_Manager.prototype.setLibraryPath = function(v) {
	this.libraryPath = v;
}


Widgui_Manager.prototype.rememberControl = function(iControl) {
	this.controls.push(iControl);
}


Widgui_Manager.prototype.forgetControl = function(iControl) {
	for (var i = 0; i < this.controls.length; i++) {
		if (this.controls[i] == iControl) {
			this.controls.splice(i, 1);
			break;
		}
	}
}


Widgui_Manager.prototype.sendAllForms = function(iSource, iMessage, iParam) {
	for (var i = 0; i < this.controls.length; i++) {
		var c = this.controls[i];
		if (c.isOfType("Form")) {
			c.onMessageReceived(iSource, iMessage, iParam);
		}
	}
}


function Widgui_Skin(iSkinFolder) {
	
	if (iSkinFolder == undefined) iSkinFolder = "Default";
	
	print("[Widgui.Skin] Using skin folder: " + iSkinFolder);
	
	this.k_SkinDirectory = "Resources/WidGUI";
	this.k_DefaultDirectory = iSkinFolder;
		
	this.activeDirectory = this.k_DefaultDirectory;
	
	function FontStyle() {
		this.color = "#000000";
		this.fontFamily = "Arial";
		this.fontSize = "12px";
		this.fontStyle = "normal";
		this.fontWeight = "normal";
		this.KonBackgroundFill = null;
		this.KonShadowColor = null;
		this.KonShadowOffset = null;
		this.KonTextTruncation = null;
	}
	
	
	FontStyle.fromCSS = function(s) {
		var fs = new FontStyle();
		
		var items = s.split(";");
		for (var i = 0; i < items.length; i++) {
			var it = items[i].trim().split(":");
			if (it.length != 2) continue;
			
			var itemName = it[0].trim();
			var itemValue = it[1].trim();
			
			switch (itemName) {
								
				case "font-weight":
				
					fs.fontWeight = itemValue;
					break;
					
				case "font-size":
				
					fs.fontSize = itemValue;
					break;
					
				case "-kon-shadow":
				
					var shadowOffset = "";
					var shadowColor = null;
					var shadowProperties = itemValue.split(" ");
					for (var i = 0; i < shadowProperties.length; i++) {
						var konShadowProp = shadowProperties[i].trim();
						
						if (konShadowProp.indexOf("px") >= 0) {
							if (shadowOffset != "") shadowOffset += " ";
							shadowOffset += konShadowProp;
						}
						if (konShadowProp[0] == "#") {
							shadowColor	= konShadowProp;
						}
					}
					
					fs.KonShadowColor = shadowColor;
					fs.KonShadowOffset = shadowOffset;
					break;
					
				default:
				
					fs[itemName] = itemValue;
					break;
				
			}
		}		
		
		return fs;
	}
	
	
	FontStyle.prototype.duplicate = function() {
		var f = new Widgui.Skin.FontStyle();
		
		f.color = this.color;
		f.fontFamily = this.fontFamily;
		f.fontSize = this.fontSize;
		f.fontStyle = this.fontStyle;
		f.fontWeight = this.fontWeight;
		f.KonBackgroundFill = this.KonBackgroundFill;
		f.KonShadowColor = this.KonShadowColor;
		f.KonShadowOffset = this.KonShadowOffset;
		f.KonTextTruncation = this.KonTextTruncation;
		
		return f;
	}
	
	
	
	FontStyle.prototype.applyTo = function(iText) {		
		iText.style.color = this.color;
		iText.style.fontFamily = this.fontFamily;
		iText.style.fontSize = this.fontSize;
		iText.style.fontStyle = this.fontStyle;
		iText.style.fontWeight = this.fontWeight;
		iText.style.KonBackgroundFill = this.KonBackgroundFill;
		iText.style.KonShadowColor = this.KonShadowColor;
		iText.style.KonShadowOffset = this.KonShadowOffset;
		iText.style.KonTextTruncation = this.KonTextTruncation;
	}
	

	this.FontStyle = FontStyle;
	
//	var buttonFont = new FontStyle();
//	buttonFont.color = "#ffffff";
//	buttonFont.fontWeight = "bold";
//	
//	var dropdownFont = new FontStyle();
//	dropdownFont.color = "#ffffff";
//	dropdownFont.fontWeight = "bold";
//	
//	var checkboxFont = new FontStyle();
//	checkboxFont.color = "#000000";
//	checkboxFont.fontWeight = "";
//	
//	var labelFont = new FontStyle();
//	labelFont.color = "#000000";
//	labelFont.fontWeight = "";
//			
//	this.dropdownStyle = {};
//	this.dropdownStyle.textLeftOffset = 10;
//	this.dropdownStyle.defaultHeight = 23;
//	this.dropdownStyle.defaultWidth = 100;
//	this.dropdownStyle.buttonWidth = 24;
//	this.dropdownStyle.font = dropdownFont;
//	
//	this.textBoxStyle = {};
//	this.textBoxStyle.defaultHeight = 22;
//	this.textBoxStyle.defaultWidth = 100;
//	this.textBoxStyle.borderOffsetX = 1;
//	this.textBoxStyle.borderOffsetY = 1;
//	
//	this.buttonStyle = {};
//	this.buttonStyle.defaultHeight = 22;
//	this.buttonStyle.defaultWidth = 100;
//	this.buttonStyle.downTextOffset = 1;
//	this.buttonStyle.font = buttonFont;
//	
//	this.checkboxStyle = {};
//	this.checkboxStyle.defaultHeight = 22;
//	this.checkboxStyle.defaultWidth = 100;
//	this.checkboxStyle.font = checkboxFont;
//	
//	this.labelStyle = {};
//	this.labelStyle.font = labelFont;
	
//	this.formStyle = {};
//	this.formStyle.defaultHeight = 222;
//	this.formStyle.defaultWidth = 222;
//	this.formStyle.activeAreaMargin = { left:7, top:titleBarImage.height, right:6, bottom:6 };
//	this.formStyle.shadowMargin = { left:6, top:3, right:5, bottom:5 };
//	this.formStyle.bgType = "gradient";
//	this.formStyle.bgGradientColors = ["#ffffff", "#dddddd"]
//	this.formStyle.bgGradientStops = [0, 1];
//	
//	this.formTitleBarStyle = {};
//	this.formTitleBarStyle.font = new FontStyle();
//	this.formTitleBarStyle.font.fontWeight = "bold";
//	this.formTitleBarStyle.font.color = "#ffffff";
	
	this.parseSkinFile(this.getSkinFile());
}


Widgui_Skin.prototype.parseSkinFile = function(iSkinFile) {
	
	function parseRectangle(iRectangleValue) {
		var t = iRectangleValue.split(",");
		var finalValue = { left:0, top:0, right:0, bottom:0 };
		if (t[0].trim() != "") finalValue.left = Number(t[0]);
		if (t[1].trim() != "") finalValue.top = Number(t[1]);
		if (t[2].trim() != "") finalValue.right = Number(t[2]);
		if (t[3].trim() != "") finalValue.bottom = Number(t[3]);		
		for (var n in t) {
			var p = t[n];
			if (!isNaN(Number(p))) t[n] = Number(p);
		}
		return finalValue;
	}
	
	function parseArray(iArrayValue) {
		var t = iArrayValue.split(",");		
		for (var i = 0; i < t.length; i++) {
			t[i] = t[i].trim();
			if (!isNaN(Number(t[i]))) t[i] = Number(t[i]);
		}
		return t;
	}
	
	var doc;
	
	try {
		doc = XMLDOM.parse(filesystem.readFile(iSkinFile));
		
		var root = doc.evaluate("skin").item(0);
		
		for (var i = 0; i < root.childNodes.length; i++) {
			var eStyle = root.childNodes.item(i);
			var styleName = eStyle.nodeName;
			
			var styleObject = {};
			
			for (var j = 0; j < eStyle.attributes.length; j++) {
				var a = eStyle.attributes.item(j);
				
				var aValue = a.value;
				var aName = a.name;
				var finalValue;
								
				if (aName == "font") {
					finalValue = this.FontStyle.fromCSS(a.value);
				} else if (aName == "activeAreaMargin" || aName == "shadowMargin") { // Rectangles
					finalValue = parseRectangle(aValue);
					
					if (aName == "activeAreaMargin") { // The top of the active area is always set to the height of the title bar
						var titleBarImage = new Image();
						titleBarImage.src = this.k_SkinDirectory + "/" + this.activeDirectory + "/WindowTitleBar.png";
						finalValue.top = titleBarImage.height;
					}
				} else if (aName == "bgGradientColors" || aName == "shadowMargin" || aName == "bgGradientStops") { // Arrays
					finalValue = parseArray(aValue);
				} else { // Strings and numbers
					finalValue = aValue.trim();
					if (!isNaN(Number(finalValue))) finalValue = Number(finalValue);
				}
				
				styleObject[aName] = finalValue;
			}
			
			this[styleName] = styleObject;
		}
	} catch(e) {
		print("XML exception while parsing " + iSkinFile);
	}
}


Widgui_Skin.prototype.getActiveDirectory = function() {
	return this.k_SkinDirectory + "/" + this.activeDirectory;
}


Widgui_Skin.prototype.getCommonDirectory = function() {
	return this.k_SkinDirectory;
}


Widgui_Skin.prototype.getSkinFile = function() {
	return this.getActiveDirectory() + "/Skin.xml";
}


function Widgui_Utils() {
	this.includedFiles = [];	
}


function Widgui_Utils_FunctionAnimation(iObject, iFunctionName, iStartValue, iEndValue, iDuration, iEaseType, iCallbackObject, iCallbackFunctionName) {
	
	function updateAnimation() {
		this.interval = 10;
		var percent = (animator.milliseconds - this.startTime) / this.duration;
		
		var endAnimation = false;
		if (percent >= 1.0) {
			endAnimation = true;
			percent = 1.0;
		}		
		
		var newValue = animator.ease(this.startValue, this.endValue, percent, this.easeType);
		
		iObject[this.functionName](newValue, this);
		
		if (endAnimation) {
			if (this.cbObject != undefined) this.cbObject[this.cbFunctionName]();
		}
		
		return !endAnimation;
	}
	
	var a = new CustomAnimation(1, updateAnimation);
	a.duration = iDuration;
	a.startValue = iStartValue;
	a.endValue = iEndValue;
	a.object = iObject;
	a.functionName = iFunctionName;
	a.easeType = iEaseType;
	a.cbObject = iCallbackObject;
	a.cbFunctionName = iCallbackFunctionName;

	return a;
}


Widgui_Utils.prototype.drawRectangleImage = function(iContext, iImage, iWidth, iHeight) {
	// TODO: optimize when iImage.width == iWidth or iImage.height == iHeight
	
	var o;
	
	if (iImage.srcWidth < iImage.srcHeight) {
		o = Math.floor(iImage.srcWidth / 2.0);
	} else {
		o = Math.floor(iImage.srcHeight / 2.0);
	}
	
	if (iWidth - o * 2 <= 0) o = Math.floor(iWidth / 2.0);
	if (iHeight - o * 2 <= 0) o = Math.floor(iHeight / 2.0);
	
	var dmw = iWidth - (o * 2);
	var dmh = iHeight - (o * 2);
	
	var smw = iImage.srcWidth - (o * 2);
	var smh = iImage.srcHeight - (o * 2);
	
	if (smw <= 0) smw = 1;
	if (smh <= 0) smh = 1;
	if (dmw <= 0) dmw = 1;
	if (dmh <= 0) dmh = 1;
	
	iContext.drawImage(iImage, 0, 0, o, o, 0, 0, o, o);	
	
	iContext.drawImage(iImage, o, 0, smw, o, o, 0, dmw, o);
	
	iContext.drawImage(iImage, o + smw, 0, o, o, o + dmw, 0, o, o);
	
	iContext.drawImage(iImage, 0, o, o, smh, 0, o, o, dmh);
	
	iContext.drawImage(iImage, o, o, smw, smh, o, o, dmw, dmh);
	
	iContext.drawImage(iImage, o + smw, o, o, smh, o + dmw, o, o, dmh);
	
	iContext.drawImage(iImage, 0, o + smh, o, o, 0, o + dmh, o, o);
	
	iContext.drawImage(iImage, o, o + smh, smw, o, o, o + dmh, dmw, o);
	
	iContext.drawImage(iImage, smw + o, o + smh, o, o, dmw + o, o + dmh, o, o);
}


Widgui_Utils.prototype.form = function(iItems, iTitle, iSaveButtonText, iCallback) {
	var cancelButtonText = Widgui.Utils.loc("global_cancel");
	
	if (iSaveButtonText instanceof Array) {
		cancelButtonText = iSaveButtonText[1];
		iSaveButtonText = iSaveButtonText[0];
	}
	
	var f = this._form;
	
	var typeNames = ["text", "popup", "checkbox", "slider", "selector", undefined, "color"];
	
	function getTypeName(iItem) {
		var idx = iItem.type.toString().charCodeAt(0);
		return typeNames[idx];
	}	
	
	if (f == undefined) {
		Widgui.Utils.using("Form");
		var f = new Widgui.Form();
		this._form = f;
	}
	
	this._form.setOpacity(255);
	
	
	
	Widgui.Utils.using("Label");
	
	var itemControls = [];
	var maxLabelWidth = 0;
	
	for (var i = 0; i < iItems.length; i++) {
		var it = iItems[i];
		var control = undefined;
		var control2 = undefined;
		var label = undefined;
		var controlHeight = undefined;
		var skipControl = false;
		
		it.__typeName = getTypeName(it);
						
		switch (it.__typeName) {
			
			case "text":
			
				Widgui.Utils.using("TextBox");
				
				control = new Widgui.TextBox();
				f.addControl(control);
				//control.update();
				control.setText(it.defaultValue);
				break;
				
			case "popup":
			
				Widgui.Utils.using("DropdownList");
				
				control = new Widgui.DropdownList();
				f.addControl(control);
				
				var buildList = true;
				
				if (!(it.option instanceof Array)) {
					buildList = false;
				} else {
					if (it.option.length == 0) buildList = false;
				}
				
				var itOptionValue = it.optionValue;
				if (!(itOptionValue instanceof Array)) itOptionValue = [];
								
				if (buildList) {
					var selectedIndex = 0;
					for (var oi = 0; oi < it.option.length; oi++) {
						var op = it.option[oi];
						var ov = op;
						if (oi < itOptionValue.length) ov = itOptionValue[oi];
						
						if (ov == it.defaultValue) selectedIndex = oi;
						control.addItem( {text:op, value:ov} );
					}
					
					control.selectAt(selectedIndex);
				}
				break;
				
			case "checkbox":
			
				Widgui.Utils.using("Checkbox");
				
				control = new Widgui.Checkbox();
				f.addControl(control);
				control.setText(it.title);
				control.tick(Number(it.defaultValue) == 1);
				break;
				
			case "selector":
			
				Widgui.Utils.using("TextBox");
				Widgui.Utils.using("TextButton");
				
				control = new Widgui.TextBox();
				f.addControl(control);
				control.setText(it.defaultValue);
				
				control2 = new Widgui.TextButton();
				f.addControl(control2);
				control2.setText("...");
				control2.fitToText();
				
				var listener = {};
				listener.textBox = control;
				listener.item = it;
				listener.browseButton_clicked = function() {
					var f;
					var fileExtension = this.item.extension;
					if (!(fileExtension instanceof Array)) fileExtension = [];
										
					if (this.item.style == "save") {
						f = saveAs(fileExtension);
					} else {
						if (this.item.kind == "both") {
							f = chooseFolder();
						} else { // == "files"
							f = chooseFile(fileExtension, false);
						}
					}
					
					if (f != null) this.textBox.setText(f);					
				}
				
				control2.registerForEvents(listener, "browseButton_");
				break;
				
			case "color":
			
				Widgui.Utils.using("ColorPicker");
				
				control = new Widgui.ColorPicker();
				f.addControl(control);				
				control.setColor(it.defaultValue == "" ? "#ff0000" : it.defaultValue);
				break;
				
			case "slider":
			
				Widgui.Utils.using("DropdownList");
				
				control = new Widgui.DropdownList();
				f.addControl(control);
								
				var minValue = it.minLength;
				var maxValue = it.maxLength;
				
				var itemTicks = Number(it.ticks);
				if (isNaN(itemTicks)) itemTicks = 2;
				if (itemTicks == 1) itemTicks = 2;
				
				var valueInterval;
				if (itemTicks == 0) {
					valueInterval = (maxValue - minValue) / 10;
					itemTicks = 11;
				} else {
					valueInterval = (maxValue - minValue) / (itemTicks - 1);
				}
				
				if (maxValue < minValue) maxValue = minValue;
				
				var v = minValue;
				
				for (var vIndex = 0; vIndex < itemTicks - 1; vIndex++) {
					control.addObject( { text:Math.round(v).toString(), value:v } );
					v += valueInterval;					
				}
				
				control.addObject( { text:Math.round(maxValue).toString(), value:maxValue } );				
				break;
				
			default:
			
				print("[Warning] " + it.__typeName + " is not a supported type.");
				skipControl = true;
				break;
			
		}
		
		if (skipControl) continue;
		
		if (it.__typeName != "checkbox") {
			label = new Widgui.Label();
			f.addControl(label);
			label.setText(it.title);
		
			if (label.getWidth() > maxLabelWidth) maxLabelWidth = label.getWidth();
		}
		
		var controlDescriptionLabel = undefined;
		
		if (it.description != "") {
			controlDescriptionLabel = new Widgui.Label();
			controlDescriptionLabel.setText(it.description);
			controlDescriptionLabel.setWrap(true);			
			f.addControl(controlDescriptionLabel);
		}
		
		control.__formItem = it;
		
		controlHeight = control.getHeight();
		if (control2 != undefined) controlHeight = Math.max(controlHeight, control2.getHeight());
		
		itemControls.push( { item:it, label:label, control:control, control2:control2, controlHeight:controlHeight, descriptionLabel:controlDescriptionLabel } );
	}
	
	var hGap = 6;
	var vGap = 8;
	
	Widgui.Utils.using("TextButton");	
	
	var buttonListener = {};
	buttonListener.callback = iCallback;
	buttonListener.form = f;
	buttonListener.itemControls = itemControls;
	
	buttonListener.saveButton_clicked = function() {		
		this.onFormDone(this.form, { cancel:false });
	}
	
	buttonListener.cancelButton_clicked = function() {
		this.onFormDone(this.form, { cancel:true });
	}
	
	buttonListener.onFormDone = function(iSource, iParam) {
		var results = [];
		var resultObject = {};
		
		for (var i = 0; i < this.itemControls.length; i++) {
			var ic = this.itemControls[i];
			var it = ic.item;
			var itemValue;
			
			switch (it.__typeName) {
				
				case "text": 
				case "selector":
					
					itemValue = ic.control.getText();
					break;
					
				case "popup":
				
					var o = ic.control.getSelectedObject();
					if (o.value == undefined) {
						itemValue = o.text;
					} else {
						itemValue = o.value;
					}					
					break;

				case "slider":
				
					var o = ic.control.getSelectedObject();
					itemValue = o.value;
					break;
										
				case "checkbox":
					
					itemValue = ic.control.isTicked();
					break;
					
				case "color":
					
					itemValue = ic.control.getColor();
					break;
				
			}			
			
			results.push(itemValue);
			resultObject[it.name] = itemValue;
		}		
		
		this.form.destroyAllChildren();
		this.form.close();
		this.form.setOpacity(0);
		
		var c = this.callback;
		iParam.results = results;
		iParam.resultObject = resultObject;
		c[0][c[1]](iSource, iParam);
	}
	
	var saveButton = new Widgui.TextButton();
	f.addControl(saveButton);
	saveButton.setText(iSaveButtonText);
	saveButton.fitToText();
	saveButton.registerForEvents(buttonListener, "saveButton_");
	
	var cancelButton = new Widgui.TextButton();
	f.addControl(cancelButton);
	cancelButton.setText(cancelButtonText);
	cancelButton.fitToText();
	cancelButton.registerForEvents(buttonListener, "cancelButton_");
	
	var amWidth = saveButton.getWidth() + hGap + cancelButton.getWidth();
	amWidth = Math.max(400, amWidth);	
	
	var am = f.getActiveAreaMargin();
	var padding = 8;	
	var controlY = am.top + padding;
	var controlX = am.left + padding + maxLabelWidth + hGap;
	var controlWidth = amWidth - controlX;
	var maxControlRight = 0;
	
	f.setOpacity(1);	
	f.showModal();	
			
	for (var i = 0; i < itemControls.length; i++) {
		var ic = itemControls[i];
		var label = ic.label;
		var control = ic.control;
		var control2 = ic.control2;
		var descLabel = ic.descriptionLabel;
		var it = control.__formItem;
		
		control.setLocation(controlX, controlY);
		
		if (it.__typeName != "checkbox") {
			
			control.setWidth(controlWidth);	
			
			if (it.__typeName == "selector") {
				control.setWidth(control.getWidth() - control2.getWidth() - hGap);
				control2.setLocation(control.getX() + control.getWidth() + hGap, control.getY() + (control.getHeight() - control2.getHeight()) / 2);
			}
				
			label.setY(controlY + (control.getHeight() - label.getHeight()) / 2);
			label.setX(controlX - hGap - label.getWidth());
		}
		
		controlY += ic.controlHeight + vGap;
		
		var cRight = control.getX() + control.getWidth();
		
		if (descLabel != undefined) {
			descLabel.setLocation(controlX, controlY);
			descLabel.setWidth(controlWidth);	
			updateNow(); // We need to issue an updateNow() in order to get the correct text height
			controlY += descLabel.getHeight() + vGap;
			
			if (descLabel.getX() + descLabel.getWidth() > cRight) cRight = descLabel.getX() + descLabel.getWidth();
		}
		
		if (cRight > maxControlRight) maxControlRight = cRight;
	}
	
	controlY += vGap;
	
	cancelButton.setLocation(maxControlRight - cancelButton.getWidth(), controlY);
	saveButton.setLocation(cancelButton.getX() - hGap - saveButton.getWidth(), controlY);
		
	f.setWidth(maxControlRight + am.right + padding);
	f.setHeight(saveButton.getY() + saveButton.getHeight() + am.bottom + padding);
	
	f.setText(iTitle);	
	
	f.setOpacity(255);
}


Widgui_Utils.prototype.setLocalizationFunction = function(iObject, iFunctionName) {
	this.locFunction = [iObject, iFunctionName];
} 


Widgui_Utils.prototype.loc = function(iString) {
	if (this.locFunction != undefined) {
		return this.locFunction[0][this.locFunction[1]](iString);
	} else {
		switch (iString) {
			
			case "global_okButton": return "Ok"; break;
			case "global_cancelButton": return "Cancel"; break;
			case "global_yesButton": return "Yes"; break;
			case "global_noButton": return "No"; break;
			case "global_messageBoxInformation": return "Information"; break;
			case "global_messageBoxError": return "Error"; break;
			case "global_messageBoxConfirmation": return "Confirmation"; break;
			default: return iString; break;
			
		}
		
		return iString;
	}
} 


Widgui_Utils.prototype.getTextLineHeight = function(iText) {
	if (this.textMeasure == undefined) {
		this.textMeasure = new Text();
		this.textMeasure.visible = false;
	}
	
	this.textMeasure.font  = iText.font;
	this.textMeasure.style = iText.style;
	this.textMeasure.size = iText.size;
	this.textMeasure.data = "abcd";
	return this.textMeasure.height;	
}


Widgui_Utils.prototype.dec2hex = function(d) {
	var hD = "0123456789ABCDEF";
	var h = hD.substr(d&15,1);
	while(d>15) {d>>=4;h=hD.substr(d&15,1)+h;}
	while(h.length < 2) h = "0" + h;
	return h;
}


Widgui_Utils.prototype.hex2dec = function(h) { return parseInt(h,16); }


Widgui_Utils.prototype.splitColor = function(h) {
	return [this.hex2dec(h.substr(1, 2)), this.hex2dec(h.substring(3, 5)), this.hex2dec(h.substring(5, 7))];
} 


Widgui_Utils.prototype.combineColor = function(c) {
	var result = "#";
	return result.concat(this.dec2hex(c[0]), this.dec2hex(c[1]), this.dec2hex(c[2]));
}


// RGB<->HSV conversion 

// RGB, each 0 to 255 
// H = 0.0 to 360.0 (corresponding to 0..360.0 degrees around hexcone) 
// S = 0.0 (shade of gray) to 1.0 (pure color) 
// V = 0.0 (black) to 1.0 (white) 

// Based on C Code in "Computer Graphics // Principles and Practice," 
// Foley et al, 1996, pp. 592,593. 

Widgui_Utils.prototype.rgbToHsv = function(R, G, B) {
	var minVal = Math.min(Math.min(R, G), B);
	var V = Math.max(Math.max(R, G), B);
	
	var Delta = V - minVal;
	
	var S;
  if (V == 0) {
    S = 0.0;
  } else {
    S = Delta / V;
  }
  
  if (S==0.0 ) { 
    H=0.0    // Achromatic: When s = 0, h is undefined but who cares 
  } else {       // Chromatic 
    if (R==V ) { // between yellow and magenta [degrees] 
      H=60.0*(G-B)/Delta 
    } else { 
      if (G==V ) { // between cyan and yellow 
        H=120.0+60.0*(B-R)/Delta 
      } else { // between magenta and cyan 
        H=240.0+60.0*(R-G)/Delta 
      }
    }
  }
  
  if (H<0.0 ) H=H+360.0 
  
  return {h:H, s:S, v:V/255.0};  	
}
	
	
Widgui_Utils.prototype.hsvToRgb = function(H, S, V) {
	var R, G, B;
	
  if (S==0.0) { // color is on black-and-white center line 
    R=V;           // achromatic: shades of gray 
    G=V;           // supposedly invalid for h=0 but who cares 
    B=V;
    
  } else {
  	var hTemp;
    if (H==360.0) {  // 360 degrees same as 0 degrees 
      hTemp=0.0 ;
    } else {
      hTemp=H ;
    }
    
    hTemp=hTemp/60.0;   // h is now in [0,6) 
    var i=Math.floor(hTemp);  // largest integer <= h 
    var f=hTemp-i;          // fractional part of h 
    
    var p=V*(1.0-S) ;
    var q=V*(1.0-(S*f)) ;
    var t=V*(1.0-(S*(1.0-f))) ;    
        
    switch( i) {
      case 0: 
        R = V ;
        G = t; 
        B = p;  break;
      case 1: 
        R = q ;
        G = V; 
        B = p; break;
      case 2: 
        R = p ;
        G = V; 
        B = t; break;
      case 3: 
        R = p ;
        G = q; 
        B = V; break;
      case 4: 
        R = t ;
        G = p; 
        B = V; break;
      case 5: 
        R = V ;
        G = p; 
        B = q; break;
    } 	
  } 	
  
  return [ R*255, G*255, B*255 ];
}



Widgui_Utils.prototype.numberPadding = function(iNumber, iLength) {
	var s = iNumber.toString();
	while (s.length < iLength) {
		s = "0" + s;
	}
	return s;
}


Widgui_Utils.prototype.getUniqueID = function() {
	if (this.uniqueID == undefined) this.uniqueID = 0;
	this.uniqueID++;
	return this.uniqueID;
}


Widgui_Utils.prototype.using = function(iControlName) {
	this.usingControl(iControlName);
}


Widgui_Utils.prototype.usingControl = function(iControlName) {
	if (iControlName != "UserControl") this.usingControl("UserControl");
	
	for (var i = 0; i < this.includedFiles.length; i++) {
		if (this.includedFiles[i] == iControlName) return;
	}
	
	include(Widgui.getLibraryPath() + "/Scripts/Widgui_" + iControlName + ".js");
	
	this.includedFiles.push(iControlName);
}


String.prototype.trim = function() {
	var spaceCharacters = " 	\n\r";
	
	var stringLength = this.length;
	
	if (stringLength == 0) return "";
	
	var firstCharIndex = 0;
	var isEmptyString = true;
	for (var charIndex = 0; charIndex < stringLength; charIndex++) {		
		if (spaceCharacters.indexOf(this[charIndex]) < 0) {
			firstCharIndex = charIndex;
			isEmptyString = false;
			break;
		}
	}
	
	if (isEmptyString) return "";
	
	var lastCharIndex = stringLength - 1;
	for (var charIndex = stringLength - 1; charIndex >= 0; charIndex--) {
		if (spaceCharacters.indexOf(this[charIndex]) < 0) {
			lastCharIndex = charIndex;
			break;
		}
	}
	
	return this.substring(firstCharIndex, lastCharIndex + 1);
}


Widgui = new Widgui_Manager();

var skinFolder = undefined;
if (this["___Widgui_InitialLibraryPath"] != undefined) Widgui.setLibraryPath(___Widgui_InitialLibraryPath);
if (this["___Widgui_InitialSkinFolder"] != undefined) skinFolder = this["___Widgui_InitialSkinFolder"];

Widgui.Utils = new Widgui_Utils();
Widgui.Utils.FunctionAnimation = Widgui_Utils_FunctionAnimation;
Widgui.Skin = new Widgui_Skin(skinFolder);
Widgui.global = {}; // Used by other WidGUI classes to create objects that are global to the WidGUI framework