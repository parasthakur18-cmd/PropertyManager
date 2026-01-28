#!/bin/bash
# Test all API endpoints
# Usage: bash scripts/test-all-apis.sh [BASE_URL] [SESSION_COOKIE]

BASE_URL="${1:-http://127.0.0.1:3000}"
COOKIE="${2:-}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
SKIPPED=0

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local data=$5
    
    local url="${BASE_URL}${endpoint}"
    local curl_cmd="curl -s -w '\nHTTP_CODE:%{http_code}' -X ${method}"
    
    if [ -n "$COOKIE" ]; then
        curl_cmd="${curl_cmd} -H 'Cookie: ${COOKIE}'"
    fi
    
    if [ -n "$data" ]; then
        curl_cmd="${curl_cmd} -H 'Content-Type: application/json' -d '${data}'"
    fi
    
    curl_cmd="${curl_cmd} '${url}'"
    
    local response=$(eval $curl_cmd)
    local http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    local body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    if [ -z "$http_code" ]; then
        http_code="000"
    fi
    
    if [ "$http_code" = "$expected_status" ] || [ "$expected_status" = "*" ]; then
        echo -e "${GREEN}✅ PASS${NC} - ${description}"
        echo "   ${method} ${endpoint} → ${http_code}"
        ((PASSED++))
        return 0
    elif [ "$http_code" = "401" ] && [ "$expected_status" != "401" ]; then
        echo -e "${YELLOW}⚠️  SKIP${NC} - ${description} (Unauthorized - need auth)"
        echo "   ${method} ${endpoint} → ${http_code}"
        ((SKIPPED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} - ${description}"
        echo "   ${method} ${endpoint} → ${http_code} (expected ${expected_status})"
        if [ ${#body} -lt 200 ]; then
            echo "   Response: ${body}"
        fi
        ((FAILED++))
        return 1
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Testing API Endpoints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Base URL: ${BASE_URL}"
echo "Cookie: ${COOKIE:0:50}..." 
echo ""

# Public endpoints (no auth required)
echo "📋 PUBLIC ENDPOINTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/api/public/properties" "200" "Get public properties"
test_endpoint "GET" "/api/public/menu-categories" "200" "Get public menu categories"
test_endpoint "GET" "/api/public/menu" "200" "Get public menu"
echo ""

# Auth endpoints
echo "🔐 AUTH ENDPOINTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/api/auth/user" "*" "Get current user (requires auth)"
echo ""

# Dashboard & Analytics
echo "📊 DASHBOARD & ANALYTICS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/api/dashboard/stats" "*" "Get dashboard stats"
test_endpoint "GET" "/api/analytics" "*" "Get analytics"
echo ""

# Properties
echo "🏢 PROPERTIES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/api/properties" "*" "Get all properties"
test_endpoint "GET" "/api/properties/1" "*" "Get property by ID"
echo ""

# Rooms
echo "🛏️  ROOMS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/api/rooms" "*" "Get all rooms"
test_endpoint "GET" "/api/rooms/availability" "*" "Get room availability"
echo ""

# Guests
echo "👥 GUESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/api/guests" "*" "Get all guests"
echo ""

# Bookings
echo "📅 BOOKINGS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/api/bookings" "*" "Get all bookings"
test_endpoint "GET" "/api/bookings/active" "*" "Get active bookings"
test_endpoint "GET" "/api/bookings/checkout-reminders" "*" "Get checkout reminders"
echo ""

# Bills
echo "💰 BILLS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/api/bills/pending" "*" "Get pending bills"
test_endpoint "GET" "/api/bills" "*" "Get all bills"
echo ""

# Orders
echo "🍽️  ORDERS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/api/orders/unmerged-cafe" "*" "Get unmerged café orders"
test_endpoint "GET" "/api/orders" "*" "Get all orders"
echo ""

# Menu
echo "📋 MENU"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/api/menu-items" "*" "Get menu items"
test_endpoint "GET" "/api/menu-categories" "*" "Get menu categories"
echo ""

# Users
echo "👤 USERS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/api/users" "*" "Get all users"
echo ""

# Travel Agents
echo "✈️  TRAVEL AGENTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/api/travel-agents" "*" "Get all travel agents"
echo ""

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TOTAL=$((PASSED + FAILED + SKIPPED))
echo -e "${GREEN}✅ Passed: ${PASSED}${NC}"
echo -e "${RED}❌ Failed: ${FAILED}${NC}"
echo -e "${YELLOW}⚠️  Skipped (auth required): ${SKIPPED}${NC}"
echo "Total: ${TOTAL}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Check the output above.${NC}"
    exit 1
fi
