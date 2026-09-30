$docx = "C:\Users\kate angel\Downloads\DAET-Tourism-Crisis-Communication-Chap-1-3 2.docx"
$zip = "C:\Users\kate angel\Downloads\DAET_crisis_alert_system\.tmp-chap.zip"
$dir = "C:\Users\kate angel\Downloads\DAET_crisis_alert_system\.tmp-docx-extract"
Remove-Item $dir -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item $docx $zip -Force
Expand-Archive -Path $zip -DestinationPath $dir -Force
& "C:\Users\kate angel\Downloads\DAET_crisis_alert_system\.tmp-extract-docx.ps1"
