# REST Tests

Quick REST tests that authenticate to get a bearer token and hit endpoints.

Setup:
1) Copy config.env.example to config.env and set API_BASE (e.g., http://localhost:3000/api/v1)
2) Ensure test users exist (host@test.dev, participant@test.dev)

PowerShell:
- $env:API_BASE='http://localhost:3000/api/v1'
- ./tests/rest/cases/location-nearby.ps1

bash:
- export API_BASE='http://localhost:3000/api/v1'
- bash tests/rest/cases/location-nearby.sh
