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




function drawRectangleImage(iContext, iImage, iWidth, iHeight) {
	var o;
	
	var sImageWidth = iImage.srcWidth;
	var sImageHeight = iImage.srcHeight;
	
	if (sImageWidth < sImageHeight) {
		o = Math.floor(sImageWidth / 2.0);
	} else {
		o = Math.floor(sImageHeight / 2.0);
	}
	
	if (iWidth - o * 2 <= 0) o = Math.floor(iWidth / 2.0);
	if (iHeight - o * 2 <= 0) o = Math.floor(iHeight / 2.0);
	
	o -= 2;	
	
	//o = 50;
		
	// === Top left
	
	var sX = 0;
	var sY = 0;
	var sW = o;
	var sH = o;
	
	var dX = 0;
	var dY = 0;
	var dW = o;
	var dH = o;	
	
	iContext.drawImage(iImage, sX, sY, sW, sH, dX, dY, dW, dH);
	
	// === Top middle
	
	sX = o;
	//sW = 1;
	sW = sImageWidth - o * 2;
	
	dX = dX + dW;
	dW = iWidth - o * 2;	
		
	iContext.drawImage(iImage, sX, sY, sW, sH, dX, dY, dW, dH);
	
	// === Top right
		
	sX = sImageWidth - o;
	sW = o;
	
	dX = dX + dW;
	dW = o;
	
	iContext.drawImage(iImage, sX, sY, sW, sH, dX, dY, dW, dH);
	
	// === Middle right
	
	sY = o;
	//sH = 1;
	sH = sImageHeight - o * 2;
	
	dY = o;
	dH = iHeight - o * 2;
	
	iContext.drawImage(iImage, sX, sY, sW, sH, dX, dY, dW, dH);
	
	// === Bottom right
	
	sY = sImageHeight - o;
	sH = o;
	
	dY = dY + dH;
	dH = o;
	
	iContext.drawImage(iImage, sX, sY, sW, sH, dX, dY, dW, dH);
	
	// === Bottom middle
	
	sX = o;
	//sW = 1;
	sW = sImageWidth - o * 2;
	
	dX = o;
	dW = iWidth - o * 2;
	
	iContext.drawImage(iImage, sX, sY, sW, sH, dX, dY, dW, dH);
	
	// === Bottom left
	
	sX = 0;
	sW = o;
	
	dX = 0;
	dW = o;
	
	iContext.drawImage(iImage, sX, sY, sW, sH, dX, dY, dW, dH);
	
	// === Middle left
	
	sY = o;
	//sH = 1;
	sH = sImageHeight - o * 2;
	
	dY = o;
	dH = iHeight - o * 2;
	
	iContext.drawImage(iImage, sX, sY, sW, sH, dX, dY, dW, dH);
	
	// === Center
	
	sX = o;
	sY = o;
//	sH = 1;
//	sW = 1;
	sH = sImageHeight - o * 2;
	sW = sImageWidth - o * 2;
	
	dX = o;
	dY = o;
	dW = iWidth - o * 2;
	dH = iHeight - o * 2;
	
	iContext.drawImage(iImage, sX, sY, sW, sH, dX, dY, dW, dH);
}
	














function ThreePiecesRectangle(iFilePrefix) {
	this.frame = new Frame();
	
	this.imageLeft = new Image();
	this.imageLeft.src = iFilePrefix + "Left.png";	

	this.imageMiddle = new Image();
	this.imageMiddle.src = iFilePrefix + "Middle.png";	
	
	this.imageRight = new Image();
	this.imageRight.src = iFilePrefix + "Right.png";	
	
	this.frame.appendChild(this.imageLeft);
	this.frame.appendChild(this.imageMiddle);
	this.frame.appendChild(this.imageRight);
	
	this.frame.height = this.imageMiddle.height;
	
	this.update();
}

Object.defineProperty(ThreePiecesRectangle.prototype, "hOffset", { set: function(v) { this.frame.hOffset = v; }, configurable: true, enumerable: true });
Object.defineProperty(ThreePiecesRectangle.prototype, "hOffset", { get: function() { return this.frame.hOffset; }, configurable: true, enumerable: true });
Object.defineProperty(ThreePiecesRectangle.prototype, "vOffset", { set: function(v) { this.frame.vOffset = v; }, configurable: true, enumerable: true });
Object.defineProperty(ThreePiecesRectangle.prototype, "vOffset", { get: function() { return this.frame.vOffset; }, configurable: true, enumerable: true });
Object.defineProperty(ThreePiecesRectangle.prototype, "visible", { set: function(v) { this.frame.visible = v; }, configurable: true, enumerable: true });
Object.defineProperty(ThreePiecesRectangle.prototype, "visible", { get: function() { return this.frame.visible; }, configurable: true, enumerable: true });
Object.defineProperty(ThreePiecesRectangle.prototype, "opacity", { set: function(v) { this.frame.opacity = v; }, configurable: true, enumerable: true });
Object.defineProperty(ThreePiecesRectangle.prototype, "opacity", { get: function() { return this.frame.opacity; }, configurable: true, enumerable: true });


