Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\GitHub\command-center"
WshShell.Environment("Process")("DASHBOARD_SILENT") = "1"
WshShell.Run "cmd /c node server.js", 0, False
