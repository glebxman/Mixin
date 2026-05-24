$candidates = @(
    'docker_clickhouse_data',
    'docker_postgres_data',
    'docker_qdrant_data',
    'infra_clickhouse_data',
    'infra_postgres_data',
    'infra_qdrant_data',
    'infra_redis_data',
    'mixin-edtech_postgres_data',
    '4080917bde30b1759c735ec848a290000ce3526e86b28277a482ba81cccc8319',
    'b0adb916883dffeb94683ff0ba26565d949c0fe325c4f60edd56e18e50b88b68'
)

Write-Host "=== Used by which containers (should be EMPTY for safe delete) ==="
foreach ($v in $candidates) {
    $users = docker ps -a --filter "volume=$v" --format "{{.Names}}"
    if ($users) {
        Write-Host "  USED: $v -> $users" -ForegroundColor Yellow
    } else {
        Write-Host "  free: $v" -ForegroundColor Green
    }
}
