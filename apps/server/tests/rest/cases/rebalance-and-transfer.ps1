#requires -Version 5
param(
  [string]$ApiBase = $env:API_BASE
)

. "$PSScriptRoot/../helpers/seed-env.ps1"

if (-not $ApiBase) { $ApiBase = $env:API_BASE }
if (-not $ApiBase) { Write-Error "Set API_BASE"; exit 1 }

$cfg = Join-Path (Split-Path $PSScriptRoot -Parent) 'config.env'
if (Test-Path $cfg) {
  Get-Content $cfg | ForEach-Object {
    if ($_ -match '^(\w+)=(.*)$') { $name=$Matches[1]; $val=$Matches[2]; [Environment]::SetEnvironmentVariable($name,$val,'Process') }
  }
}

$hostEmail = $env:HOST_EMAIL; $hostPass = $env:HOST_PASSWORD
$aEmail = $env:ALICE_EMAIL; $aPass = $env:ALICE_PASSWORD
$bEmail = $env:BOB_EMAIL; $bPass = $env:BOB_PASSWORD

$tokenScript = Join-Path (Split-Path $PSScriptRoot -Parent) 'helpers/token.ps1'
$hostToken = & $tokenScript -Email $hostEmail -Password $hostPass
$aToken = & $tokenScript -Email $aEmail -Password $aPass
$bToken = & $tokenScript -Email $bEmail -Password $bPass

# Create event with 3 item slots
$eventBody = @{
  title='Rebalance/Transfer Potluck'
  description='Testing rebalance and transfer flows'
  event_date=(Get-Date).ToUniversalTime().AddDays(5).ToString('s') + 'Z'
  min_guests=2
  capacity_total=10
  meal_type='mixed'
  items=@(
    @{ name='Dessert'; category='dessert'; per_guest_qty=1 },
    @{ name='Drinks'; category='beverage'; per_guest_qty=1 },
    @{ name='Salad'; category='side'; per_guest_qty=1 }
  )
  location=@{ name='Test Venue'; formatted_address='123 Test St, City' }
  is_public=$true
} | ConvertTo-Json -Depth 6
$create = Invoke-RestMethod -Method Post -Uri "$ApiBase/events" -Headers @{ Authorization="Bearer $hostToken" } -ContentType 'application/json' -Body $eventBody
$eventId = $create.event.id
Write-Host "Created event: $eventId"

Invoke-RestMethod -Method Post -Uri "$ApiBase/events/$eventId/publish" -Headers @{ Authorization="Bearer $hostToken" } | Out-Null

# Invite Alice & Bob, have them accept
Invoke-RestMethod -Method Post -Uri "$ApiBase/events/$eventId/participants" -Headers @{ Authorization="Bearer $hostToken" } -ContentType 'application/json' -Body (@{ user_id=$env:ALICE_ID } | ConvertTo-Json) | Out-Null
Invoke-RestMethod -Method Post -Uri "$ApiBase/events/$eventId/participants" -Headers @{ Authorization="Bearer $hostToken" } -ContentType 'application/json' -Body (@{ user_id=$env:BOB_ID } | ConvertTo-Json) | Out-Null

$parts = Invoke-RestMethod -Method Get -Uri "$ApiBase/events/$eventId/participants" -Headers @{ Authorization="Bearer $hostToken" }
$alicePart = $parts | Where-Object { $_.user_id -eq $env:ALICE_ID }
$bobPart = $parts | Where-Object { $_.user_id -eq $env:BOB_ID }

Invoke-RestMethod -Method Put -Uri "$ApiBase/events/$eventId/participants/$($alicePart.id)" -Headers @{ Authorization="Bearer $aToken" } -ContentType 'application/json' -Body (@{ status='accepted' } | ConvertTo-Json) | Out-Null
Invoke-RestMethod -Method Put -Uri "$ApiBase/events/$eventId/participants/$($bobPart.id)" -Headers @{ Authorization="Bearer $bToken" } -ContentType 'application/json' -Body (@{ status='accepted' } | ConvertTo-Json) | Out-Null

# List items and have Alice self-assign one
$items = Invoke-RestMethod -Method Get -Uri "$ApiBase/events/$eventId/items" -Headers @{ Authorization="Bearer $aToken" }
$firstItem = $items[0]
Invoke-RestMethod -Method Post -Uri "$ApiBase/events/$eventId/items/$($firstItem.id)/assign" -Headers @{ Authorization="Bearer $aToken" } -ContentType 'application/json' -Body '{}' | Out-Null

# Rebalance remaining unassigned items (max 2 per user)
$rebalance = Invoke-RestMethod -Method Post -Uri "$ApiBase/events/$eventId/rebalance" -Headers @{ Authorization="Bearer $hostToken" } -ContentType 'application/json' -Body (@{ max_per_user=2 } | ConvertTo-Json)
Write-Host "Rebalance assigned: $($rebalance.assigned)"

# Verify items now mostly assigned
$after = Invoke-RestMethod -Method Get -Uri "$ApiBase/events/$eventId/items" -Headers @{ Authorization="Bearer $hostToken" }
if (-not ($after | Where-Object { $_.assigned_to })) { Write-Warning 'No items assigned after rebalance' }

# Transfer Alice to Carol (carry items=false)
if (-not $env:CAROL_ID) { Write-Host 'Skipping transfer: CAROL_ID not set.'; exit 0 }
$transfer = Invoke-RestMethod -Method Post -Uri "$ApiBase/events/$eventId/participants/$($alicePart.id)/transfer" -Headers @{ Authorization="Bearer $hostToken" } -ContentType 'application/json' -Body (@{ new_user_id=$env:CAROL_ID; carry_items=$false } | ConvertTo-Json)
Write-Host "Transfer done: old=$($transfer.old_participant_id) new=$($transfer.new_participant_id)"

# Ensure Alice items are unassigned after transfer when carry_items=false
$afterTransfer = Invoke-RestMethod -Method Get -Uri "$ApiBase/events/$eventId/items" -Headers @{ Authorization="Bearer $hostToken" }
if ($afterTransfer | Where-Object { $_.assigned_to -eq $env:ALICE_ID }) { Write-Warning 'Items still assigned to Alice after transfer' }

