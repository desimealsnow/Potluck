#requires -Version 5
param(
  [string]$ApiBase = $env:API_BASE
)

. "$PSScriptRoot/../helpers/seed-env.ps1"
# Do NOT dot-source token.ps1; invoke it with parameters below

if (-not $ApiBase) { $ApiBase = $env:API_BASE }
if (-not $ApiBase) { Write-Error "Set API_BASE"; exit 1 }

# Load defaults from config.env if present (optional)
$cfg = Join-Path (Split-Path $PSScriptRoot -Parent) 'config.env'
if (Test-Path $cfg) {
  Get-Content $cfg | ForEach-Object {
    if ($_ -match '^(\w+)=(.*)$') { $name=$Matches[1]; $val=$Matches[2]; [Environment]::SetEnvironmentVariable($name,$val,'Process') }
  }
}

$hostEmail = $env:HOST_EMAIL; $hostPass = $env:HOST_PASSWORD
$nearEmail = $env:NEARBY_EMAIL; $nearPass = $env:NEARBY_PASSWORD

$tokenScript = Join-Path (Split-Path $PSScriptRoot -Parent) 'helpers/token.ps1'
$hostToken = & $tokenScript -Email $hostEmail -Password $hostPass
$nearToken = & $tokenScript -Email $nearEmail -Password $nearPass

if ($hostToken) { Write-Host "Host token acquired." } else { Write-Warning "Host token missing." }
if ($nearToken) { Write-Host "Nearby token acquired." } else { Write-Warning "Nearby token missing." }

# Set nearby user location
$locBody = @{ latitude=37.7849; longitude=-122.4094; city='San Francisco'; geo_precision='exact' } | ConvertTo-Json
Invoke-RestMethod -Method Patch -Uri "$ApiBase/user-location/me/location" -Headers @{ Authorization="Bearer $nearToken" } -ContentType 'application/json' -Body $locBody | Out-Null
$discBody = @{ discoverability_enabled=$true; discoverability_radius_km=25; geo_precision='exact' } | ConvertTo-Json
Invoke-RestMethod -Method Patch -Uri "$ApiBase/user-location/me/discoverability" -Headers @{ Authorization="Bearer $nearToken" } -ContentType 'application/json' -Body $discBody | Out-Null

# Create public event by host
$eventBody = @{
  title='Community Potluck in SF'
  description='A great community gathering'
  event_date=(Get-Date).ToUniversalTime().AddDays(7).ToString('s') + 'Z'
  min_guests=5
  capacity_total=20
  meal_type='mixed'
  items=@(@{ name='Main Course'; category='main'; per_guest_qty=1 })
  location=@{ name='Test Venue'; formatted_address='123 Test St, San Francisco, CA' }
  latitude=37.7799
  longitude=-122.4149
  city='San Francisco'
  is_public=$true
  visibility_radius_km=25
} | ConvertTo-Json -Depth 6
$create = Invoke-RestMethod -Method Post -Uri "$ApiBase/events" -Headers @{ Authorization="Bearer $hostToken" } -ContentType 'application/json' -Body $eventBody
$eventId = $create.event.id
Write-Host "Created event: $eventId"

# Publish it
Invoke-RestMethod -Method Post -Uri "$ApiBase/events/$eventId/publish" -Headers @{ Authorization="Bearer $hostToken" } | Out-Null
Write-Host "Published event: $eventId"

# Nearby search
$search = Invoke-RestMethod -Method Get -Uri "$ApiBase/events?lat=37.7849&lon=-122.4094&radius_km=25&is_public=true" -Headers @{ Authorization="Bearer $nearToken" }
$found = $false
if ($search.items) { $found = $search.items | Where-Object { $_.id -eq $eventId } }
if (-not $found) { Write-Warning "Event not returned in nearby search" } else { Write-Host "Event found in nearby search." }

# Notifications
$notifs = Invoke-RestMethod -Method Get -Uri "$ApiBase/discovery/notifications" -Headers @{ Authorization="Bearer $nearToken" }
if ($notifs.notifications) {
  $n = $notifs.notifications | Where-Object { $_.event_id -eq $eventId }
  if ($n) { Write-Host "Notification present for event." } else { Write-Warning "No notification found for event." }
} else {
  Write-Warning "No notifications returned."
}
