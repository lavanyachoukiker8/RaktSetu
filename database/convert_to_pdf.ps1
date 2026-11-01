try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $inPath = "C:\Users\OM\Documents\RAKTSETU\RaktSetu_SVNIT_CS203_DBMS_Project_Report.docx"
    $outPath = "C:\Users\OM\Documents\RAKTSETU\RaktSetu_SVNIT_CS203_DBMS_Project_Report.pdf"
    $doc = $word.Documents.Open($inPath)
    $doc.SaveAs([ref]$outPath, [ref]17) # 17 is wdFormatPDF
    $doc.Close()
    $word.Quit()
    Write-Output "SUCCESS: PDF created at $outPath"
} catch {
    Write-Output "Word COM error: $_"
}
