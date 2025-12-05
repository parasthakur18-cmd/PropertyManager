# Hostezee Roles - Functional Report
## Super Admin vs Property Owner Admin

---

## 📊 QUICK COMPARISON

| Feature | Super Admin | Property Owner/Admin |
|---------|---|---|
| **Access Scope** | Entire System | Own Property Only |
| **Can Approve Users** | ✅ Yes | ❌ No |
| **Can View All Properties** | ✅ Yes | ❌ Only Own |
| **Can Manage Rooms** | ❌ No (Admin does) | ✅ Yes |
| **Can Manage Bookings** | ❌ No (Admin does) | ✅ Yes |
| **Can Manage Guests** | ❌ No (Admin does) | ✅ Yes |
| **Can Manage Staff** | ❌ No (Admin does) | ✅ Yes |
| **Can Manage Finances** | View Reports Only | ✅ Yes |
| **Number in System** | 1 Person | Multiple (1 per property) |
| **Typical User** | System Manager | Hotel/Resort Owner |

---

## 🔐 ROLE 1: SUPER ADMIN

### **What is Super Admin?**
The **system administrator** who manages the entire platform. One person per system.

### **Primary Responsibilities**

#### 1. **User Approval & Verification** ⭐ MOST IMPORTANT
```
New User Registers
         ↓
Super Admin Reviews:
  ✓ Business legitimacy
  ✓ Contact information
  ✓ Property location
         ↓
APPROVE → Property created + Admin role granted
   OR
REJECT → User blocked + Reason sent via WhatsApp
```

**Example:**
- Hotel owner from Delhi registers
- Super Admin verifies business
- Approves → Creates property "Taj Palace Hotel"
- Owner can now login and manage

#### 2. **Monitor All Properties** 🏨
- View all 500+ properties in system
- Check status (active/inactive)
- Monitor occupancy rates
- Review revenue metrics

#### 3. **Manage All Users** 👥
- View every user in system
- Check verification status
- Edit roles/permissions
- Deactivate problematic users

#### 4. **System Analytics** 📊
- Platform-wide revenue reports
- Total bookings across all properties
- Occupancy statistics
- User growth metrics

#### 5. **Issue Management** 🐛
- Monitor reported issues from users
- Track system errors
- Handle support escalations
- Review crash logs

### **Super Admin Use Cases**

| Scenario | Action |
|----------|--------|
| New property owner registers | Approve user, create property, assign admin role |
| Property owner misbehaves | Deactivate account, review issues |
| System crashes | Check error logs, contact technical team |
| Revenue report needed | Run system analytics, export data |
| Fraudulent user detected | Reject registration, block email |
| All properties report down | Check system status, restart services |

### **Super Admin Permissions**
```
✅ Approve/Reject users
✅ View all properties
✅ Edit all users
✅ View system reports
✅ Access admin panel
✅ Manage platform settings
❌ Create bookings (property admin does this)
❌ Manage individual rooms (property admin does this)
❌ Handle guest check-in (property admin does this)
```

---

## 🏨 ROLE 2: PROPERTY OWNER / ADMIN

### **What is Property Owner Admin?**
The **property manager** who manages one property. Created by Super Admin during user approval.

### **Primary Responsibilities**

#### 1. **Room Management** 🛏️
```
Add/Edit/Delete Rooms
  ✓ Room number, type, capacity
  ✓ Pricing and rates
  ✓ Amenities and features
  ✓ Room status (available/occupied/maintenance)
```

**Example:**
- Create Room 101: Deluxe Twin, ₹5000/night
- Create Room 102: Suite, ₹8000/night
- Mark Room 103 as maintenance

#### 2. **Booking Management** 📅
```
Manage Incoming Bookings
  ✓ Accept/Confirm bookings
  ✓ Modify booking dates
  ✓ Process cancellations
  ✓ Track booking status
```

**Example:**
- New booking: John Doe, Room 101, 5 nights
- Accept booking → Room marked occupied
- Guest cancels → Process refund

