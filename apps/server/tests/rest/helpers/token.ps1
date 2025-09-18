param(
  [Parameter(Mandatory=$true)][string]$Email,
  [Parameter(Mandatory=$true)][string]$Password
)

if (-not $env:API_BASE) { Write-Error "API_BASE not set"; exit 1 }

$body = @{ email=$Email; password=$Password } | ConvertTo-Json -Depth 3
$response = Invoke-RestMethod -Method Post -Uri "$($env:API_BASE)/auth/login" -ContentType 'application/json' -Body $body -ErrorAction Stop
$token = $response.session.access_token
if (-not $token) { Write-Error "No token returned"; exit 2 }
Write-Output $token
