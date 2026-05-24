$res = Invoke-WebRequest -Uri 'http://localhost:6333/collections/textbooks' -UseBasicParsing
Write-Host $res.Content
