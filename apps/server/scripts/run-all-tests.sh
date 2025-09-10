#!/bin/bash

# Comprehensive Test Runner for Potluck API
# Runs all test suites with proper environment setup and reporting

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Potluck API - Comprehensive Test Suite${NC}"
echo -e "========================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must run from server directory (apps/server)${NC}"
    exit 1
fi

# Environment setup
export NODE_ENV=test
echo -e "${YELLOW}📋 Setting up test environment...${NC}"

# Check for required environment variables
if [ -z "$TEST_SUPABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  TEST_SUPABASE_URL not set, using default from .env${NC}"
fi

# Create test results directory
mkdir -p test-results
mkdir -p coverage

echo -e "${BLUE}🔧 Installing dependencies...${NC}"
npm ci --silent

echo -e "${BLUE}🏗️  Building TypeScript...${NC}"
npm run build

# Function to run test suite with error handling
run_test_suite() {
    local name=$1
    local command=$2
    
    echo -e "${BLUE}🧪 Running $name...${NC}"
    echo "----------------------------------------"
    
    if eval $command; then
        echo -e "${GREEN}✅ $name passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $name failed${NC}"
        return 1
    fi
}

# Track test results
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=()

# 1. Linting and Type Checking
echo -e "${BLUE}🔍 Code Quality Checks${NC}"
TOTAL_SUITES=$((TOTAL_SUITES + 2))

if run_test_suite "ESLint" "npm run lint"; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_SUITES+=("ESLint")
fi

if run_test_suite "TypeScript Check" "npm run typecheck"; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_SUITES+=("TypeScript")
fi

# 2. Unit Tests
echo -e "\n${BLUE}🏠 Unit Tests${NC}"
TOTAL_SUITES=$((TOTAL_SUITES + 1))

if run_test_suite "Unit Tests" "npm run test:unit"; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_SUITES+=("Unit Tests")
fi

# 3. Integration Tests
echo -e "\n${BLUE}🔗 Integration Tests${NC}"
TOTAL_SUITES=$((TOTAL_SUITES + 1))

# Check if test database is available
if ! nc -z localhost 54322 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Supabase not detected on localhost:54322${NC}"
    echo -e "${YELLOW}   Start with: supabase start${NC}"
    echo -e "${RED}❌ Skipping integration tests${NC}"
    FAILED_SUITES+=("Integration Tests - DB Not Available")
else
    if run_test_suite "Integration Tests" "npm run test:integration"; then
        PASSED_SUITES=$((PASSED_SUITES + 1))
    else
        FAILED_SUITES+=("Integration Tests")
    fi
fi

# 4. RLS Tests (pgTap)
echo -e "\n${BLUE}🔒 Row-Level Security Tests${NC}"
TOTAL_SUITES=$((TOTAL_SUITES + 1))

if command -v pg_prove >/dev/null 2>&1; then
    if nc -z localhost 54322 2>/dev/null; then
        if run_test_suite "RLS Tests" "pg_prove tests/pg/*.sql --host localhost --port 54322 --username postgres --dbname postgres"; then
            PASSED_SUITES=$((PASSED_SUITES + 1))
        else
            FAILED_SUITES+=("RLS Tests")
        fi
    else
        echo -e "${YELLOW}⚠️  Database not available for RLS tests${NC}"
        FAILED_SUITES+=("RLS Tests - DB Not Available")
    fi
else
    echo -e "${YELLOW}⚠️  pg_prove not installed, skipping RLS tests${NC}"
    echo -e "${YELLOW}   Install with: sudo apt-get install libtap-parser-sourcehandler-pgtap-perl${NC}"
    FAILED_SUITES+=("RLS Tests - Tool Not Available")
fi

# 5. Coverage Report
echo -e "\n${BLUE}📊 Coverage Report${NC}"
TOTAL_SUITES=$((TOTAL_SUITES + 1))

if run_test_suite "Coverage Analysis" "npm run test:coverage"; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_SUITES+=("Coverage Analysis")
fi

# Final Results
echo -e "\n${BLUE}📋 Test Summary${NC}"
echo "========================================"
echo -e "Total Test Suites: $TOTAL_SUITES"
echo -e "${GREEN}Passed: $PASSED_SUITES${NC}"

if [ ${#FAILED_SUITES[@]} -eq 0 ]; then
    echo -e "${GREEN}Failed: 0${NC}"
    echo -e "\n${GREEN}🎉 All tests passed! 🎉${NC}"
    
    # Show coverage summary if available
    if [ -f "coverage/lcov-report/index.html" ]; then
        echo -e "\n${BLUE}📈 Coverage Report Generated:${NC}"
        echo -e "   file://$(pwd)/coverage/lcov-report/index.html"
    fi
    
    # Show test results if available
    if [ -f "test-results/test-report.html" ]; then
        echo -e "\n${BLUE}📄 Test Report Generated:${NC}"
        echo -e "   file://$(pwd)/test-results/test-report.html"
    fi
    
    exit 0
else
    echo -e "${RED}Failed: ${#FAILED_SUITES[@]}${NC}"
    echo -e "\n${RED}❌ Failed Test Suites:${NC}"
    for suite in "${FAILED_SUITES[@]}"; do
        echo -e "   - $suite"
    done
    
    echo -e "\n${YELLOW}💡 Troubleshooting Tips:${NC}"
    echo -e "   • Check test-results/ for detailed logs"
    echo -e "   • Ensure Supabase is running: supabase start"
    echo -e "   • Verify environment variables in .env.test"
    echo -e "   • Run individual suites: npm run test:unit, etc."
    
    exit 1
fi
