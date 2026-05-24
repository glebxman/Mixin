Write-Host "=== IMAGES ==="
docker images --format "table {{.Repository}}:{{.Tag}}`t{{.Size}}`t{{.CreatedSince}}"
Write-Host ""
Write-Host "=== CONTAINERS ==="
docker ps -a --format "table {{.Names}}`t{{.Image}}`t{{.Status}}"
Write-Host ""
Write-Host "=== VOLUMES ==="
docker volume ls
