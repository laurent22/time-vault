#Persistent
#SingleInstance force

Loop, %0%  ; For each parameter:
{
	param := %A_Index%  ; Fetch the contents of the variable whose name is contained in A_Index.
	if (param = "kill") {
		ExitApp
	}
}


SetTimer, CheckTimeVault, 1000
return










CheckTimeVault:
	
DetectHiddenWindows, On

className = KFWindow
	
found = 0
	
WinGet, id, list,,, Program Manager
Loop, %id%
{
		this_id := id%A_Index%
			
		WinGet, processID, PID, ahk_id %this_id%			
		WinGetClass, this_class, ahk_id %this_id%
		
		if ((this_class = className) or (className = "")) 
		{    
			WinGetTitle, this_title, ahk_id %this_id%
			
			if (this_title = "Time Vault") {
				found = 1
			}
			
			if (this_title = "Time Vault DEBUG") {
				found = 1
			}
		}
}


if (found = 1) {
	
} else {
	ExitApp
}
	
return


