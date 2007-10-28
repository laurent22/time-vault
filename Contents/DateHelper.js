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



// (C) Jay Packer - calculate the hours, minutes, and seconds until the specified user time

function parseTimeString(timeStr) {
	var timePattern = /^(\d{1,2}):(\d{2})(:(\d{2}))?(\s?(AM|am|PM|pm))?$/;
	
	var matchArray = timeStr.match(timePattern);
	if (matchArray == null) return undefined;
	
	var hour = matchArray[1];
	var minute = matchArray[2];
	var second = matchArray[4] ? matchArray[4] : '0'; //if no seconds were entered set seconds to zero.
	var ampm = matchArray[6] ? matchArray[6] : ''; //if using 24 hour time, set ampm to empty string.

	//convert values to numbers
	hour = Number(hour);
	minute = Number(minute);
	second = Number(second);	

	//set hours back to 24 hour clock
	if (ampm.toLowerCase() == 'am' && hour == 12) {
		hour = 0;
	} else if (ampm.toLowerCase() == 'pm' && hour != 12) {
		hour = hour + 12;
	}
	
	return { hours:hour, minutes:minute, seconds:second };
}


function datesEqual(d1, d2) {
	return d1.getFullYear() == d2.getFullYear() && d1.getDate() == d2.getDate() && d1.getMonth() == d2.getMonth();
}
	
	

// Require a loc() function that returns
// the localized month and day

function getFuzzyDateString(iDate) {
	var d = iDate;
	var now = new Date();
	
	function areDatesEqual(d1, d2) {
		return d1.getFullYear() == d2.getFullYear() && d1.getDate() == d2.getDate() && d1.getMonth() == d2.getMonth()
	}
	
	if (areDatesEqual(d, now)) return loc("global_today");
	
	var yesterday = now.duplicate();
	yesterday.setDate(yesterday.getDate() - 1);	
	if (areDatesEqual(d, yesterday)) return loc("global_yesterday");
	
	yesterday.setDate(yesterday.getDate() - 1);	
	if (areDatesEqual(d, yesterday)) return loc("global_dayBeforeYesterday");
	
	var tomorrow = now.duplicate();
	tomorrow.setDate(tomorrow.getDate() + 1);	
	if (areDatesEqual(d, tomorrow)) return loc("global_tomorrow");
	
	tomorrow.setDate(tomorrow.getDate() + 1);	
	if (areDatesEqual(d, tomorrow)) return loc("global_dayAfterTomorrow");
	
	return undefined;
}


// Format string example: "DAY d2 MM H2:m2"
function getFormattedDateString(iDate, iFormatString) {
	
	function twoDigits(iNumber) {
		result = iNumber.toString();
		while (result.length < 2) result = "0" + result;
		return result;
	}
	
	var d = iDate;
	
	var formatString = iFormatString;
	
	var monthString = loc("month" + d.getMonth());
	var dayString = loc("day" + d.getDay());
	
	var hour24 = d.getHours();
	var hour12 = hour24;
	if (hour12 > 12) hour12 = hour12 - 12;
	if (hour12 == 0) hour12 = 12;
	
	var output = "";
	
	var m;
	
	for (var sIndex = 0; sIndex < formatString.length; sIndex++) {
		
		var s = undefined;
		var tagLength = 0;
		
		for (var charCount = 5; charCount >= 2; charCount--) {
			m = formatString.substr(sIndex, charCount);
			
			switch (m) {
				
				case "mn2": s = twoDigits(d.getMonth() + 1); break;
				case "mn1": s = d.getMonth() + 1; break;
				case "mm": s = monthString.substr(0, 3); break;
				case "MM": s = monthString; break;
				
				case "d2": s = twoDigits(d.getDate()); break;
				case "d1": s = d.getDate(); break;
				
				case "y2": s = d.getFullYear().toString().substr(2,2); break;
				case "y4": s = d.getFullYear(); break;
				
				case "h2": s = twoDigits(hour12); break;
				case "h1": s = hour12; break;
				case "H2": s = twoDigits(hour24); break;
				case "H1": s = hour24; break;
				case "m2": s = twoDigits(d.getMinutes()); break;
				case "m1": s = d.getMinutes(); break;
				case "s2": s = twoDigits(d.getSeconds()); break;
				case "s1": s = d.getSeconds(); break;												
				
				case "day": s = dayString.substr(0, 3); break;												
				case "DAY": s = dayString; break;												
								
				case "AMPM": s = d.getHours() < 12 ? "AM":"PM";	break;
			}
						
			if (s != undefined) {
				tagLength = m.length;
				break;
			}
		}		
		
		if (s == undefined) {
			output += formatString[sIndex];
		} else {
			output += s;
			sIndex += tagLength - 1;
		}
	}	
	
	return output;
}







Date.prototype.duplicate = function() {
	return new Date(Number(this));
}


