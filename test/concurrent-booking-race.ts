/**
 * Concurrent Booking Race Condition — Certification Test
 *
 * Scenario: inventory = 1 room (Superior King Room, property 7 — The Blue Mont Resort)
 * User A and User B fire booking requests simultaneously.
 * Expected: exactly 1 succeeds (HTTP 201), exactly 1 fails with 409 "no longer available".
 *
 * Run: npx tsx test/concurrent-booking-race.ts
 */

import pkg from "pg";
const { Pool } = pkg;
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load env
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
dotenv.config();

// ── Config ─────────────────────────────────────────────────────────────────────

const BASE_URL = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : "http://localhost:5000";

const PROPERTY_ID = 7;              // The Blue Mont Resort
const ROOM_TYPE   = "Superior King Room";  // exactly 1 physical room
const CHECK_IN    = "2099-11-01";   // far-future dates — no real bookings here
const CHECK_OUT   = "2099-11-02";

// ── Helpers ────────────────────────────────────────────────────────────────────

async function bookRoom(label: string): Promise<{ status: number; body: any }> {
  const res = await fetch(`${BASE_URL}/api/public/book/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      propertyId:     PROPERTY_ID,
      roomType:       ROOM_TYPE,
      checkIn:        CHECK_IN,
      checkOut:       CHECK_OUT,
      numberOfGuests: 1,
      guestName:      `Race Test ${label}`,
      guestPhone:     label === "A" ? "9000000001" : "9000000002",
      guestEmail:     `race-${label.toLowerCase()}@test.local`,
      specialRequests: `[RACE-TEST-${label}] concurrent booking certification`,
    }),
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function cleanup(db: Pool, tokens: (string | undefined)[]): Promise<void> {
  const ids = tokens.filter(Boolean) as string[];
  if (ids.length === 0) return;
  await db.query(
    `UPDATE bookings SET status = 'cancelled', cancellation_reason = 'race-condition-test-cleanup'
     WHERE website_booking_token = ANY($1)`,
    [ids],
  );
  console.log(`  [cleanup] Cancelled ${ids.length} test booking(s)`);
}

// ── ANSI helpers ───────────────────────────────────────────────────────────────

const GREEN  = (s: string) => `\x1b[32m${s}\x1b[0m`;
const RED    = (s: string) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s: string) => `\x1b[33m${s}\x1b[0m`;
const BOLD   = (s: string) => `\x1b[1m${s}\x1b[0m`;

// ── Main ───────────────────────────────────────────────────────────────────────

async function run() {
  console.log();
  console.log(BOLD("━━━  Direct Booking Engine — Race Condition Certification Test  ━━━"));
  console.log();
  console.log(`  Target server : ${BASE_URL}`);
  console.log(`  Property      : ${PROPERTY_ID} — The Blue Mont Resort`);
  console.log(`  Room type     : ${ROOM_TYPE} (inventory = 1)`);
  console.log(`  Test dates    : ${CHECK_IN} → ${CHECK_OUT}`);
  console.log();

  // ── DB for cleanup ───────────────────────────────────────────────────────────
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
  });

  let passed = true;
  const tokensToCleanup: (string | undefined)[] = [];

  // ── Pre-condition: no existing booking on those test dates ───────────────────
  const existing = await db.query(
    `SELECT id FROM bookings
     WHERE property_id = $1
       AND room_type_snapshot != 'ignored'
       AND check_in_date  = $2
       AND check_out_date = $3
       AND status IN ('pending','pending_payment','confirmed','checked-in')
     LIMIT 1`,
    [PROPERTY_ID, CHECK_IN, CHECK_OUT],
  ).catch(() => ({ rows: [] }));

  // Use a simpler overlap query if the above fails (room_type_snapshot may not exist)
  const existingSimple = await db.query(
    `SELECT b.id FROM bookings b
     JOIN rooms r ON r.id = b.room_id
     WHERE b.property_id = $1
       AND r.room_type = $2
       AND b.check_in_date  = $3
       AND b.check_out_date = $4
       AND b.status IN ('pending','pending_payment','confirmed','checked-in')
     LIMIT 1`,
    [PROPERTY_ID, ROOM_TYPE, CHECK_IN, CHECK_OUT],
  );

  if (existingSimple.rows.length > 0) {
    console.log(YELLOW("  ⚠  Pre-existing booking found on test dates. Cancelling it first…"));
    await db.query(
      `UPDATE bookings SET status='cancelled', cancellation_reason='pre-test cleanup'
       WHERE id = $1`,
      [existingSimple.rows[0].id],
    );
  }

  // ── TEST 1: Concurrent requests — exactly one should win ────────────────────
  console.log(BOLD("TEST 1 — User A and User B fire simultaneous booking requests"));
  console.log("  Launching both requests at the same instant…");
  console.log();

  const [resultA, resultB] = await Promise.all([
    bookRoom("A"),
    bookRoom("B"),
  ]);

  console.log(`  User A → HTTP ${resultA.status} | ${JSON.stringify(resultA.body).slice(0, 120)}`);
  console.log(`  User B → HTTP ${resultB.status} | ${JSON.stringify(resultB.body).slice(0, 120)}`);
  console.log();

  // Collect tokens for cleanup
  if (resultA.body?.token) tokensToCleanup.push(resultA.body.token);
  if (resultB.body?.token) tokensToCleanup.push(resultB.body.token);

  const successes = [resultA, resultB].filter(r => r.status === 201);
  const conflicts = [resultB, resultA].filter(r => r.status === 409);
  const unexpected = [resultA, resultB].filter(r => r.status !== 201 && r.status !== 409);

  const test1Pass =
    successes.length === 1 &&
    conflicts.length === 1 &&
    unexpected.length === 0 &&
    conflicts[0].body?.message?.toLowerCase().includes("no longer available") ||
    conflicts[0]?.body?.message?.toLowerCase().includes("available");

  if (test1Pass) {
    console.log(GREEN("  ✅  PASS — Exactly 1 booking confirmed, 1 returned 409"));
  } else if (unexpected.length > 0) {
    console.log(RED(`  ❌  FAIL — Unexpected HTTP status: ${unexpected.map(r => r.status).join(", ")}`));
    passed = false;
  } else if (successes.length === 2) {
    console.log(RED("  ❌  FAIL — BOTH requests succeeded (race condition not fixed)"));
    passed = false;
  } else if (conflicts.length === 2) {
    console.log(RED("  ❌  FAIL — BOTH requests failed (over-locking or setup issue)"));
    passed = false;
  } else {
    console.log(RED(`  ❌  FAIL — Unexpected result: ${successes.length} success, ${conflicts.length} 409`));
    passed = false;
  }

  // ── TEST 2: 409 message is guest-friendly ────────────────────────────────────
  console.log();
  console.log(BOLD("TEST 2 — 409 error message is production-safe (no stack trace)"));

  const failBody = conflicts[0]?.body;
  const hasOnlyMessage = failBody && typeof failBody.message === "string" && !failBody.stack && !failBody.detail;
  const isGuestFriendly = hasOnlyMessage && failBody.message.length < 200;

  if (isGuestFriendly) {
    console.log(GREEN(`  ✅  PASS — message: "${failBody.message}"`));
  } else {
    console.log(RED(`  ❌  FAIL — body: ${JSON.stringify(failBody)}`));
    passed = false;
  }

  // ── TEST 3: The winner's booking is in DB with correct status ────────────────
  console.log();
  console.log(BOLD("TEST 3 — Winning booking persisted correctly in DB"));

  const winnerToken = successes[0]?.body?.token;
  if (winnerToken) {
    const dbRow = await db.query(
      `SELECT id, status, source, created_by, website_booking_token
       FROM bookings WHERE website_booking_token = $1`,
      [winnerToken],
    );
    const row = dbRow.rows[0];
    const dbPass =
      row &&
      row.status === "pending_payment" &&
      row.source === "website" &&
      row.created_by === "website" &&
      row.website_booking_token === winnerToken;

    if (dbPass) {
      console.log(GREEN(`  ✅  PASS — booking #${row.id}, status=${row.status}, source=${row.source}`));
    } else {
      console.log(RED(`  ❌  FAIL — DB row: ${JSON.stringify(row)}`));
      passed = false;
    }
  } else {
    console.log(RED("  ❌  FAIL — No winning token found"));
    passed = false;
  }

  // ── TEST 4: Only 1 booking exists for those dates ────────────────────────────
  console.log();
  console.log(BOLD("TEST 4 — No duplicate booking inserted for same room/dates"));

  const countResult = await db.query(
    `SELECT COUNT(*) as cnt FROM bookings b
     JOIN rooms r ON r.id = b.room_id
     WHERE b.property_id = $1
       AND r.room_type = $2
       AND b.check_in_date  = $3
       AND b.check_out_date = $4
       AND b.status IN ('pending','pending_payment','confirmed','checked-in')`,
    [PROPERTY_ID, ROOM_TYPE, CHECK_IN, CHECK_OUT],
  );

  const count = parseInt(countResult.rows[0].cnt, 10);
  if (count === 1) {
    console.log(GREEN(`  ✅  PASS — exactly 1 active booking in DB (got ${count})`));
  } else {
    console.log(RED(`  ❌  FAIL — ${count} active bookings found (expected 1). DUPLICATE DETECTED.`));
    passed = false;
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────────
  console.log();
  await cleanup(db, tokensToCleanup);
  await db.end();

  // ── Final verdict ─────────────────────────────────────────────────────────────
  console.log();
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  if (passed) {
    console.log(GREEN(BOLD("  OVERALL: PASS — Race condition fix certified ✅")));
  } else {
    console.log(RED(BOLD("  OVERALL: FAIL — See failures above ❌")));
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log();

  process.exit(passed ? 0 : 1);
}

run().catch(err => {
  console.error(RED(`\nFatal error: ${err.message}`));
  console.error(err);
  process.exit(1);
});