#### 3. **Guest Management** 👤
```
Handle Guest Information
  ✓ Add guest details
  ✓ Upload ID proof
  ✓ Track check-in/check-out
  ✓ Store guest history
```

**Example:**
- Guest arrives: John Doe, Passport details
- Upload ID proof to cloud storage
- Mark check-in at 2 PM
- Track previous bookings

#### 4. **Financial Management** 💰
```
Track Money & Payments
  ✓ View room revenue
  ✓ Track expenses (cleaning, maintenance)
  ✓ Generate bills
  ✓ Process refunds
  ✓ Accept payments via RazorPay
```

**Example:**
- Booking total: ₹50,000
- Generate bill with GST
- Send payment link via WhatsApp
- Mark as paid after confirmation

#### 5. **Staff Management** 👥
```
Manage Property Staff
  ✓ Add staff members (housekeeping, front desk)
  ✓ Track attendance
  ✓ Calculate salaries
  ✓ Monitor performance
```

**Example:**
- Add Housekeeping Staff: Ramesh, ₹15,000/month
- Track attendance for 20 days
- Calculate salary with deductions
- Generate salary slip

#### 6. **Restaurant/Food Service** 🍽️
```
Manage Food Orders (if enabled)
  ✓ Create menu items
  ✓ Manage orders
  ✓ Track kitchen orders
  ✓ Send order notifications
```

**Example:**
- Guest orders breakfast: 2 Tea, 1 Toast
- Order goes to kitchen
- Kitchen marks complete
- Charge added to room bill

#### 7. **Analytics & Reports** 📊
```
View Property-Specific Data
  ✓ Occupancy rate
  ✓ Revenue this month
  ✓ Booking trends
  ✓ Guest feedback
```

**Example:**
- November: 85% occupancy
- Revenue: ₹15 lakhs
- Average rating: 4.5 stars

### **Property Admin Use Cases**

| Scenario | Action |
|----------|--------|
| New guest arrives | Check-in, verify ID, assign room |
| Guest needs extra bed | Add to booking, update bill |
| Room needs cleaning | Mark as maintenance, notify staff |
| Payment received | Confirm payment, generate receipt |
| Staff attendance | Mark present/absent, calculate pay |
| Monthly report needed | Export booking data, revenue report |
| Guest complaint | Note issue, follow up with guest |

### **Property Admin Permissions**
```
✅ Create/Edit/Delete rooms
✅ Manage bookings
✅ Add guests
✅ Generate bills
✅ Manage staff
✅ Process payments
✅ View property reports
❌ View other properties
❌ Approve new users (Super Admin does this)
❌ Access system-wide reports
❌ Edit other property admins
```

---

## 🎯 REAL-WORLD WORKFLOW

### **Day 1: Property Owner Registers**
```
Owner: "I want to list my 20-room hotel on Hostezee"
           ↓
Owner registers at /signup with:
  - Email: owner@hotel.com
  - Business: "Taj Palace Hotel"
  - Location: "Jaipur, Rajasthan"
           ↓
Status: PENDING ⏳
```

### **Day 2: Super Admin Approves**
```
Super Admin at /super-admin-login
           ↓
Reviews: Taj Palace Hotel, Jaipur
           ↓
Clicks "Approve"
           ↓
System automatically:
  ✓ Creates property "Taj Palace Hotel"
  ✓ Promotes owner to "Admin" role
  ✓ Grants all permissions
  ✓ Sends WhatsApp notification
```

### **Day 3: Property Admin Starts Using**
```
Admin login with same credentials
           ↓
Can now:
  ✓ Add 20 rooms
  ✓ Set room prices
  ✓ Accept bookings
  ✓ Manage guests
  ✓ Track finances
           ↓
First booking comes in → Admin accepts
           ↓
Guest checks in → Admin manages stay
```

---

## 📈 HIERARCHY

