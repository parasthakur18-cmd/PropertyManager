# Booking Cancellation Workflow - Complete Flow

## 1. CURRENT STATE
### Booking Status
- `confirmed` → `checked_in` → `checked_out`
- Currently: No cancellation support

### Bill Status
- `pending` → `partial` → `paid` → `cancelled`
- Payments tracked via RazorPay or Cash

### Advance Payment System
- Booking has `advanceAmount` (decimal)
- Bill has `advancePaid` (decimal) & `balanceAmount`

---

## 2. CANCELLATION POLICY MATRIX

| Days Before Check-in | Refund % | Charges |
|---|---|---|
| >14 days | 100% refund | 0% charge |
| 7-14 days | 75% refund | 25% charge |
| 3-6 days | 50% refund | 50% charge |
| 0-2 days | 0% refund | 100% charge (no refund) |
| Already Checked-in | NO CANCEL | Block operation |

---

## 3. DATABASE SCHEMA CHANGES NEEDED

### New Fields to Add to `bookings` table:
```sql
ALTER TABLE bookings ADD COLUMN cancellation_status VARCHAR(20); -- 'active', 'cancelled'
ALTER TABLE bookings ADD COLUMN cancelled_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN cancelled_by VARCHAR(255); -- user ID
ALTER TABLE bookings ADD COLUMN cancellation_reason TEXT;
ALTER TABLE bookings ADD COLUMN cancellation_policy_applicable VARCHAR(50); -- e.g., "50"
```

### New Fields to Add to `bills` table:
```sql
ALTER TABLE bills ADD COLUMN refund_status VARCHAR(20); -- 'none', 'pending', 'processing', 'completed', 'failed'
ALTER TABLE bills ADD COLUMN refund_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE bills ADD COLUMN cancellation_charges DECIMAL(10,2) DEFAULT 0;
ALTER TABLE bills ADD COLUMN refund_method VARCHAR(50); -- 'razorpay', 'cash', 'bank_transfer'
ALTER TABLE bills ADD COLUMN refund_transaction_id VARCHAR(255);
ALTER TABLE bills ADD COLUMN refund_notes TEXT;
```

### New Table: `cancellations`
```sql
CREATE TABLE cancellations (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  property_id INTEGER REFERENCES properties(id),
  guest_id INTEGER REFERENCES guests(id),
  original_bill_id INTEGER REFERENCES bills(id),
  cancellation_reason TEXT,
  policy_refund_percentage INTEGER,
  total_charges DECIMAL(10,2),
  refund_amount DECIMAL(10,2),
  advance_paid DECIMAL(10,2),
  refund_after_charges DECIMAL(10,2),
  refund_method VARCHAR(50),
  refund_status VARCHAR(20) DEFAULT 'pending',
  razorpay_refund_id VARCHAR(255),
  cancelled_by VARCHAR(255),
  cancelled_at TIMESTAMP DEFAULT NOW(),
  refund_completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 4. REFUND CALCULATION LOGIC

### Formula:
```
Days to check-in = checkInDate - today
Refund % = getPolicyRefund(days)

Charges = totalAmount × (100 - refund%)
Refund Amount = advancePaid - charges

