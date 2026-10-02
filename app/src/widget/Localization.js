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


// Requires a getFilename() function


var __customLocaleCode = undefined;
var __localizedStrings = {};
var __isoLocaleCodes = [["aa", "Afar"], ["ab", "Abkhazian"], ["af", "Afrikaans"], ["am", "Amharic"], ["ar", "Arabic"], ["as", "Assamese"], ["ay", "Aymara"], ["az", "Azerbaijani"], ["ba", "Bashkir"], ["be", "Byelorussian"], ["bg", "Bulgarian"], ["bh", "Bihari"], ["bi", "Bislama"], ["bn", "Bengali; Bangla"], ["bo", "Tibetan"], ["br", "Breton"], ["ca", "Catalan"], ["co", "Corsican"], ["cs", "Czech"], ["cy", "Welsh"], ["da", "Dansk", "Danish"], ["de", "Deutch", "German"], ["dz", "Bhutani"], ["el", "Greek"], ["en", "English", "English"], ["eo", "Esperanto"], ["es", "Español", "Spanish"], ["et", "Estonian"], ["eu", "Basque"], ["fa", "Persian"], ["fi", "Finnish"], ["fj", "Fiji"], ["fo", "Faroese"], ["fr", "Français", "French"], ["fy", "Frisian"], ["ga", "Irish"], ["gd", "Scots Gaelic"], ["gl", "Galician"], ["gn", "Guarani"], ["gu", "Gujarati"], ["ha", "Hausa"], ["he", "עיברית", "Hebrew"], ["hi", "Hindi"], ["hr", "Croatian"], ["hu", "Hungarian"], ["hy", "Armenian"], ["ia", "Interlingua"], ["id", "Indonesian (formerly in)"], ["ie", "Interlingue"], ["ik", "Inupiak"], ["is", "Icelandic"], ["it", "Italiano", "Italian"], ["iu", "Inuktitut"], ["ja", "Japanese"], ["jw", "Javanese"], ["ka", "Georgian"], ["kk", "Kazakh"], ["kl", "Greenlandic"], ["km", "Cambodian"], ["kn", "Kannada"], ["ko", "Korean"], ["ks", "Kashmiri"], ["ku", "Kurdish"], ["ky", "Kirghiz"], ["la", "Latin"], ["ln", "Lingala"], ["lo", "Laothian"], ["lt", "Lietuvių kalba", "Lithuanian"], ["lv", "Latvian, Lettish"], ["mg", "Malagasy"], ["mi", "Maori"], ["mk", "Macedonian"], ["ml", "Malayalam"], ["mn", "Mongolian"], ["mo", "Moldavian"], ["mr", "Marathi"], ["ms", "Malay"], ["mt", "Maltese"], ["my", "Burmese"], ["na", "Nauru"], ["ne", "Nepali"], ["nl", "Nederlands", "Dutch"], ["no", "Norwegian"], ["oc", "Occitan"], ["om", "(Afan) Oromo"], ["or", "Oriya"], ["pa", "Punjabi"], ["pl", "Język polski", "Polish"], ["ps", "Pashto, Pushto"], ["pt", "Português", "Portuguese"], ["qu", "Quechua"], ["rm", "Rhaeto-Romance"], ["rn", "Kirundi"], ["ro", "Romanian"], ["ru", "Русский", "Russian"], ["rw", "Kinyarwanda"], ["sa", "Sanskrit"], ["sd", "Sindhi"], ["sg", "Sangho"], ["sh", "Serbo-Croatian"], ["si", "Sinhalese"], ["sk", "Slovak"], ["sl", "Slovenian"], ["sm", "Samoan"], ["sn", "Shona"], ["so", "Somali"], ["sq", "Shqip", "Albanian"], ["sr", "Serbian"], ["ss", "Siswati"], ["st", "Sesotho"], ["su", "Sundanese"], ["sv", "Swedish"], ["sw", "Swahili"], ["ta", "Tamil"], ["te", "Telugu"], ["tg", "Tajik"], ["th", "Thai"], ["ti", "Tigrinya"], ["tk", "Turkmen"], ["tl", "Tagalog"], ["tn", "Setswana"], ["to", "Tonga"], ["tr", "Türkçe", "Turkish"], ["ts", "Tsonga"], ["tt", "Tatar"], ["tw", "Twi"], ["ug", "Uighur"], ["uk", "Ukrainian"], ["ur", "Urdu"], ["uz", "Uzbek"], ["vi", "Vietnamese"], ["vo", "Volapuk"], ["wo", "Wolof"], ["xh", "Xhosa"], ["yi", "Yiddish (formerly ji)"], ["yo", "Yoruba"], ["za", "Zhuang"], ["zh", "Chinese"], ["zu", "Zulu"]];


