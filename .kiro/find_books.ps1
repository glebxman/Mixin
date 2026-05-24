$root = 'd:\Wrap projects\other_projects\mixin\data\textbooks'
Get-ChildItem -Path $root -Recurse -File -Include *.pdf, *.docx, *.txt, *.md |
    Where-Object { $_.Name -ne 'README.md' -and $_.Name -ne '.gitkeep' } |
    Select-Object @{N='SizeMB';E={[math]::Round($_.Length/1MB,2)}}, FullName |
    Sort-Object SizeMB -Descending |
    Format-Table -AutoSize -Wrap

Write-Host ""
$total = (Get-ChildItem -Path $root -Recurse -File -Include *.pdf, *.docx, *.txt, *.md |
    Where-Object { $_.Name -ne 'README.md' -and $_.Name -ne '.gitkeep' }).Count
Write-Host "Total files: $total"