Edge Cases:
- If refund < 0 → No refund (0), no charges back to guest
- If refund > advancePaid → Partial refund only of what was paid
```

### Example Scenarios:

**Scenario 1: 20 days before, ₹500 advance, ₹3000 total**
- Policy: 100% refund (>14 days)
- Charges: ₹0
- Refund: ₹500 ✓

**Scenario 2: 7 days before, ₹500 advance, ₹3000 total**
- Policy: 75% refund (7-14 days)
- Charges: ₹3000 × 25% = ₹750
- Refund: ₹500 - ₹0 = ₹500 (full advance, can't charge more than paid)

**Scenario 3: 1 day before, ₹1000 advance, ₹3000 total**
- Policy: 0% refund (0-2 days)
- Charges: ₹3000 × 100% = ₹3000
- Refund: ₹0 (no refund, advance is forfeited)

---

## 5. PAYMENT REFUND METHODS

### RazorPay Refund (Online Payment):
1. Check if `paymentMethod = "razorpay"`
2. Call RazorPay API: `/refunds` endpoint
3. Refund processes in 3-5 business days
4. Update `refund_transaction_id` with refund ID
5. Set `refund_status = "processing"`
6. Track status via RazorPay webhook

### Cash Refund (Manual Payment):
1. Check if `paymentMethod = "cash"`
2. Create refund record with status "pending"
3. Send WhatsApp: "Refund ₹500 pending. Contact [manager]"
4. Manager manually confirms payment
5. Update `refund_status = "completed"` with timestamp

### Bank Transfer (Future):
1. If bank details available → Auto-transfer
2. Otherwise → Manual processing

---

## 6. WORKFLOW STATES & TRANSITIONS

```
BOOKING STATE FLOW:
confirmed → [cancel] → cancelled
                    ↓
            create_cancellation_record
                    ↓
            calculate_refund
                    ↓
            process_payment_refund
                    ↓
            update_room_status → available
                    ↓
            send_whatsapp_notification
                    ↓
            create_audit_log
                    ↓
            DONE

BLOCKING CONDITIONS (Cannot Cancel):
- booking.status = 'checked_in' → Show warning
- booking.status = 'checked_out' → Block completely
- booking.status = 'cancelled' → Already cancelled
- checkInDate <= today → Already started/completed
```

---

## 7. UI FLOW - CANCELLATION DIALOG

### Step 1: Initial Confirmation
```
┌─────────────────────────────────────────┐
│ Cancel Booking #100                     │
├─────────────────────────────────────────┤
│ Guest: John Doe                         │
│ Room: 101 (Single)                      │
│ Check-in: Dec 5, 2025 (3 days away)     │
│ Amount: ₹3000                           │
│ Advance Paid: ₹500                      │
├─────────────────────────────────────────┤
│ ⚠️  Warning: This action cannot be      │
│     undone. Calculate refund amount?    │
├─────────────────────────────────────────┤
│ [Cancel] [Show Refund Details]          │
└─────────────────────────────────────────┘
```

### Step 2: Refund Breakdown
```
┌─────────────────────────────────────────┐
│ Refund Calculation                      │
├─────────────────────────────────────────┤
│ Cancellation Policy (3-6 days): 50%     │
│                                         │
│ Original Amount:          ₹3000         │
│ Cancellation Charges:     ₹1500 (50%)   │
│ ─────────────────────────             │
│ Refund Amount:            ₹500         │
│ Advance Already Paid:     ₹500         │
│ ─────────────────────────             │
│ Final Refund to Guest:    ₹500 ✓      │
│                                         │
│ Reason (optional):                      │
│ [Dropdown: Guest Request / Other]       │
│                                         │
│ [Cancel] [Proceed with Refund]          │
└─────────────────────────────────────────┘
```

### Step 3: Processing
```
Processing refund via RazorPay...
- Initiating refund ✓
- Amount: ₹500
- Status: Processing (3-5 business days)
- Transaction ID: rfnd_123456

WhatsApp notification sent to guest ✓
Audit log created ✓
```

### Step 4: Success
```
✓ Booking #100 cancelled successfully
✓ Room 101 released to available
✓ Refund: ₹500 (Processing)
✓ Guest notified via WhatsApp
```

---

## 8. API ENDPOINTS NEEDED

### POST `/api/bookings/:id/cancel`
```json
Request Body:
{
  "cancellationReason": "Guest request",
  "cancelledBy": "user_id_123"
}