function getLanguageFromIsoCode(iCode) {
	for (var i = 0; i < __isoLocaleCodes.length; i++) {
		var c = __isoLocaleCodes[i];
		if (c[0] == iCode) return c[1];
	}
}


function getLanguageFromIsoCode_EN(iCode) {
	for (var i = 0; i < __isoLocaleCodes.length; i++) {
		var c = __isoLocaleCodes[i];
		if (c[0] == iCode) return c[2];
	}
}


function getAvailableLocalizations() {
	var o = [];
	var t = ["en", "fr", "cs", "de", "es", "gl", "hu", "no", "pt", "zh", "da"];
	for (var i = 0; i < t.length; i++) {
		var l = getLanguageFromIsoCode(t[i]);
		o.push( { code:t[i], name:l });
	}
	
	return o;
	
	
	// The following code needs to be fixed. It won't work in
	// a flat format Widget
	
	
	
	var folderItems = filesystem.getDirectoryContents("Resources", false);
	var localizations = [];
	
	for (var i = 0; i < folderItems.length; i++) {
		var folderItem = "Resources/" + folderItems[i];
		if (!filesystem.isDirectory(folderItem)) continue;
		
		var isoCode = getFilename(folderItem);
		var languageName = getLanguageFromIsoCode(isoCode);
		
		if (languageName == undefined) continue;
		
		localizations.push({ code:isoCode, name:languageName });
	}
	
	return localizations;
}	
	

function __getString(iISOLocaleCode, iStringID, iParameters, iReplaceParameters, iResourcePath) {
	if (__localizedStrings[iResourcePath] == undefined) __localizedStrings[iResourcePath] = {};
		
	var strings = __localizedStrings[iResourcePath][iISOLocaleCode]; // __localizedStrings[iISOLocaleCode];
	
	if (iReplaceParameters == undefined) iReplaceParameters = true;
		
	if (strings == undefined) {		
		strings = new Object();
		
		var returnRE = /\\n/;
		
		var filePath;
		
		if (iResourcePath == undefined) {
			filePath = widget.extractFile("Resources/" + iISOLocaleCode + "/Localizable.strings");
		} else {
			filePath = iResourcePath + "/" + iISOLocaleCode + "/Localizable.strings";
		}
				
		if (typeof(filePath) == "string" && filesystem.itemExists(filePath)) {
			var lines = filesystem.readFile(filePath, true);
			for (var i = 0; i < lines.length; i++) {
				var line = lines[i];
				var splitted = line.split('"');
				if (splitted.length != 5) continue;
				
				var stringID = splitted[1];
				var s = splitted[3];
				
				while (s.search(returnRE) > -1) s = s.replace(returnRE, "\n");
				
				strings[stringID] = s;
			}
			
			if (iResourcePath == undefined) filesystem.remove(filePath);
		}
		__localizedStrings[iResourcePath][iISOLocaleCode] = strings;
	}
	
	var r = strings[iStringID];
			
	if (r == undefined) {
		if (iISOLocaleCode != "en") {			
			r = __getString("en", iStringID, iParameters, false, iResourcePath);
			if (r == undefined) r = iStringID;
		} else {
			r = iStringID;
		}
		strings[iStringID] = r;
	}
	
	if (!iReplaceParameters) return r;
	
	var splitted = r.split("%");
	var output = "";
	var isEven = false;
	
	for (var i = 0; i < splitted.length; i++) {
		var c = splitted[i];
		
		var isNumber;
		
		if (isEven) {
			isNumber = (i % 2 == 0);
		} else {
			isNumber = (i % 2 == 1);
		}
		
		if (isNumber) {
			var n = Number(c);
			if (n.toString().length == c.length && (!isNaN(n))) {
				var replacement = iParameters[n];
				if (replacement == undefined) replacement = "";
				output += replacement;
			} else {
				isEven = !isEven;
				output += "%" + c;
			}
		} else {
			output += c;
		}
	}
	
	return output;
}


