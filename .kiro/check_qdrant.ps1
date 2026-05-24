$res = Invoke-WebRequest -Uri 'http://localhost:6333/collections' -UseBasicParsing
Write-Host "Status: $($res.StatusCode)"
Write-Host "Body: $($res.Content)"
