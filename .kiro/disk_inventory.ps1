function Show-Size($label, $path) {
    if (Test-Path $path) {
        try {
            $bytes = (Get-ChildItem -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue |
                Measure-Object -Property Length -Sum).Sum
            $gb = if ($bytes) { [math]::Round($bytes / 1GB, 2) } else { 0 }
            Write-Host ("{0,-60} {1,8} GB    {2}" -f $label, $gb, $path)
        } catch {
            Write-Host ("{0,-60} ?            {1}" -f $label, $path)
        }
    } else {
        Write-Host ("{0,-60} -            (not found) {1}" -f $label, $path)
    }
}

Write-Host "=== Docker WSL VHDX (главный подозреваемый) ==="
$dockerWslPaths = @(
    "$env:LOCALAPPDATA\Docker\wsl\disk\docker_data.vhdx",
    "$env:LOCALAPPDATA\Docker\wsl\data\ext4.vhdx",
    "$env:LOCALAPPDATA\Docker\wsl\main\ext4.vhdx",
    "$env:LOCALAPPDATA\Docker\wsl\disk\Virtual Hard Disk.vhdx"
)
foreach ($p in $dockerWslPaths) {
    if (Test-Path $p) {
        $size = (Get-Item -LiteralPath $p).Length / 1GB
        Write-Host ("  {0,8:N2} GB    {1}" -f $size, $p)
    }
}

Write-Host ""
Write-Host "=== Кэши пакетных менеджеров ==="
Show-Size "HuggingFace cache"     "$env:USERPROFILE\.cache\huggingface"
Show-Size "HuggingFace hub"       "$env:USERPROFILE\.cache\huggingface\hub"
Show-Size "Pip cache"             "$env:LOCALAPPDATA\pip\Cache"
Show-Size "npm cache"             "$env:APPDATA\npm-cache"
Show-Size "pnpm store"            "$env:LOCALAPPDATA\pnpm\store"
Show-Size "Yarn cache"            "$env:LOCALAPPDATA\Yarn\Cache"
Show-Size "Cargo cache"           "$env:USERPROFILE\.cargo"
Show-Size "Go modules"            "$env:USERPROFILE\go\pkg"
Show-Size "Gradle"                "$env:USERPROFILE\.gradle"
Show-Size "Maven"                 "$env:USERPROFILE\.m2"
Show-Size "VS Code Insiders ext." "$env:USERPROFILE\.vscode-insiders\extensions"
Show-Size "VS Code extensions"    "$env:USERPROFILE\.vscode\extensions"

Write-Host ""
Write-Host "=== Windows-системное (топ виновники по нашему опыту) ==="
Show-Size "Windows Temp"          "$env:TEMP"
Show-Size "Windows update cache"  "C:\Windows\SoftwareDistribution\Download"
Show-Size "WinSxS"                "C:\Windows\WinSxS"
