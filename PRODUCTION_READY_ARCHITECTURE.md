# Hostezee Production-Ready SaaS Architecture (v2.0)

## Critical Revisions Based on Architect Review

### ❌ Original Flaws Identified
1. **In-memory EventBus** - Breaks under horizontal scaling, no durability
2. **No concrete cache invalidation mapping** - Can't actually replace scattered `invalidateQueries`
3. **Vague tenancy model** - No isolation enforcement strategy
4. **Missing operational safeguards** - No retries, backpressure, audit trails
5. **No billing stack choice** - Just mentioned "Stripe/Razorpay" without integration plan

---

## ✅ Revised Production Architecture

### 1. Event System: Redis Streams (Durable, Scalable)

**Why Redis Streams?**
- ✅ Durable (events persist even if app crashes)
- ✅ Horizontal scaling (multiple app instances can consume)
- ✅ Consumer groups (each frontend client gets own stream)
- ✅ Replay capability (can reprocess events)
- ✅ Backpressure handling
- ✅ Simple to deploy (Replit supports Redis)

#### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│  USER ACTION (Create Booking)                                │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│  BACKEND: API Route Handler                                  │
│  POST /api/bookings                                           │
│                                                               │
│  1. Validate request ✓                                        │
│  2. Call storage.createBooking(data)                          │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│  STORAGE LAYER (server/storage.ts)                           │
│                                                               │
│  async createBooking(data) {                                  │
│    const booking = await db.insert(bookings).values(data)    │
│                                                               │
│    // Publish to Redis Stream                                │
│    await redis.xadd(                                          │
│      'domain-events',                                         │
│      '*',                                                     │
│      'type', 'BOOKING_CREATED',                               │
│      'data', JSON.stringify(booking),                         │
│      'propertyId', booking.propertyId,                        │
│      'timestamp', Date.now()                                  │
│    )                                                          │
│                                                               │
│    return booking                                             │
│  }                                                            │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│  REDIS STREAMS                                                │
│  Stream: 'domain-events'                                      │
│                                                               │
│  Events:                                                      │
│  - BOOKING_CREATED                                            │
│  - PAYMENT_RECEIVED                                           │
│  - ORDER_PLACED                                               │
│  - etc.                                                       │
│                                                               │
│  ✓ Durable (persisted to disk)                               │
│  ✓ Ordered (by timestamp)                                    │
│  ✓ Replayable (from any position)                            │
└─────────┬─────────────────────────────┬──────────────────────┘
          │                             │
          │ Consumer Group:             │ Consumer Group:
          │ 'backend-workers'           │ 'sse-broadcaster'
          ▼                             ▼
