$d = Get-PSDrive C
$free = [math]::Round($d.Free / 1GB, 2)
$used = [math]::Round($d.Used / 1GB, 2)
$total = [math]::Round(($d.Free + $d.Used) / 1GB, 2)
Write-Host ("Drive C: free={0} GB / total={1} GB (used={2} GB)" -f $free, $total, $used)