```
SUPER ADMIN (1 person)
    │
    ├─→ Approves Property Owner 1
    │        │
    │        └─→ PROPERTY ADMIN (manages 20 rooms)
    │             ├─ Add Rooms
    │             ├─ Manage Bookings
    │             ├─ Manage Guests
    │             └─ Track Revenue
    │
    ├─→ Approves Property Owner 2
    │        │
    │        └─→ PROPERTY ADMIN (manages 50 rooms)
    │
    └─→ Approves Property Owner 3
             │
             └─→ PROPERTY ADMIN (manages 10 rooms)

Super Admin can see ALL properties
Each Property Admin only sees THEIR property
```

---

## 📋 FEATURE COMPARISON TABLE

| Feature | Super Admin | Property Admin | Purpose |
|---------|---|---|---|
| **Approve Users** | ✅ | ❌ | Quality control |
| **View All Properties** | ✅ | ❌ | Platform oversight |
| **Create Rooms** | ❌ | ✅ | Inventory management |
| **Accept Bookings** | ❌ | ✅ | Revenue generation |
| **Check-in Guest** | ❌ | ✅ | Guest management |
| **Generate Bill** | ❌ | ✅ | Financial tracking |
| **Pay Staff Salary** | ❌ | ✅ | Staff management |
| **View System Reports** | ✅ | ❌ | Platform analytics |
| **View Property Reports** | ❌ | ✅ | Property analytics |
| **Edit Other Users** | ✅ | ❌ | User management |
| **Edit Own Profile** | ✅ | ✅ | Profile management |
| **Access Own Property** | ❌ | ✅ | Direct management |

---

## 🔐 SECURITY ISOLATION

### Super Admin
- Sees all data
- Can manage all users
- Cannot be deleted
- One person per system
- Super secure login

### Property Admin
- Sees ONLY their property data
- Cannot see other properties
- Cannot approve users
- Cannot access other property admin data
- Normal secure login

**Example:**
```
Property 1 Admin (Hotel A)
  ├─ Can see: Rooms, Bookings, Guests, Staff
  └─ Cannot see: Hotel B's data, Hotel C's revenue

Property 2 Admin (Hotel B)
  ├─ Can see: Rooms, Bookings, Guests, Staff
  └─ Cannot see: Hotel A's data, Hotel C's revenue

Super Admin
  ├─ Can see: ALL properties, ALL bookings, ALL guests
  └─ Can manage: Everything system-wide
```

---

## 💡 WHY TWO ROLES?

### Without Super Admin:
- Anyone could create fake properties ❌
- No quality control ❌
- Platform gets abused ❌
- Competitors infiltrate ❌

### With Super Admin:
- Only verified businesses can access ✅
- Platform maintains quality ✅
- System stays secure ✅
- Professional environment ✅

### Without Property Admin:
- Super Admin too busy managing daily operations ❌
- Owner cannot manage their own property ❌
- System becomes bottleneck ❌

### With Property Admin:
- Owner has full control of their property ✅
- Super Admin focuses on platform growth ✅
- Scalable system ✅

---

## 📞 SUPPORT STRUCTURE

### If Property Admin has questions:
- "How do I add a room?" → Check Property Admin Guide
- "How do I accept bookings?" → Check Dashboard Tutorial

### If Super Admin has questions:
- "How do I approve users?" → Check Super Admin Guide
- "What is the system status?" → Check System Reports

### If anything doesn't work:
- Property Admin → Contact Super Admin
- Super Admin → Contact Technical Support

---

## ✅ SUMMARY

| Role | Main Job | Access | Manages |
|------|----------|--------|---------|
| **Super Admin** | Approve users & oversee platform | Entire system | System-wide decisions |
| **Property Admin** | Manage daily operations | Own property only | Rooms, bookings, guests, revenue |

**Think of it like:**
- **Super Admin** = Hotel Chain Manager (oversees all hotels)
- **Property Admin** = Individual Hotel Manager (runs one hotel)