Response:
{
  "success": true,
  "booking": { id, status: "cancelled", ... },
  "cancellation": {
    "id": 1,
    "bookingId": 100,
    "totalCharges": 1500,
    "refundAmount": 500,
    "refundMethod": "razorpay",
    "refundStatus": "processing",
    "transactionId": "rfnd_123"
  },
  "bill": {
    "refundStatus": "processing",
    "refundAmount": 500
  }
}
```

### GET `/api/cancellations/:bookingId`
- Fetch cancellation details for a booking

### PATCH `/api/cancellations/:id/mark-completed`
- Mark manual refund as completed (for cash refunds)

---

## 9. WHATSAPP NOTIFICATIONS

### On Cancellation Initiated:
```
Hi [GuestName]! 👋

Your booking #100 has been cancelled.

📋 Refund Details:
• Original Amount: ₹3000
• Cancellation Policy: 50% (3-6 days)
• Charges: ₹1500
• Refund Amount: ₹500

💰 Refund Status: Processing
Expected in 3-5 business days

Contact us if you have any questions.

[Hotel Name]
```

### If Cash Refund:
```
Hi [GuestName]! 👋

Your refund of ₹500 is pending manual payment.

Please visit [Hotel Name] or contact [Manager] at [Phone] to collect your refund.

Thank you!
```

### RazorPay Refund Webhook:
```
Update when refund completes:
"Your refund of ₹500 has been successfully processed!
Transaction ID: rfnd_123456"
```

---

## 10. EDGE CASES TO HANDLE

### Merged Bookings Cancellation
- Q: Can user cancel 1 booking from merged set?
- A: Options:
  - a) Cancel entire merged bill (all bookings)
  - b) Cancel individual booking (recalculate merged bill)
  - Recommendation: Block individual cancellation, require full merge cancellation

### Multiple Bills for Same Booking
- Q: What if booking has pre-bill + final bill?
- A: Cancel only the final bill, keep pre-bill record for audit

### Already Checked-In
- Q: User tries to cancel after check-in?
- A: Show warning: "Booking already checked in. Full charges apply. Proceed?"

### RazorPay Refund Failure
- Q: What if refund API fails?
- A: Retry mechanism + fallback to manual processing status

### Duplicate Cancellation
- Q: User clicks cancel twice?
- A: Lock booking when cancellation starts, prevent double-click

---

## 11. AUDIT LOGGING

Every cancellation creates audit log:
```
{
  "action": "BOOKING_CANCELLED",
  "bookingId": 100,
  "userId": "user_123",
  "timestamp": "2025-12-02T10:30:00Z",
  "details": {
    "originalAmount": 3000,
    "advancePaid": 500,
    "refundAmount": 500,
    "cancellationReason": "Guest request",
    "refundMethod": "razorpay"
  }
}
```

---

## 12. IMPLEMENTATION CHECKLIST

Frontend:
- [ ] Add "Cancel" button in Active Bookings page
- [ ] Create CancellationDialog component
- [ ] Show refund calculation breakdown
- [ ] Handle loading & error states
- [ ] Display cancellation confirmation

Backend:
- [ ] Add schema fields to bookings & bills
- [ ] Create cancellations table
- [ ] POST `/api/bookings/:id/cancel` endpoint
- [ ] Calculate refund logic
- [ ] RazorPay refund integration
- [ ] WhatsApp notification sender
- [ ] Audit logging
- [ ] Room status reset to available

Tests:
- [ ] Cancellation policy calculation
- [ ] Refund amount accuracy
- [ ] State transitions
- [ ] Merged booking handling

---

## 13. RISKS & MITIGATIONS

| Risk | Impact | Mitigation |
|---|---|---|
| Double refund | Revenue loss | Unique cancellation ID check |
| Partial advance refund | Accounting error | Always use `totalAdvance` from bill |
| RazorPay timeout | Stuck in processing | Retry mechanism + manual review |
| Merged booking mess | Data corruption | Block individual cancellation |
| No audit trail | Compliance issue | Log every step in audit_logs table |

---

**Ready to build this?** Review the flow and let me know if you want any changes before we implement!