Object.defineProperty(ThreePiecesRectangle.prototype, "height", { set: function(v) {
	print("[Error] ThreePiecesRectangle.height: height is read-only.");
}, configurable: true, enumerable: true });

Object.defineProperty(ThreePiecesRectangle.prototype, "height", { get: function() {
	return this.frame.height;
}, configurable: true, enumerable: true });

Object.defineProperty(ThreePiecesRectangle.prototype, "width", { set: function(v) {
	this.frame.width = v;
	this.update();
}, configurable: true, enumerable: true });

Object.defineProperty(ThreePiecesRectangle.prototype, "width", { get: function() {
	return this.frame.width;
}, configurable: true, enumerable: true });

ThreePiecesRectangle.prototype.update = function() {
	this.imageMiddle.hOffset = this.imageLeft.width;
	this.imageMiddle.width = this.frame.width - (this.imageRight.width + this.imageLeft.width);
	this.imageRight.hOffset = this.imageMiddle.hOffset + this.imageMiddle.width;
}















function dec2hex(d) {
	var hD = "0123456789ABCDEF";
	var h = hD.substr(d&15,1);
	while(d>15) {d>>=4;h=hD.substr(d&15,1)+h;}
	return twoDigits(h);
}


function hex2dec(h) {return parseInt(h,16);}


function splitColor(h) {
	return [hex2dec(h.substr(1, 2)), hex2dec(h.substring(3, 5)), hex2dec(h.substring(5, 7))];
} 


function combineColor(c) {
	var result = "#";
	return result.concat(dec2hex(c[0]), dec2hex(c[1]), dec2hex(c[2]));
}


function getColorBrightness(iColor) {
	var c = splitColor(iColor);
	var maxValue = 0;
	
	for (var i = 0; i < c.length; i++) {
		var cc = c[i];
		if (cc > maxValue) maxValue = cc;	
	}
	
	return maxValue / 255.0;
}


function setColorBrightness(iColor, iNewBrightness) {
	var c = splitColor(iColor);
	
	currentBrightness = getColorBrightness(iColor);
	
	if (currentBrightness == 0) {
		for (var i = 0; i < 3; i++) {
			c[i] = iNewBrightness * 255.0;
		}
	} else {
		var deltaBrightness = iNewBrightness / currentBrightness;
		for (var i = 0; i < 3; i++) {
			c[i] = c[i] * deltaBrightness;
		}
	}
	
	return combineColor(c);
}


function rgb2lab(R, G, B) {
			
		if (G == undefined) {
			var c = splitColor(R);
			R = c[0];
			G = c[1];
			B = c[2];
		}
	
		//http://www.brucelindbloom.com
		
		var lab = {};
		  
		var r, g, b, X, Y, Z, fx, fy, fz, xr, yr, zr;
		var Ls, as, bs;
		var eps = 216/24389;
		var k = 24389/27;
		   
		var Xr = 0.964221;  // reference white D50
		var Yr = 1.0;
		var Zr = 0.825211;
		
		// RGB to XYZ
		r = R/255; //R 0..1
		g = G/255; //G 0..1
		b = B/255; //B 0..1
		
		// assuming sRGB (D65)
		if (r <= 0.04045)
			r = r/12;
		else
			r = Math.pow((r+0.055)/1.055,2.4);
		
		if (g <= 0.04045)
			g = g/12;
		else
			g = Math.pow((g+0.055)/1.055,2.4);
		
		if (b <= 0.04045)
			b = b/12;
		else
			b = Math.pow((b+0.055)/1.055,2.4);
		
		
		X =  0.436052025*r     + 0.385081593*g + 0.143087414 *b;
		Y =  0.222491598*r     + 0.71688606 *g + 0.060621486 *b;
		Z =  0.013929122*r     + 0.097097002*g + 0.71418547  *b;
		
		// XYZ to Lab
		xr = X/Xr;
		yr = Y/Yr;
		zr = Z/Zr;
				
		if ( xr > eps )
			fx =  Math.pow(xr, 1/3.);
		else
			fx = ((k * xr + 16.) / 116.);
		 
		if ( yr > eps )
			fy =  Math.pow(yr, 1/3.);
		else
		fy = ((k * yr + 16.) / 116.);
		
		if ( zr > eps )
			fz =  Math.pow(zr, 1/3.);
		else
			fz = ((k * zr + 16.) / 116);
		
		Ls = ( 116 * fy ) - 16;
		as = 500*(fx-fy);
		bs = 200*(fy-fz);
		
		lab.l = (2.55*Ls + .5);
		lab.a = (as + .5); 
		lab.b = (bs + .5);       
		
		return lab;
	} 
	
	

function rgbToHsv(R, G, B) {
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
  
  return {h:h, s:s, v:v/255.0};
  	
}
	
	
function hsvToRgb(H, S, V) {
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