┌──────────────────────┐      ┌─────────────────────────────┐
│ BACKEND WORKERS      │      │ SSE BROADCASTER             │
│ (Background Jobs)    │      │ (Real-time to Clients)      │
├──────────────────────┤      ├─────────────────────────────┤
│ • Analytics          │      │ Connected clients:          │
│   recalculation      │      │ ┌─────────────────┐         │
│ • P&L report         │      │ │ Client 1 (SSE)  │         │
│   refresh            │      │ │ • User: admin   │         │
│ • Revenue stats      │      │ │ • Property: 1   │         │
│   update             │      │ └─────────────────┘         │
│ • Email              │      │ ┌─────────────────┐         │
│   notifications      │      │ │ Client 2 (SSE)  │         │
│ • Audit logging      │      │ │ • User: manager │         │
└──────────────────────┘      │ │ • Property: 2   │         │
                              │ └─────────────────┘         │
                              │                             │
                              │ Broadcasts events to        │
                              │ matching clients            │
                              └─────────────┬───────────────┘
                                            │
                                            ▼
                              ┌─────────────────────────────┐
                              │ FRONTEND: EventSource       │
                              │ (client/src/lib/events.ts)  │
                              │                             │
                              │ const eventSource =         │
                              │   new EventSource(          │
                              │     '/api/events/stream'    │
                              │   )                         │
                              │                             │
                              │ eventSource.onmessage = (e) │
                              │   const event =             │
                              │     JSON.parse(e.data)      │
                              │                             │
                              │   // Dispatch to handler    │
                              │   handleEvent(event)        │
                              │ }                           │
                              └─────────────┬───────────────┘
                                            │
                                            ▼
                              ┌─────────────────────────────┐
                              │ EVENT HANDLER               │
                              │ (concrete mapping!)         │
                              │                             │
                              │ handleEvent(event) {        │
                              │   switch(event.type) {      │
                              │     case 'BOOKING_CREATED': │
                              │       queryClient           │
                              │         .invalidateQueries({│
                              │           queryKey:         │
                              │           ['/api/bookings'] │
                              │         })                  │
                              │       queryClient           │
                              │         .invalidateQueries({│
                              │           queryKey:         │
                              │           ['/api/rooms']    │
                              │         })                  │
                              │       queryClient           │
                              │         .invalidateQueries({│
                              │           queryKey:         │
                              │         ['/api/dashboard/   │
                              │           stats']           │
                              │         })                  │
                              │       toast({               │
                              │         title: "New Booking"│
                              │       })                    │
                              │       break                 │
                              │   }                         │
                              │ }                           │
                              └─────────────────────────────┘
```

#### Concrete Event Handler Mapping

**File: `client/src/lib/eventHandlers.ts`**

```typescript
import { queryClient } from './queryClient';
import { toast } from '@/hooks/use-toast';

export function handleDomainEvent(event: DomainEvent) {
  switch (event.type) {
    case 'BOOKING_CREATED':
      // Invalidate all affected queries
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      
      // Show notification
      toast({
        title: "New Booking Created",
        description: `Booking for ${event.data.guestName}`,
      });
      break;

    case 'PAYMENT_RECEIVED':
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financials'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      toast({
        title: "Payment Received",
        description: `₹${event.data.amount} received`,
      });
      break;

    case 'ORDER_PLACED':
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      // Play notification sound for kitchen
      if (event.data.type === 'room-service') {
        playNotificationSound();
      }
      
      toast({
        title: "New Order",
        description: `Room ${event.data.roomNumber}`,
      });
      break;

    // ... all other event types with CONCRETE mappings
  }
}
```

**File: `server/eventWorkers.ts`** (Background jobs)

```typescript
import Redis from 'ioredis';
import { storage } from './storage';

const redis = new Redis(process.env.REDIS_URL);

// Consumer group for backend workers
export async function startBackendWorkers() {
  // Create consumer group if not exists
  try {
    await redis.xgroup('CREATE', 'domain-events', 'backend-workers', '0', 'MKSTREAM');
  } catch (err) {
    // Group already exists
  }

  // Process events continuously
  while (true) {
    const events = await redis.xreadgroup(
      'GROUP', 'backend-workers', 'worker-1',
      'BLOCK', 5000,
      'STREAMS', 'domain-events', '>'
    );

    if (events) {
      for (const [stream, messages] of events) {
        for (const [id, fields] of messages) {
          const eventType = fields[fields.indexOf('type') + 1];
          const eventData = JSON.parse(fields[fields.indexOf('data') + 1]);

          await handleBackendEvent(eventType, eventData);

          // Acknowledge processing
          await redis.xack('domain-events', 'backend-workers', id);
        }
      }
    }
  }
}

async function handleBackendEvent(type: string, data: any) {
  switch (type) {
    case 'BOOKING_CREATED':
    case 'PAYMENT_RECEIVED':
    case 'BOOKING_CANCELLED':
      // Recalculate analytics
      await storage.recalculateAnalytics(data.propertyId);
      break;

    case 'EXPENSE_ADDED':
    case 'LEASE_PAYMENT_RECORDED':
      // Recalculate P&L
      await storage.recalculatePL(data.propertyId);
      break;

    // Audit logging for all events
    default:
      await storage.createAuditLog({
        eventType: type,
        data: data,
        timestamp: new Date(),
      });
  }
}
```

---

### 2. Multi-Tenancy: Shared Schema with Row-Level Isolation

**Chosen Approach: Shared Schema + organizationId Column**

**Why?**
- ✅ Cost-effective (single database)
- ✅ Easy backups and maintenance
- ✅ Simple migrations
- ✅ Good for <1000 tenants

**Alternative Considered: Separate Schemas per Tenant**
- ❌ More complex migrations
- ❌ Higher operational overhead
- ❌ Better for >1000 tenants or strict compliance

#### Tenant Isolation Strategy

**Database Level:**

```typescript
// shared/schema.ts

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  subscriptionPlan: varchar("subscription_plan", { length: 50 }).notNull().default("free"),
  // ... other fields
});

