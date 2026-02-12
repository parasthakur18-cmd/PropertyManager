import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

// IP Geolocation helper - uses free ip-api.com service
async function getLocationFromIp(ip: string): Promise<{ city: string; state: string; country: string } | null> {
  try {
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return null;
    }
    const cleanIp = ip.replace(/^::ffff:/, '');
    const response = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,regionName,city`, {
      signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.status !== 'success') return null;
    return { city: data.city || '', state: data.regionName || '', country: data.country || '' };
  } catch {
    return null;
  }
}

async function updateUserLocationFromIp(userId: string, ipAddress: string) {
  try {
    const location = await getLocationFromIp(ipAddress);
    if (location && (location.city || location.state || location.country)) {
      await db.update(users)
        .set({
          city: location.city || null,
          state: location.state || null,
          country: location.country || null,
          lastLoginIp: ipAddress.substring(0, 45),
          lastLoginAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      console.log(`[GEO] Updated location for user ${userId}: ${location.city}, ${location.state}, ${location.country}`);
    }
  } catch {
    // Non-blocking, ignore errors
  }
}


export function getSession() {
  const sessionTtl = 30 * 24 * 60 * 60 * 1000; // 30 days for longer sessions
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl / 1000, // connect-pg-simple expects seconds, not milliseconds
    tableName: "sessions",
    pruneSessionInterval: 60 * 15, // Prune expired sessions every 15 minutes
  });
  
  // Replit deployments always use HTTPS
  // For VPS without HTTPS, we need to allow HTTP cookies
  const isProduction = process.env.REPLIT_DEPLOYMENT === '1' || process.env.NODE_ENV === 'production';
  const isReplit = process.env.REPLIT_DEPLOYMENT === '1';
  // On VPS without HTTPS, we can't use secure cookies
  // Only use secure cookies if explicitly on Replit (which has HTTPS) or if HTTPS is configured
  const useSecureCookies = isReplit || process.env.USE_SECURE_COOKIES === 'true';
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false, // Don't save session if not modified (recommended for connect-pg-simple)
    saveUninitialized: false, // Don't create session until something is stored
    rolling: true, // Reset session expiration on each request (keeps active users logged in)
    name: 'hostezee.sid', // Custom cookie name to avoid conflicts
    proxy: true, // Trust the reverse proxy (required for Replit deployments)
    cookie: {
      httpOnly: true,
      secure: useSecureCookies, // Only use secure cookies on Replit (HTTPS) or if explicitly enabled
      sameSite: useSecureCookies ? 'none' : 'lax', // 'none' requires HTTPS, use 'lax' for HTTP
      path: '/',
      maxAge: sessionTtl,
    },
  });
}

async function upsertUser(
  claims: any,
) {
  // Check if user already exists
  const existingUser = await storage.getUser(claims["sub"]);
  
  // Owner emails always get admin (preserve admin status on re-login)
  // NOTE: admin@hostezee.in is NOT included - super-admin is seeded separately and should never be downgraded
  const adminEmails = ['paras.thakur18@gmail.com', 'thepahadistays@gmail.com'];
  const isAdmin = adminEmails.includes(claims["email"]);
  
  if (existingUser) {
    // User exists - update profile info but preserve role unless they're an admin email
    // Admin emails are automatically verified, super-admin is NEVER downgraded
    const { db } = await import("./db");
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    
    // Preserve super-admin role - never downgrade to admin
    const isSuperAdmin = existingUser.role === 'super-admin';
    const newRole = isSuperAdmin ? 'super-admin' : (isAdmin ? 'admin' : existingUser.role);
    
    const updateData: any = {
      firstName: claims["first_name"] || existingUser.firstName,
      lastName: claims["last_name"] || existingUser.lastName,
      profileImageUrl: claims["profile_image_url"] || existingUser.profileImageUrl,
      role: newRole,
      updatedAt: new Date(),
    };
    
    // Auto-verify admin emails
    if (isAdmin) {
      updateData.verificationStatus = 'verified';
    }
    
    await db.update(users).set(updateData).where(eq(users.id, claims["sub"]));
    
    // Note: Admin users only see properties they're explicitly assigned to
    // Super Admin has unlimited access via tenantIsolation.ts
  } else {
    // New user via Google OAuth - requires Super Admin approval
    // Import db for direct insert with verificationStatus
    const { db } = await import("./db");
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    
    // First check if a user with this email already exists (could have been created via different auth method)
    const [existingByEmail] = await db.select().from(users).where(eq(users.email, claims["email"])).limit(1);
    
    if (existingByEmail) {
      // User with this email exists - update their ID to the new OIDC ID and update profile
      console.log(`[GOOGLE-AUTH] Email ${claims["email"]} exists with different ID - updating to new OIDC ID`);
      
      // Preserve super-admin role - never downgrade
      const existingIsSuperAdmin = existingByEmail.role === 'super-admin';
      const roleToSet = existingIsSuperAdmin ? 'super-admin' : (isAdmin ? 'admin' : existingByEmail.role);
      
      const [updated] = await db
        .update(users)
        .set({
          id: claims["sub"],
          firstName: claims["first_name"] || existingByEmail.firstName,
          lastName: claims["last_name"] || existingByEmail.lastName,
          profileImageUrl: claims["profile_image_url"] || existingByEmail.profileImageUrl,
          role: roleToSet,
          signupMethod: 'google',
          updatedAt: new Date(),
        })
        .where(eq(users.email, claims["email"]))
        .returning();
      
      // Note: Admin users only see properties they're explicitly assigned to
      return;
    }
    
    const allUsers = await storage.getAllUsers();
    const isFirstUser = allUsers.length === 0;
    
    // New users get "pending" status unless they're the first user or admin email
    const shouldAutoApprove = isFirstUser || isAdmin;
    
    const [newUser] = await db.insert(users).values({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"] || "",
      lastName: claims["last_name"] || "",
      profileImageUrl: claims["profile_image_url"],
      role: shouldAutoApprove ? 'admin' : 'staff',
      status: 'active',
      verificationStatus: shouldAutoApprove ? 'verified' : 'pending', // KEY: Pending unless auto-approved
      signupMethod: 'google',
    }).returning();
    
    console.log(`[GOOGLE-AUTH] New user created: ${claims["email"]} - Status: ${shouldAutoApprove ? 'auto-approved' : 'pending approval'}`);
    
    // Note: Admin users only see properties they're explicitly assigned to
    // Super Admin has unlimited access via tenantIsolation.ts
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  // Always setup session middleware (needed for email/password auth on VPS)
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Setup logout route (needed for both Replit and email/password auth)
  // This must be registered before the early return
  // Support both GET and POST methods
  const handleLogout = async (req: Express.Request, res: Express.Response) => {
    // Capture user info before destroying session for activity logging
    const user = req.user as any;
    const userId = user?.claims?.sub || user?.id || (req.session as any)?.userId;
    let userEmail: string | null = null;
    let userName: string | null = null;
    
    if (userId) {
      try {
        const dbUser = await storage.getUser(userId);
        if (dbUser) {
          userEmail = dbUser.email;
          userName = `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim() || dbUser.email;
        }
      } catch (e) {
        console.error('[LOGOUT] Error fetching user for logging:', e);
      }
    }
    
    // Log logout activity
    try {
      if (userId) {
        await storage.createActivityLog({
          userId,
          userEmail,
          userName,
          action: 'logout',
          category: 'auth',
          details: { method: user?.isEmailAuth ? 'email' : 'oauth' },
          ipAddress: (req.ip || req.socket.remoteAddress || '').substring(0, 45),
          userAgent: (req.get('User-Agent') || '').substring(0, 500),
        });
      }
    } catch (logErr) {
      console.error('[ACTIVITY] Error logging logout:', logErr);
    }
    
    // For email/password auth, we need to manually destroy the session
    if ((req.session as any)?.userId && (req.session as any)?.isEmailAuth) {
      // Email/password auth - destroy session directly
      if (req.session) {
        req.session.destroy((sessionErr) => {
          if (sessionErr) console.error("Session destroy error:", sessionErr);
          
          // Clear session cookies
          res.clearCookie("hostezee.sid", { path: "/" });
          res.clearCookie("connect.sid", { path: "/" });
          res.clearCookie("session", { path: "/" });
          
          // Redirect to home (forces fresh login)
          res.redirect("/");
        });
      } else {
        res.clearCookie("hostezee.sid", { path: "/" });
        res.clearCookie("connect.sid", { path: "/" });
        res.redirect("/");
      }
    } else {
      // OAuth logout (Replit auth)
      req.logout((err) => {
        if (err) console.error("Logout error:", err);
        
        // Destroy the session
        if (req.session) {
          req.session.destroy((sessionErr) => {
            if (sessionErr) console.error("Session destroy error:", sessionErr);
            
            // Clear session cookies
            res.clearCookie("hostezee.sid", { path: "/" });
            res.clearCookie("connect.sid", { path: "/" });
            res.clearCookie("session", { path: "/" });
            
            // Redirect to home (forces fresh login)
            res.redirect("/");
          });
        } else {
          res.clearCookie("hostezee.sid", { path: "/" });
          res.clearCookie("connect.sid", { path: "/" });
          res.redirect("/");
        }
      });
    }
  };
  
  app.get("/api/logout", handleLogout);
  app.post("/api/logout", handleLogout);

  // Setup Google OAuth if credentials are available
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const domains = process.env.REPLIT_DOMAINS?.split(",") || [];
    const primaryDomain = domains[0] || `localhost:5000`;
    const protocol = domains.length > 0 ? 'https' : 'http';
    const baseUrl = process.env.APP_BASE_URL || `${protocol}://${primaryDomain}`;
    const callbackURL = `${baseUrl}/api/auth/google/callback`;
    
    console.log(`[GOOGLE-AUTH] Setting up Google OAuth with callback: ${callbackURL}`);
    
    passport.use('google', new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL,
      scope: ['profile', 'email'],
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found in Google profile'));
        }
        
        const googleId = `google-${profile.id}`;
        const firstName = profile.name?.givenName || '';
        const lastName = profile.name?.familyName || '';
        const profileImage = profile.photos?.[0]?.value || null;
        
        const claims = {
          sub: googleId,
          email,
          first_name: firstName,
          last_name: lastName,
          profile_image_url: profileImage,
        };
        
        await upsertUser(claims);
        
        const dbUser = await storage.getUser(googleId);
        if (!dbUser) {
          const [existingByEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);
          if (existingByEmail) {
            return done(null, { 
              claims: { sub: existingByEmail.id, email },
              isGoogleAuth: true 
            });
          }
          return done(new Error('Failed to create user'));
        }
        
        return done(null, { 
          claims: { sub: dbUser.id, email: dbUser.email },
          isGoogleAuth: true 
        });
      } catch (error) {
        console.error('[GOOGLE-AUTH] Error:', error);
        return done(error as Error);
      }
    }));
    
    app.get('/api/auth/google', passport.authenticate('google', {
      scope: ['profile', 'email'],
      prompt: 'select_account',
    }));
    
    app.get('/api/auth/google/callback', passport.authenticate('google', {
      failureRedirect: '/login?error=google_auth_failed',
    }), async (req, res) => {
      try {
        const user = req.user as any;
        const userId = user?.claims?.sub;
        
        if (userId && req.sessionID) {
          const userAgent = req.get('User-Agent') || '';
          const ipAddress = req.ip || req.socket.remoteAddress || '';
          
          let browser = 'Unknown';
          let os = 'Unknown';
          if (userAgent.includes('Chrome')) browser = 'Chrome';
          else if (userAgent.includes('Firefox')) browser = 'Firefox';
          else if (userAgent.includes('Safari')) browser = 'Safari';
          else if (userAgent.includes('Edge')) browser = 'Edge';
          
          if (userAgent.includes('Windows')) os = 'Windows';
          else if (userAgent.includes('Mac')) os = 'macOS';
          else if (userAgent.includes('Linux')) os = 'Linux';
          else if (userAgent.includes('Android')) os = 'Android';
          else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
          
          await storage.createUserSession({
            userId,
            sessionToken: req.sessionID,
            deviceInfo: userAgent.substring(0, 255),
            browser,
            os,
            ipAddress: ipAddress.substring(0, 45),
            isActive: true,
          });
          
          const dbUser = await storage.getUser(userId);
          if (dbUser) {
            await storage.createActivityLog({
              userId,
              userEmail: dbUser.email,
              userName: `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim() || dbUser.email,
              action: 'login',
              category: 'auth',
              details: { method: 'google', role: dbUser.role },
              ipAddress: ipAddress.substring(0, 45),
              userAgent: userAgent.substring(0, 500),
            });
            
            updateUserLocationFromIp(userId, ipAddress).catch(() => {});
          }
          
          console.log(`[GOOGLE-AUTH] Login successful for user ${userId}`);
        }
        
        res.redirect('/');
      } catch (error) {
        console.error('[GOOGLE-AUTH] Callback error:', error);
        res.redirect('/');
      }
    });
    
    console.log('[GOOGLE-AUTH] Google OAuth routes registered');
  } else {
    console.log('[GOOGLE-AUTH] Google OAuth not configured (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)');
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  console.log('[AUTH] Using Google OAuth + email/password authentication');
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Handle email/password authentication (session-based)
  if ((req.session as any).userId && (req.session as any).isEmailAuth) {
    // Ensure req.user is set for email-based auth so downstream code can access it
    if (!req.user) {
      (req as any).user = {};
    }
    const userId = (req.session as any).userId;
    (req as any).user.id = userId;
    (req as any).user.isEmailAuth = true;
    
    // Load user role and properties from database for permission checks
    try {
      const dbUser = await storage.getUser(userId);
      if (dbUser) {
        // Check if user is deactivated (inactive or suspended)
        if (dbUser.status === 'inactive' || dbUser.status === 'suspended') {
          console.log(`[isAuthenticated] Blocked deactivated user: ${userId}`);
          // Don't destroy session - let /api/auth/user detect deactivation and return proper response
          return res.status(403).json({ 
            message: "Your account has been deactivated. Please contact your administrator.",
            isDeactivated: true
          });
        }
        (req as any).user.role = dbUser.role;
        (req as any).user.assignedPropertyIds = dbUser.assignedPropertyIds;
      }
    } catch (err) {
      console.error("[isAuthenticated] Error loading email auth user from DB:", err);
    }
    return next();
  }

  // Handle Google OAuth authentication
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    const user = req.user as any;
    if (user.isGoogleAuth && user.claims?.sub) {
      const userId = user.claims.sub;
      try {
        const dbUser = await storage.getUser(userId);
        if (dbUser) {
          if (dbUser.status === 'inactive' || dbUser.status === 'suspended') {
            console.log(`[isAuthenticated] Blocked deactivated Google user: ${userId}`);
            return res.status(403).json({ 
              message: "Your account has been deactivated. Please contact your administrator.",
              isDeactivated: true
            });
          }
          (req as any).user.id = dbUser.id;
          (req as any).user.role = dbUser.role;
          (req as any).user.assignedPropertyIds = dbUser.assignedPropertyIds;
          return next();
        }
      } catch (err) {
        console.error("[isAuthenticated] Error loading Google auth user from DB:", err);
      }
      return res.status(401).json({ message: "Unauthorized" });
    }
  }

  // No valid auth found
  return res.status(401).json({ message: "Unauthorized" });
};
