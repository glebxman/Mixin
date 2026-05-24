$ErrorActionPreference = 'SilentlyContinue'

function Remove-IfExists($path) {
    if (Test-Path -LiteralPath $path) {
        $sizeBefore = (Get-ChildItem -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue |
                       Measure-Object -Property Length -Sum).Sum
        Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue
        if (Test-Path -LiteralPath $path) {
            $sizeAfter = (Get-ChildItem -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue |
                          Measure-Object -Property Length -Sum).Sum
            $freed = ($sizeBefore - $sizeAfter)
        } else {
            $freed = $sizeBefore
        }
        $gb = if ($freed) { [math]::Round($freed / 1GB, 2) } else { 0 }
        Write-Host ("  freed {0,6} GB    {1}" -f $gb, $path)
    }
}

Write-Host "Cleaning npm-cache leftovers..."
Remove-IfExists "$env:LOCALAPPDATA\npm-cache"

Write-Host ""
Write-Host "Cleaning uv (Python) cache..."
Remove-IfExists "$env:LOCALAPPDATA\uv\cache"

Write-Host ""
Write-Host "Cleaning Windows Temp (skipping locked files)..."
$beforeTemp = (Get-ChildItem -LiteralPath $env:TEMP -Recurse -Force -ErrorAction SilentlyContinue |
               Measure-Object -Property Length -Sum).Sum
Get-ChildItem -LiteralPath $env:TEMP -Force -ErrorAction SilentlyContinue |
    ForEach-Object {
        Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
$afterTemp = (Get-ChildItem -LiteralPath $env:TEMP -Recurse -Force -ErrorAction SilentlyContinue |
              Measure-Object -Property Length -Sum).Sum
$freedTemp = ($beforeTemp - $afterTemp)
$gbTemp = if ($freedTemp) { [math]::Round($freedTemp / 1GB, 2) } else { 0 }
Write-Host ("  freed {0,6} GB    {1}" -f $gbTemp, $env:TEMP)
