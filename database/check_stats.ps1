$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open('C:\Users\OM\Documents\RAKTSETU\RaktSetu_SVNIT_CS203_DBMS_Project_Report.docx')
$pages = $doc.ComputeStatistics(2)
$paras = $doc.Paragraphs.Count
$tables = $doc.Tables.Count
Write-Output "Pages: $pages"
Write-Output "Paragraphs: $paras"
Write-Output "Tables: $tables"
$doc.Close()
$word.Quit()