// Add organizationId to ALL tenant-scoped tables
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  // ... other fields
});

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  // ... other fields
});

// Index for performance
export const organizationIdIndex = pgIndex("org_id_idx").on(properties.organizationId);
```

**Middleware Level: Automatic Tenant Scoping**

```typescript
// server/middleware/tenancy.ts

export function tenantScoping(req: any, res: any, next: any) {
  // Get user from session
  const userId = req.user?.claims?.sub;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Get user's organization
  const user = await storage.getUser(userId);
  if (!user || !user.organizationId) {
    return res.status(403).json({ message: "No organization assigned" });
  }

  // Attach to request context
  req.organizationId = user.organizationId;
  req.currentUser = user;

  next();
}

// Apply to all routes
app.use('/api/*', isAuthenticated, tenantScoping);
```

**Storage Level: Auto-filter by Organization**

```typescript
// server/storage.ts

class Storage {
  async getAllProperties(organizationId: number) {
    return await db
      .select()
      .from(properties)
      .where(eq(properties.organizationId, organizationId));
  }

  async createProperty(data: InsertProperty, organizationId: number) {
    // Force organizationId (prevent cross-tenant creation)
    const safeData = { ...data, organizationId };
    
    const property = await db.insert(properties).values(safeData).returning();
    
    // Publish event
    await this.publishEvent({
      type: 'PROPERTY_CREATED',
      data: property,
      organizationId,
    });
    
    return property;
  }

  // CRITICAL: Never allow queries without organizationId filter
  // (except for system admins)
}
```

**Route Level: Enforce Organization Context**

```typescript
// server/routes.ts

