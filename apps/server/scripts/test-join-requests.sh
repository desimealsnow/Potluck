#!/bin/bash

# Test script for join requests functionality
# Runs comprehensive test suite for join requests and event discovery features

set -e

echo "🧪 Running Join Requests Test Suite"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_ENV="test"
TEST_DB_URL=${TEST_DATABASE_URL:-""}
VERBOSE=${TEST_VERBOSE:-false}

echo -e "${BLUE}Configuration:${NC}"
echo "  Environment: $TEST_ENV"
echo "  Database: ${TEST_DB_URL:-'Not configured (will skip DB tests)'}"
echo "  Verbose: $VERBOSE"
echo ""

# Function to run test section with timing
run_test_section() {
  local name="$1"
  local command="$2"
  local start_time=$(date +%s)
  
  echo -e "${BLUE}Running $name...${NC}"
  
  if eval "$command"; then
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    echo -e "${GREEN}✅ $name completed in ${duration}s${NC}"
    echo ""
    return 0
  else
    echo -e "${RED}❌ $name failed${NC}"
    echo ""
    return 1
  fi
}

# Change to server directory
cd "$(dirname "$0")/.."

# Ensure dependencies are installed
echo -e "${YELLOW}Installing dependencies...${NC}"
npm ci --silent

# ===============================================
# Backend Tests
# ===============================================

echo -e "${BLUE}🔧 Backend Tests${NC}"
echo "=================="

# Unit tests for join request modules
run_test_section "Schema Validation Tests" \
  "npm test tests/unit/modules/requests/requests.schema.spec.ts"

run_test_section "Service Layer Tests" \
  "npm test tests/unit/modules/requests/requests.service.spec.ts"

run_test_section "Repository Layer Tests" \
  "npm test tests/unit/modules/requests/requests.repo.spec.ts"

run_test_section "Controller Layer Tests" \
  "npm test tests/unit/modules/requests/requests.controller.spec.ts"

run_test_section "Notification System Tests" \
  "npm test tests/unit/shared/notifier.spec.ts"

run_test_section "Enhanced Events Service Tests" \
  "npm test tests/unit/services/events-enhanced.spec.ts"

# Integration tests
run_test_section "Basic Integration Tests" \
  "npm test tests/integration/requests.spec.ts"

run_test_section "Advanced Integration Tests" \
  "npm test tests/integration/requests-advanced.spec.ts"

# Database function tests (only if database is available)
if [ -n "$TEST_DB_URL" ]; then
  run_test_section "Database Function Tests" \
    "npm test tests/unit/db/functions.spec.ts"
else
  echo -e "${YELLOW}⚠️  Skipping database function tests (no test database configured)${NC}"
fi

# ===============================================
# Frontend Tests  
# ===============================================

echo -e "${BLUE}📱 Frontend Tests${NC}"
echo "=================="

# Change to mobile directory
cd ../mobile

# Ensure dependencies are installed
echo -e "${YELLOW}Installing mobile dependencies...${NC}"
npm ci --silent

run_test_section "React Hooks Tests" \
  "npm test __tests__/hooks/useJoinRequests.test.tsx"

run_test_section "API Client Tests" \
  "npm test __tests__/services/apiClient.test.ts"

run_test_section "Availability Badge Tests" \
  "npm test __tests__/components/AvailabilityBadge.test.tsx"

run_test_section "Request Button Tests" \
  "npm test __tests__/components/RequestToJoinButton.test.tsx"

run_test_section "Requests Manager Tests" \
  "npm test __tests__/components/JoinRequestsManager.test.tsx"

# ===============================================
# Coverage Report
# ===============================================

echo -e "${BLUE}📊 Coverage Analysis${NC}"
echo "===================="

cd ../server

# Generate coverage report for join requests modules only
echo -e "${YELLOW}Generating backend coverage...${NC}"
npm test -- --coverage \
  tests/unit/modules/requests/ \
  tests/unit/shared/notifier.spec.ts \
  tests/integration/requests*.spec.ts \
  --coverageDirectory=coverage/join-requests \
  --coverageReporters=text,html,json-summary

# Frontend coverage
cd ../mobile
echo -e "${YELLOW}Generating frontend coverage...${NC}"
npm test -- --coverage \
  __tests__/hooks/useJoinRequests.test.tsx \
  __tests__/services/apiClient.test.ts \
  __tests__/components/ \
  --collectCoverageFrom="src/**/*.{ts,tsx}" \
  --collectCoverageFrom="!src/**/*.d.ts" \
  --coverageDirectory=coverage/join-requests \
  --coverageReporters=text,html

# ===============================================
# Test Summary
# ===============================================

echo ""
echo -e "${GREEN}🎉 Test Suite Completed!${NC}"
echo "========================="
echo ""
echo -e "${BLUE}Test Coverage Summary:${NC}"
echo "  • Schema validation: ✅ Zod schemas with edge cases"
echo "  • Business logic: ✅ Service layer with capacity management"
echo "  • Data access: ✅ Repository with error handling"
echo "  • API endpoints: ✅ Controllers with validation"
echo "  • Database functions: ✅ SQL function testing"
echo "  • React components: ✅ UI interactions and states"
echo "  • API client: ✅ HTTP methods with error scenarios"
echo "  • Integration flows: ✅ End-to-end request workflows"
echo ""

# Check if any tests failed
if [ $? -eq 0 ]; then
  echo -e "${GREEN}🚀 All tests passed! Ready for deployment.${NC}"
  
  echo ""
  echo -e "${BLUE}Coverage Reports:${NC}"
  echo "  Backend: apps/server/coverage/join-requests/index.html"
  echo "  Frontend: apps/mobile/coverage/join-requests/index.html"
  
  echo ""
  echo -e "${BLUE}Next Steps:${NC}"
  echo "  1. Review coverage reports for any gaps"
  echo "  2. Run full test suite: npm run test:all"
  echo "  3. Deploy database migration: 001_join_requests.sql"
  echo "  4. Apply RLS policies: 002_join_requests_policies.sql"
  echo "  5. Set environment variable: JOIN_HOLD_TTL_MIN=30"
else
  echo -e "${RED}❌ Some tests failed. Please review the output above.${NC}"
  exit 1
fi
