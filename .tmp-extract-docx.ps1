$path = "C:\Users\kate angel\Downloads\DAET_crisis_alert_system\.tmp-docx-extract\word\document.xml"
[xml]$doc = Get-Content -Path $path -Encoding UTF8
$ns = New-Object System.Xml.XmlNamespaceManager($doc.NameTable)
$ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")
$paragraphs = $doc.SelectNodes("//w:p", $ns)
$lines = New-Object System.Collections.Generic.List[string]
foreach ($p in $paragraphs) {
  $ts = $p.SelectNodes(".//w:t", $ns)
  if ($ts.Count -eq 0) { continue }
  $line = ($ts | ForEach-Object { $_.InnerText }) -join ""
  if ($line.Trim().Length -gt 0) { [void]$lines.Add($line) }
}
$text = $lines -join "`n"
$outPath = "C:\Users\kate angel\Downloads\DAET_crisis_alert_system\.tmp-docx-text.txt"
$text | Out-File -FilePath $outPath -Encoding utf8
Write-Output "paragraphs: $($lines.Count)"
