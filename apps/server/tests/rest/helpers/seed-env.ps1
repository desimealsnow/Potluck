# Default REST test environment variables
# Dot-source this file before running cases to avoid manual input

$env:API_BASE = $env:API_BASE -as [string]
if (-not $env:API_BASE) { $env:API_BASE = 'http://localhost:3000/api/v1' }

if (-not $env:HOST_EMAIL) { $env:HOST_EMAIL = 'host@test.dev' }
if (-not $env:HOST_PASSWORD) { $env:HOST_PASSWORD = 'password123' }
if (-not $env:NEARBY_EMAIL) { $env:NEARBY_EMAIL = 'participant@test.dev' }
if (-not $env:NEARBY_PASSWORD) { $env:NEARBY_PASSWORD = 'password123' }