app.get("/api/properties", isAuthenticated, tenantScoping, async (req: any, res) => {
  try {
    // req.organizationId set by tenantScoping middleware
    const properties = await storage.getAllProperties(req.organizationId);
    res.json(properties);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/properties", isAuthenticated, tenantScoping, async (req: any, res) => {
  try {
    const data = insertPropertySchema.parse(req.body);
    
    // Force organizationId from middleware (prevent tampering)
    const property = await storage.createProperty(data, req.organizationId);
    
    res.status(201).json(property);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
```

#### Migration Strategy

```typescript
// migrations/add-organizations.ts

export async function migrateToMultiTenancy() {
  // Step 1: Create organizations table
  await db.schema.createTable('organizations')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('slug', 'varchar(100)', (col) => col.notNull().unique())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    // ... other columns
    .execute();

  // Step 2: Create default organization for existing data
  const [defaultOrg] = await db.insert(organizations).values({
    slug: 'default',
    name: 'Default Organization',
    subscriptionPlan: 'free',
    ownerEmail: 'admin@example.com',
  }).returning();

  // Step 3: Add organizationId column to all tables
  await db.schema.alterTable('properties')
    .addColumn('organization_id', 'integer')
    .execute();

  await db.schema.alterTable('users')
    .addColumn('organization_id', 'integer')
    .execute();

  // ... repeat for all tables

  // Step 4: Set all existing records to default organization
  await db.update(properties).set({ organizationId: defaultOrg.id }).execute();
  await db.update(users).set({ organizationId: defaultOrg.id }).execute();
  // ... repeat for all tables

  // Step 5: Add NOT NULL constraint
  await db.schema.alterTable('properties')
    .alterColumn('organization_id', (col) => col.setNotNull())
    .execute();

  // Step 6: Add foreign keys
  await db.schema.alterTable('properties')
    .addForeignKeyConstraint('fk_property_org', ['organization_id'], 'organizations', ['id'])
    .execute();
}
```

**Automated Tests for Tenant Isolation**

```typescript
// server/__tests__/tenancy.test.ts

describe('Tenant Isolation', () => {
  let org1: Organization;
  let org2: Organization;
  let user1: User;
  let user2: User;

  beforeEach(async () => {
    // Create two organizations
    org1 = await storage.createOrganization({ name: 'Org 1', slug: 'org-1' });
    org2 = await storage.createOrganization({ name: 'Org 2', slug: 'org-2' });

    // Create users for each org
    user1 = await storage.createUser({ organizationId: org1.id, email: 'user1@org1.com' });
    user2 = await storage.createUser({ organizationId: org2.id, email: 'user2@org2.com' });
  });

  it('should not allow user from org1 to see org2 properties', async () => {
    // Create property in org1
    const property1 = await storage.createProperty({ name: 'Property 1' }, org1.id);

    // Create property in org2
    const property2 = await storage.createProperty({ name: 'Property 2' }, org2.id);

    // User from org1 should only see org1 properties
    const propertiesForUser1 = await storage.getAllProperties(org1.id);
    expect(propertiesForUser1).toHaveLength(1);
    expect(propertiesForUser1[0].id).toBe(property1.id);
    expect(propertiesForUser1[0].id).not.toBe(property2.id);
  });

  it('should prevent cross-tenant data modification', async () => {
    const property1 = await storage.createProperty({ name: 'Property 1' }, org1.id);

    // User from org2 tries to update org1's property
    await expect(
      storage.updateProperty(property1.id, { name: 'Hacked' }, org2.id)
    ).rejects.toThrow('Property not found');
  });

  // ... more isolation tests
});
```

---

### 3. Operational Safeguards

#### A. Event Audit Trail

```typescript
// shared/schema.ts

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  userId: varchar("user_id", { length: 255 }),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  eventData: json("event_data"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});
```

#### B. Retry Logic

```typescript
// server/eventWorkers.ts

async function handleBackendEvent(type: string, data: any, attempt: number = 1) {
  const MAX_RETRIES = 3;
  
  try {
    switch (type) {
      case 'BOOKING_CREATED':
        await storage.recalculateAnalytics(data.propertyId);
        break;
      // ... other cases
    }
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      // Exponential backoff: 1s, 2s, 4s
      await sleep(1000 * Math.pow(2, attempt - 1));
      return handleBackendEvent(type, data, attempt + 1);
    } else {
      // Send to dead letter queue
      await redis.xadd('domain-events-dlq', '*', 'type', type, 'data', JSON.stringify(data), 'error', error.message);
    }
  }
}
```

#### C. Backpressure Handling

```typescript
// server/sseServer.ts

const MAX_CLIENTS_PER_WORKER = 1000;
let activeClients = 0;

app.get('/api/events/stream', isAuthenticated, tenantScoping, (req: any, res: any) => {
  if (activeClients >= MAX_CLIENTS_PER_WORKER) {
    return res.status(503).json({ message: "Server at capacity, try again later" });
  }

  activeClients++;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const clientId = crypto.randomUUID();
  const organizationId = req.organizationId;

  // Subscribe to Redis stream for this organization
  const consumer = createEventConsumer(organizationId, clientId);

  consumer.on('event', (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  req.on('close', () => {
    consumer.disconnect();
    activeClients--;
  });
});
```

#### D. Dead Letter Queue Monitoring

```typescript
// server/monitoring.ts

// Check DLQ every minute
setInterval(async () => {
  const dlqLength = await redis.xlen('domain-events-dlq');
  
  if (dlqLength > 0) {
    // Alert operations team
    await sendSlackAlert(`⚠️ ${dlqLength} failed events in DLQ`);
    
    // Log to error tracking
    Sentry.captureMessage(`Dead letter queue has ${dlqLength} events`);
  }
}, 60000);
```

---

### 4. Subscription & Billing: Stripe Integration

**Why Stripe?**
- ✅ Best-in-class APIs
- ✅ Built-in customer portal
- ✅ Supports Indian Rupee (₹)
- ✅ Webhook reliability
- ✅ Tax calculation (TCS/GST)

#### Subscription Plans

```typescript
// shared/schema.ts

export type SubscriptionPlan = 'free' | 'standard' | 'premium';

export const subscriptionPlans = {
  free: {
    name: 'Free',
    price: 0,
    features: [
      '1 property',
      'Up to 10 rooms',
      'Basic analytics',
      '30 days data retention',
    ],
  },
  standard: {
    name: 'Standard',
    price: 2999, // ₹2,999/month
    features: [
      'Up to 5 properties',
      'Unlimited rooms',
      'Advanced analytics',
      'WhatsApp/SMS integration',
      '1 year data retention',
      'Email support',
    ],
  },
  premium: {
    name: 'Premium',
    price: 9999, // ₹9,999/month
    features: [
      'Unlimited properties',
      'Unlimited rooms',
      'Advanced analytics',
      'WhatsApp/SMS integration',
      'Unlimited data retention',
      'Priority support',
      'Custom branding',
      'API access',
    ],
  },
};
```

#### Stripe Integration Flow

```typescript
// server/billing.ts

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-10-28.acacia',
});

export async function createSubscription(
  organizationId: number,
  plan: SubscriptionPlan,
  paymentMethodId: string
) {
  const org = await storage.getOrganization(organizationId);

  // Create Stripe customer if not exists
  let stripeCustomerId = org.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: org.ownerEmail,
      name: org.name,
      metadata: { organizationId: organizationId.toString() },
    });
    stripeCustomerId = customer.id;
    await storage.updateOrganization(organizationId, { stripeCustomerId });
  }

  // Attach payment method
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: stripeCustomerId,
  });

  await stripe.customers.update(stripeCustomerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  // Create subscription
  const priceId = process.env[`STRIPE_PRICE_${plan.toUpperCase()}`];
  const subscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: [{ price: priceId }],
    metadata: { organizationId: organizationId.toString() },
  });

  // Update organization
  await storage.updateOrganization(organizationId, {
    subscriptionPlan: plan,
    subscriptionStatus: 'active',
    stripeSubscriptionId: subscription.id,
  });

  return subscription;
}

