# Super Admin Login - Step by Step Guide

## 🔐 How to Login to Super Admin Dashboard

### **Step 1: Open the App**
Go to:
```
http://localhost:5000
```

You should see the **login page** or **dashboard** (if already logged in).

---

### **Step 2: Login (If Not Already Logged In)**

If you see a **login page**:

1. Click **"Login with Replit"** or **"Sign in"** button
2. You'll be redirected to **Replit Auth**
3. Enter your **Replit email and password**
4. Click **"Login"**
5. You'll be redirected back to the app dashboard

---

### **Step 3: Access Super Admin Dashboard**

Once you're logged in, go directly to:
```
http://localhost:5000/super-admin
```

**OR**

1. Look for **Settings** or **Menu** in the sidebar
2. Find **"Super Admin"** option
3. Click it

---

### **Step 4: You Should See**

A dashboard with these tabs:

**📊 Users Management Tab:**
- List of all users
- Buttons: Suspend, Activate, Login As User
- Search bar to find users

**🏨 Properties Overview Tab:**
- List of all properties
- Property details (name, location, owner)

**📈 System Reports Tab:**
- Total users count
- Total properties count
- Total bookings
- Total revenue

---

## ⚠️ **Important: Super Admin Role**

**You can ONLY access Super Admin if:**
✅ You are **logged in**
✅ Your user has **"super-admin"** role

**If you can't see Super Admin:**
- Your user might have a different role (admin, staff, manager, kitchen)
- Contact the system administrator to upgrade your role

---

## 🧪 **Quick Test - Am I Logged In?**

Check the **top-right corner** of the dashboard:
- You should see your **email/username**
- You should see a **logout button**

If you see these → **You're logged in!** ✅

---

## 📱 **Login Troubleshooting**

### **Problem: "Login with Replit" button not working**
**Solution:**
1. Make sure you have a Replit account
2. Go to https://replit.com and sign up if needed
3. Try logging in again

### **Problem: I see "Unauthorized" or "Access Denied"**
**Solution:**
- Your user role is not "super-admin"
- Ask the system administrator to upgrade your role
- OR create a new user with super-admin role

### **Problem: I'm logged in but can't find Super Admin**
**Solution:**
1. Check the **sidebar menu**
2. OR go directly to: `http://localhost:5000/super-admin`
3. If still not visible, you might not have super-admin role

### **Problem: Page is blank or showing error**
**Solution:**
1. Open **browser console** (F12)
2. Look for red error messages
3. Try refreshing the page
4. Try logging out and logging back in

---

## ✅ **You're Ready When You See:**

```
┌─────────────────────────────────────┐
│  Super Admin Dashboard              │
├─────────────────────────────────────┤
│ [Users Management] [Properties]...  │
├─────────────────────────────────────┤
│                                     │
│  ID | Email | Role | Status | ... │
│  1  | admin | super-admin | active │
│  2  | staff | staff | active | ... │
│                                     │
└─────────────────────────────────────┘
```

---

## 🎯 **Summary**

1. **Go to**: `http://localhost:5000`
2. **Login** with your Replit credentials
3. **Go to**: `http://localhost:5000/super-admin`
4. **Done!** You're in Super Admin Dashboard ✅

---

## 📞 **Still Confused?**

Try this:
1. Open your browser
2. Go to `http://localhost:5000/super-admin`
3. If you see a login page → Login first
4. You'll then see the Super Admin dashboard

**It's that simple!** 🎉