function loc(iStringID) {
	var parameters = [];
	for (var i = 1; i < arguments.length; i++) parameters.push(arguments[i]);
		
	var c = __customLocaleCode;
	if (c == undefined || c == "default") c = widget.locale;
	
	return __getString(c, iStringID, parameters, undefined);
}




//var __customLocaleCode = undefined;
//var __localizedStrings = new Object();
//var __isoLocaleCodes = [["aa", "Afar"], ["ab", "Abkhazian"], ["af", "Afrikaans"], ["am", "Amharic"], ["ar", "Arabic"], ["as", "Assamese"], ["ay", "Aymara"], ["az", "Azerbaijani"], ["ba", "Bashkir"], ["be", "Byelorussian"], ["bg", "Bulgarian"], ["bh", "Bihari"], ["bi", "Bislama"], ["bn", "Bengali; Bangla"], ["bo", "Tibetan"], ["br", "Breton"], ["ca", "Catalan"], ["co", "Corsican"], ["cs", "Czech"], ["cy", "Welsh"], ["da", "Danish"], ["de", "Deutch"], ["dz", "Bhutani"], ["el", "Greek"], ["en", "English"], ["eo", "Esperanto"], ["es", "Español"], ["et", "Estonian"], ["eu", "Basque"], ["fa", "Persian"], ["fi", "Finnish"], ["fj", "Fiji"], ["fo", "Faroese"], ["fr", "Français"], ["fy", "Frisian"], ["ga", "Irish"], ["gd", "Scots Gaelic"], ["gl", "Galician"], ["gn", "Guarani"], ["gu", "Gujarati"], ["ha", "Hausa"], ["he", "Hebrew"], ["hi", "Hindi"], ["hr", "Croatian"], ["hu", "Hungarian"], ["hy", "Armenian"], ["ia", "Interlingua"], ["id", "Indonesian (formerly in)"], ["ie", "Interlingue"], ["ik", "Inupiak"], ["is", "Icelandic"], ["it", "Italiano"], ["iu", "Inuktitut"], ["ja", "Japanese"], ["jw", "Javanese"], ["ka", "Georgian"], ["kk", "Kazakh"], ["kl", "Greenlandic"], ["km", "Cambodian"], ["kn", "Kannada"], ["ko", "Korean"], ["ks", "Kashmiri"], ["ku", "Kurdish"], ["ky", "Kirghiz"], ["la", "Latin"], ["ln", "Lingala"], ["lo", "Laothian"], ["lt", "Lithuanian"], ["lv", "Latvian, Lettish"], ["mg", "Malagasy"], ["mi", "Maori"], ["mk", "Macedonian"], ["ml", "Malayalam"], ["mn", "Mongolian"], ["mo", "Moldavian"], ["mr", "Marathi"], ["ms", "Malay"], ["mt", "Maltese"], ["my", "Burmese"], ["na", "Nauru"], ["ne", "Nepali"], ["nl", "Nederlands"], ["no", "Norwegian"], ["oc", "Occitan"], ["om", "(Afan) Oromo"], ["or", "Oriya"], ["pa", "Punjabi"], ["pl", "Polish"], ["ps", "Pashto, Pushto"], ["pt", "Portuguese"], ["qu", "Quechua"], ["rm", "Rhaeto-Romance"], ["rn", "Kirundi"], ["ro", "Romanian"], ["ru", "Russian"], ["rw", "Kinyarwanda"], ["sa", "Sanskrit"], ["sd", "Sindhi"], ["sg", "Sangho"], ["sh", "Serbo-Croatian"], ["si", "Sinhalese"], ["sk", "Slovak"], ["sl", "Slovenian"], ["sm", "Samoan"], ["sn", "Shona"], ["so", "Somali"], ["sq", "Albanian"], ["sr", "Serbian"], ["ss", "Siswati"], ["st", "Sesotho"], ["su", "Sundanese"], ["sv", "Swedish"], ["sw", "Swahili"], ["ta", "Tamil"], ["te", "Telugu"], ["tg", "Tajik"], ["th", "Thai"], ["ti", "Tigrinya"], ["tk", "Turkmen"], ["tl", "Tagalog"], ["tn", "Setswana"], ["to", "Tonga"], ["tr", "Turkish"], ["ts", "Tsonga"], ["tt", "Tatar"], ["tw", "Twi"], ["ug", "Uighur"], ["uk", "Ukrainian"], ["ur", "Urdu"], ["uz", "Uzbek"], ["vi", "Vietnamese"], ["vo", "Volapuk"], ["wo", "Wolof"], ["xh", "Xhosa"], ["yi", "Yiddish (formerly ji)"], ["yo", "Yoruba"], ["za", "Zhuang"], ["zh", "Chinese"], ["zu", "Zulu"]];
//
//
//function getLanguageFromIsoCode(iCode) {
//	for (var i = 0; i < __isoLocaleCodes.length; i++) {
//		var c = __isoLocaleCodes[i];
//		if (c[0] == iCode) return c[1];
//	}
//}
//
//
//function getAvailableLocalizations() {
//	var o = [];
//	var t = ["en", "fr", "cs", "de", "es", "gl", "hu", "no", "pt", "zh", "da"];
//	for (var i = 0; i < t.length; i++) {
//		var l = getLanguageFromIsoCode(t[i]);
//		o.push( { code:t[i], name:l });
//	}
//	
//	return o;
//	
//	
//	// The following code needs to be fixed. It won't work in
//	// a flat format Widget
//	
//	
//	
//	var folderItems = filesystem.getDirectoryContents("Resources", false);
//	var localizations = [];
//	
//	for (var i = 0; i < folderItems.length; i++) {
//		var folderItem = "Resources/" + folderItems[i];
//		if (!filesystem.isDirectory(folderItem)) continue;
//		
//		var isoCode = getFilename(folderItem);
//		var languageName = getLanguageFromIsoCode(isoCode);
//		
//		if (languageName == undefined) continue;
//		
//		localizations.push({ code:isoCode, name:languageName });
//	}
//	
//	return localizations;
//}	
//	
//
//function __getString(iISOLocaleCode, iStringID, iParameters, iReplaceParameters) {
//	var strings = __localizedStrings[iISOLocaleCode];
//		
//	if (iReplaceParameters == undefined) iReplaceParameters = true;
//		
//	if (strings == undefined) {		
//		strings = new Object();
//		
//		var returnRE = /\\n/;
//		
//		var filePath = system.widgetDataFolder + "/Localizable.strings";
//		if (filesystem.itemExists(filePath)) filesystem.remove(filePath);
//		filePath = widget.extractFile("Resources/" + iISOLocaleCode + "/Localizable.strings");
//		
//		if (typeof(filePath) == "string") {
//			var lines = filesystem.readFile(filePath, true);
//			for (var i = 0; i < lines.length; i++) {
//				var line = lines[i];
//				var splitted = line.split('"');
//				if (splitted.length != 5) continue;
//				
//				var stringID = splitted[1];
//				var s = splitted[3];
//				
//				while (s.search(returnRE) > -1) s = s.replace(returnRE, "\n");
//				
//				strings[stringID] = s;
//			}
//			
//			filesystem.remove(filePath);
//		}
//		__localizedStrings[iISOLocaleCode] = strings;
//	}
//	
//	var r = strings[iStringID];
//			
//	if (r == undefined) {
//		if (iISOLocaleCode != "en") {			
//			r = __getString("en", iStringID, iParameters, false);
//			if (r == undefined) r = iStringID;
//		} else {
//			r = iStringID;
//		}
//		strings[iStringID] = r;
//	}
//	
//	if (!iReplaceParameters) return r;
//	
//	var splitted = r.split("%");
//	var output = "";
//	var isEven = false;
//	
//	for (var i = 0; i < splitted.length; i++) {
//		var c = splitted[i];
//		
//		var isNumber;
//		
//		if (isEven) {
//			isNumber = (i % 2 == 0);
//		} else {
//			isNumber = (i % 2 == 1);
//		}
//		
//		if (isNumber) {
//			var n = Number(c);
//			if (n.toString().length == c.length && (!isNaN(n))) {
//				var replacement = iParameters[n];
//				if (replacement == undefined) replacement = "";
//				output += replacement;
//			} else {
//				isEven = !isEven;
//				output += "%" + c;
//			}
//		} else {
//			output += c;
//		}
//	}
//	
//	return output;
//}
//
//
//function loc(iStringID) {
//	var parameters = [];
//	for (var i = 1; i < arguments.length; i++) parameters.push(arguments[i]);
//		
//	var c = __customLocaleCode;
//	if (c == undefined || c == "default") c = widget.locale;
//	
//	return __getString(c, iStringID, parameters);
//}