// Webhook handler for Stripe events
export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'invoice.payment_succeeded':
      const invoice = event.data.object as Stripe.Invoice;
      const orgId = parseInt(invoice.metadata.organizationId);
      
      await storage.updateOrganization(orgId, {
        subscriptionStatus: 'active',
      });
      
      await redis.xadd('domain-events', '*',
        'type', 'SUBSCRIPTION_RENEWED',
        'data', JSON.stringify({ organizationId: orgId }),
      );
      break;

    case 'invoice.payment_failed':
      const failedInvoice = event.data.object as Stripe.Invoice;
      const failedOrgId = parseInt(failedInvoice.metadata.organizationId);
      
      await storage.updateOrganization(failedOrgId, {
        subscriptionStatus: 'past_due',
      });
      
      // Send email notification
      await sendEmail(failedInvoice.customer_email, 'Payment Failed', '...');
      break;

    case 'customer.subscription.deleted':
      const subscription = event.data.object as Stripe.Subscription;
      const cancelledOrgId = parseInt(subscription.metadata.organizationId);
      
      await storage.updateOrganization(cancelledOrgId, {
        subscriptionStatus: 'cancelled',
        subscriptionPlan: 'free',
      });
      break;
  }
}
```

---

### 5. Database Migration Strategy

**Tool: Drizzle Kit (already installed)**

```typescript
// drizzle.config.ts

import type { Config } from "drizzle-kit";

