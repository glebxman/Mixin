$ErrorActionPreference = 'SilentlyContinue'

function Format-Bytes($bytes) {
    if (-not $bytes -or $bytes -le 0) { return "0 GB" }
    if ($bytes -ge 1GB) { return ('{0:N2} GB' -f ($bytes / 1GB)) }
    if ($bytes -ge 1MB) { return ('{0:N1} MB' -f ($bytes / 1MB)) }
    return ('{0:N0} KB' -f ($bytes / 1KB))
}

function Get-FolderSize($path) {
    if (-not (Test-Path -LiteralPath $path)) { return [int64]0 }
    $sum = (Get-ChildItem -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue |
            Measure-Object -Property Length -Sum).Sum
    if (-not $sum) { return [int64]0 }
    return [int64]$sum
}

function Show-Path($label, $path) {
    if (Test-Path -LiteralPath $path) {
        $bytes = Get-FolderSize $path
        $formatted = Format-Bytes $bytes
        Write-Host ("  {0,12}    {1,-32} {2}" -f $formatted, $label, $path)
        return $bytes
    }
    return [int64]0
}

Write-Host ""
Write-Host "=== JAVA / GRADLE / ANDROID (build caches) ==="
$total = [int64]0
$total += Show-Path "gradle (cache)"           "$env:USERPROFILE\.gradle"
$total += Show-Path "android sdk"              "$env:LOCALAPPDATA\Android\Sdk"
$total += Show-Path "android build cache"      "$env:USERPROFILE\.android\build-cache"
$total += Show-Path ".android"                  "$env:USERPROFILE\.android"
$total += Show-Path "android avd"              "$env:USERPROFILE\.android\avd"
$total += Show-Path "android-studio (LOCAL)"   "$env:LOCALAPPDATA\Google\AndroidStudio"
$total += Show-Path "android-studio (Roaming)" "$env:APPDATA\Google\AndroidStudio"
$total += Show-Path "kotlin (.konan)"          "$env:USERPROFILE\.konan"
$total += Show-Path "maven (.m2)"              "$env:USERPROFILE\.m2"
$total += Show-Path "ivy"                      "$env:USERPROFILE\.ivy2"
$total += Show-Path "JetBrains caches"         "$env:LOCALAPPDATA\JetBrains"
Write-Host ("  ----------------------------------------")
Write-Host ("  Java/Gradle/Android total: {0}" -f (Format-Bytes $total))

Write-Host ""
Write-Host "=== Node / Python / Rust / Go ==="
$null = Show-Path "npm-cache"                   "$env:APPDATA\npm-cache"
$null = Show-Path "pnpm store"                  "$env:LOCALAPPDATA\pnpm"
$null = Show-Path "yarn berry"                  "$env:LOCALAPPDATA\Yarn\Berry"
$null = Show-Path "node-gyp"                    "$env:LOCALAPPDATA\node-gyp"
$null = Show-Path "Electron cache"              "$env:LOCALAPPDATA\electron\Cache"
$null = Show-Path "Cypress cache"               "$env:LOCALAPPDATA\Cypress\Cache"
$null = Show-Path "Puppeteer cache"             "$env:USERPROFILE\.cache\puppeteer"
$null = Show-Path "uv cache (python)"           "$env:LOCALAPPDATA\uv\cache"
$null = Show-Path "poetry cache"                "$env:APPDATA\pypoetry\Cache"
$null = Show-Path "Cargo (.cargo)"              "$env:USERPROFILE\.cargo"
$null = Show-Path "rustup"                      "$env:USERPROFILE\.rustup"
$null = Show-Path "Go path"                     "$env:USERPROFILE\go"

Write-Host ""
Write-Host "=== Editors / IDE ==="
$null = Show-Path "VS Code"                     "$env:APPDATA\Code"
$null = Show-Path "VS Code workspaceStorage"    "$env:APPDATA\Code\User\workspaceStorage"
$null = Show-Path "VS Code logs"                "$env:APPDATA\Code\logs"
$null = Show-Path "VS Code extensions"          "$env:USERPROFILE\.vscode\extensions"
$null = Show-Path "Cursor"                      "$env:APPDATA\Cursor"
$null = Show-Path "Kiro"                        "$env:APPDATA\Kiro"
$null = Show-Path "Windsurf"                    "$env:APPDATA\Windsurf"

Write-Host ""
Write-Host "=== System / Other ==="
$null = Show-Path "Windows.old"                 "C:\Windows.old"
$null = Show-Path "Recycle bin (current user)"  "C:\$Recycle.Bin"
$null = Show-Path "Edge cache"                  "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache"
$null = Show-Path "Chrome cache"                "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache"
$null = Show-Path "Microsoft Teams"             "$env:APPDATA\Microsoft\Teams"
$null = Show-Path "Spotify"                     "$env:APPDATA\Spotify"
$null = Show-Path "Discord cache"               "$env:APPDATA\discord\Cache"
$null = Show-Path "Telegram cache"              "$env:APPDATA\Telegram Desktop\tdata\user_data"

Write-Host ""
Write-Host "=== TOP-10 directories in %USERPROFILE% ==="
$results = @()
Get-ChildItem -LiteralPath $env:USERPROFILE -Force -Directory -ErrorAction SilentlyContinue |
    ForEach-Object {
        $b = Get-FolderSize $_.FullName
        $results += [PSCustomObject]@{ Size = $b; Path = $_.FullName }
    }
$results | Sort-Object Size -Descending | Select-Object -First 10 |
    ForEach-Object { Write-Host ("  {0,12}    {1}" -f (Format-Bytes $_.Size), $_.Path) }

Write-Host ""
Write-Host "=== TOP-10 directories in %LOCALAPPDATA% ==="
$results2 = @()
Get-ChildItem -LiteralPath $env:LOCALAPPDATA -Force -Directory -ErrorAction SilentlyContinue |
    ForEach-Object {
        $b = Get-FolderSize $_.FullName
        $results2 += [PSCustomObject]@{ Size = $b; Path = $_.FullName }
    }
$results2 | Sort-Object Size -Descending | Select-Object -First 10 |
    ForEach-Object { Write-Host ("  {0,12}    {1}" -f (Format-Bytes $_.Size), $_.Path) }
