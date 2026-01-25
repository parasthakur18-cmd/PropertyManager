#!/bin/bash
# Script to verify and fix database issues

echo "=== Checking Database Tables and Columns ==="

# Check if gst_on_rooms column exists
echo ""
echo "1. Checking gst_on_rooms column in bills table..."
psql -h localhost -U myappuser -d myappdb -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'bills' AND column_name = 'gst_on_rooms';" 2>&1 | grep -q "gst_on_rooms" && echo "✅ gst_on_rooms column exists" || echo "❌ gst_on_rooms column MISSING"

# Check if tasks table exists
echo ""
echo "2. Checking tasks table..."
psql -h localhost -U myappuser -d myappdb -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks';" 2>&1 | grep -q "tasks" && echo "✅ tasks table exists" || echo "❌ tasks table MISSING"

# Check if daily_closings table exists
echo ""
echo "3. Checking daily_closings table..."
psql -h localhost -U myappuser -d myappdb -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_closings';" 2>&1 | grep -q "daily_closings" && echo "✅ daily_closings table exists" || echo "❌ daily_closings table MISSING"

echo ""
echo "=== If any are missing, run: psql -h localhost -U myappuser -d myappdb -f fix-missing-tables-columns.sql ==="