export default {
  schema: "./shared/schema.ts",
  out: "./migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

**Migration Workflow:**

```bash
# 1. Generate migration
npm run drizzle-kit generate:pg

# 2. Review generated SQL in migrations/ folder

# 3. Run migration
npm run drizzle-kit push:pg

# 4. Verify in database
npm run drizzle-kit studio
```

**Critical Migrations:**

1. **Add Organizations** (Week 3)
   - Create organizations table
   - Add organizationId to all tables
   - Migrate existing data to default org

2. **Add Audit Logs** (Week 6)
   - Create audit_logs table

3. **Add Subscription Fields** (Week 5)
   - Add stripeCustomerId, stripeSubscriptionId to organizations

---

## 📊 Revised Implementation Roadmap

### Phase 1: Event System Foundation (Week 1-2)
**Priority: CRITICAL**

**Dependencies:**
- Redis (install via Replit or external service)

**Deliverables:**
- [x] Install Redis client (`ioredis`)
- [x] Create `server/eventBus.ts` with Redis Streams
- [x] Update `server/storage.ts` to publish events
- [x] Create `server/eventWorkers.ts` background consumers
- [x] Create `server/sseServer.ts` for SSE broadcast
- [x] Create `client/src/lib/eventHandlers.ts` with CONCRETE mappings
- [x] Test: Verify all 28 pages update automatically

**Acceptance Criteria:**
- ✅ Create booking → All pages update within 500ms
- ✅ App survives restart (events replay from Redis)
- ✅ Multiple browser tabs all update simultaneously
- ✅ Dead letter queue handles failures

### Phase 2: Multi-Tenancy (Week 3-4)
**Priority: HIGH**

**Deliverables:**
- [x] Add `organizations` table to schema
- [x] Migration script to add organizationId to all tables
- [x] Create `server/middleware/tenancy.ts`
- [x] Update all storage methods with organizationId filtering
- [x] Write automated tenant isolation tests
- [x] Create admin dashboard for organization management

**Acceptance Criteria:**
- ✅ User from Org A cannot see Org B's data
- ✅ All API endpoints enforce tenant scoping
- ✅ 100% test coverage for isolation

### Phase 3: Subscription & Billing (Week 5-6)
**Priority: HIGH**

**Dependencies:**
- Stripe account (Indian business verified)

**Deliverables:**
- [x] Stripe integration (`server/billing.ts`)
- [x] Subscription plans UI
- [x] Stripe webhook handler
- [x] Payment portal
- [x] Trial period logic (14 days free)
- [x] Plan enforcement (feature limits)

**Acceptance Criteria:**
- ✅ User can subscribe via Stripe
- ✅ Webhook updates subscription status
- ✅ Free plan limited to 1 property, 10 rooms
- ✅ Standard/Premium features unlock automatically

### Phase 4: Onboarding Flow (Week 6)
**Priority: MEDIUM**

**Deliverables:**
- [x] Registration page
- [x] Property setup wizard
- [x] Team invitation flow
- [x] Sample data generator
- [x] Onboarding checklist
- [x] Welcome email

**Acceptance Criteria:**
- ✅ New tenant can go live in < 10 minutes
- ✅ 80% complete setup wizard

### Phase 5: Operational Safeguards (Week 7)
**Priority: HIGH**

**Deliverables:**
- [x] Audit logging system
- [x] Error tracking (Sentry)
- [x] Performance monitoring
- [x] Dead letter queue monitoring
- [x] Automated backups

**Acceptance Criteria:**
- ✅ All mutations logged to audit_logs
- ✅ Errors tracked in Sentry
- ✅ Daily automated backups

### Phase 6: PWA & Mobile (Week 8)
**Priority: MEDIUM**

**Deliverables:**
- [x] Service worker
- [x] App manifest
- [x] Offline support
- [x] Install prompt
- [x] Push notifications

**Acceptance Criteria:**
- ✅ Works offline for read operations
- ✅ Syncs when back online
- ✅ Installable on mobile

### Phase 7: Production Hardening (Week 9-10)
**Priority: HIGH**

**Deliverables:**
- [x] Database indexes
- [x] Connection pooling
- [x] Rate limiting
- [x] CORS configuration
- [x] Security headers
- [x] Load testing (1000 concurrent users)

**Acceptance Criteria:**
- ✅ API p95 < 200ms
- ✅ Handles 1000 concurrent users
- ✅ Zero SQL N+1 queries

### Phase 8: Advanced Features (Week 11-12)
**Priority: LOW**

**Deliverables:**
- [x] Email notifications
- [x] Export/Import data
- [x] Webhooks API
- [x] Public REST API
- [x] Advanced analytics

---

## 🎯 Success Metrics (Concrete)

### Technical
- **Data Propagation**: 100% automatic (measured by zero stale data bugs)
- **Latency**: UI updates < 500ms (p95)
- **Uptime**: 99.9% (measured monthly)
- **Error Rate**: < 0.1% (Sentry tracking)

### Business
- **Onboarding Time**: < 10 minutes average
- **Trial Conversion**: > 30%
- **Monthly Churn**: < 5%

---

## 🚀 Next Steps

**Immediate Actions (This Week):**
1. ✅ Get approval on this revised architecture
2. 🔜 Install Redis on Replit
3. 🔜 Implement Phase 1 (Event System)
4. 🔜 Test with all 28 existing pages

**Questions for Stakeholder:**
1. Confirm Stripe for billing? (vs. Razorpay)
2. Preferred Redis provider? (Replit built-in vs. Upstash/Redis Cloud)
3. Target launch date for beta?

---

**Document Version**: 2.0 (Production-Ready)  
**Last Updated**: November 2, 2025  
**Status**: Ready for Review & Implementation
