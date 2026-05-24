$ErrorActionPreference = 'SilentlyContinue'

$path = "$env:LOCALAPPDATA\Android"
if (Test-Path -LiteralPath $path) {
    $before = (Get-ChildItem -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue |
               Measure-Object -Property Length -Sum).Sum
    Write-Host ("Removing {0} ({1:N2} GB)..." -f $path, ($before / 1GB))
    Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue
    if (Test-Path -LiteralPath $path) {
        $after = (Get-ChildItem -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue |
                  Measure-Object -Property Length -Sum).Sum
        Write-Host ("  partial: {0:N2} GB still left at {1}" -f ($after / 1GB), $path)
    } else {
        Write-Host "  done"
    }
} else {
    Write-Host "  Android SDK folder not found at $path"
}

# Заодно удалим сопутствующие SDK-папки если есть
foreach ($extra in @(
    "$env:USERPROFILE\.android",
    "$env:LOCALAPPDATA\Google\AndroidStudio",
    "$env:APPDATA\Google\AndroidStudio"
)) {
    if (Test-Path -LiteralPath $extra) {
        $sz = (Get-ChildItem -LiteralPath $extra -Recurse -Force -ErrorAction SilentlyContinue |
               Measure-Object -Property Length -Sum).Sum
        Remove-Item -LiteralPath $extra -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host ("  + cleaned {0} ({1:N2} GB)" -f $extra, ($sz / 1GB))
    }
}

$d = Get-PSDrive C
Write-Host ("Drive C: free={0:N2} GB / used={1:N2} GB" -f ($d.Free / 1GB), ($d.Used / 1GB))
