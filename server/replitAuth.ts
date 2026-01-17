import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
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

// Only require REPLIT_DOMAINS if actually using Replit auth
// On VPS, we use local email/password auth instead
// IMPORTANT: Don't throw error if DISABLE_REPLIT_AUTH is true (allows VPS deployment)
const isReplitAuthDisabled = process.env.DISABLE_REPLIT_AUTH === 'true';
const isUsingReplitAuth = !isReplitAuthDisabled && 
                          process.env.REPLIT_DOMAINS && 
                          process.env.REPL_ID;

// Only throw error if we're trying to use Replit auth but REPLIT_DOMAINS is missing
// If DISABLE_REPLIT_AUTH is true, skip this check entirely
if (!isReplitAuthDisabled && !process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided. Set DISABLE_REPLIT_AUTH=true for VPS deployment without Replit.");
}

// Only initialize OIDC config if actually using Replit auth
const getOidcConfig = memoize(
  async () => {
    if (!process.env.REPL_ID) {
      throw new Error("REPL_ID is required for Replit OIDC authentication");
    }
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID
    );
  },
  { maxAge: 3600 * 1000 }
);

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
  const isProduction = process.env.REPLIT_DEPLOYMENT === '1' || process.env.NODE_ENV === 'production';
  
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
      secure: isProduction, // Use secure cookies in production (Replit uses HTTPS)
      sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-site in production with HTTPS
      path: '/',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
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

  // Only setup Replit OIDC auth if on Replit and not disabled
  // On VPS, skip Replit auth and use local email/password auth only
  const isUsingReplitAuth = process.env.DISABLE_REPLIT_AUTH !== 'true' && 
                            process.env.REPLIT_DOMAINS && 
                            process.env.REPL_ID;

  if (!isUsingReplitAuth) {
    console.log('[AUTH] Using local email/password authentication (Replit auth disabled)');
    // Setup basic passport serialization for local auth
    passport.serializeUser((user: Express.User, cb) => cb(null, user));
    passport.deserializeUser((user: Express.User, cb) => cb(null, user));
    
    // Redirect /api/login to email login page (since Replit OIDC is disabled)
    app.get("/api/login", (req, res) => {
      res.status(400).json({ 
        message: "Replit OIDC authentication is disabled. Please use /api/auth/email-login for email/password authentication.",
        useEmailLogin: true
      });
    });
    
    // Disable /api/callback since Replit auth is not available
    app.get("/api/callback", (req, res) => {
      res.status(400).json({ 
        message: "Replit OIDC authentication is disabled. Please use /api/auth/email-login instead.",
        useEmailLogin: true
      });
    });
    
    return; // Exit early - no Replit OIDC setup needed
  }

  console.log('[AUTH] Setting up Replit OIDC authentication');
  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  const domains = process.env.REPLIT_DOMAINS!.split(",");
  const primaryDomain = domains[0]; // Use first domain as primary
  
  for (const domain of domains) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  // Also register localhost for development
  const strategy = new Strategy(
    {
      name: `replitauth:localhost`,
      config,
      scope: "openid email profile offline_access",
      callbackURL: `http://localhost:5000/api/callback`,
    },
    verify,
  );
  passport.use(strategy);

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Only register /api/login route if using Replit auth
  // On VPS, login is handled by /api/auth/email-login instead
  app.get("/api/login", (req, res, next) => {
    const strategyName = req.hostname === 'localhost' 
      ? `replitauth:localhost`
      : `replitauth:${req.hostname}`;
    passport.authenticate(strategyName, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    const strategyName = req.hostname === 'localhost'
      ? `replitauth:localhost`
      : `replitauth:${req.hostname}`;
    passport.authenticate(strategyName, async (err: any, user: any) => {
      if (err || !user) {
        return res.redirect("/api/login");
      }
      
      req.logIn(user, async (loginErr) => {
        if (loginErr) {
          return res.redirect("/api/login");
        }
        
        // Create session tracking record
        try {
          const userId = user.claims?.sub;
          if (userId && req.sessionID) {
            const userAgent = req.get('User-Agent') || '';
            const ipAddress = req.ip || req.socket.remoteAddress || '';
            
            // Parse browser and OS from user agent
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
            console.log(`[SESSION] Created session for user ${userId}`);
            
            // Fetch user from database for activity logging
            const dbUser = await storage.getUser(userId);
            if (dbUser) {
              // Log OAuth login activity
              await storage.createActivityLog({
                userId,
                userEmail: dbUser.email,
                userName: `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim() || dbUser.email,
                action: 'login',
                category: 'auth',
                details: { method: 'oauth', role: dbUser.role },
                ipAddress: ipAddress.substring(0, 45),
                userAgent: userAgent.substring(0, 500),
              });
            }
            
            // Capture geographic location from IP (non-blocking)
            updateUserLocationFromIp(userId, ipAddress).catch(() => {});
          }
        } catch (sessionErr) {
          console.error('[SESSION] Error creating session:', sessionErr);
        }
        
        return res.redirect("/");
      });
    })(req, res, next);
  });

  // Auto-redirect after authentication based on role
  app.get("/", async (req, res, next) => {
    // If user just authenticated via Replit Auth, redirect to appropriate dashboard
    if (req.isAuthenticated && req.user) {
      const user = req.user as any;
      const userId = user.claims?.sub;
      
      if (userId) {
        try {
          const dbUser = await storage.getUser(userId);
          if (dbUser?.role === 'super-admin') {
            return res.redirect("/super-admin");
          }
        } catch (err) {
          console.error("Error checking user role:", err);
        }
      }
    }
    
    // If user authenticated via email/password (session-based), also redirect to super-admin
    const emailAuthUserId = (req.session as any)?.userId;
    if (emailAuthUserId) {
      return res.redirect("/super-admin");
    }
    
    next();
  });

  app.get("/api/logout", async (req, res) => {
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
  });
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

  // Handle Replit Auth (OIDC-based)
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as any;
  
  // If no claims or expires_at, user not properly authenticated
  if (!user.claims || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    // Load user role from database for permission checks
    try {
      const userId = user.claims?.sub;
      if (userId) {
        const dbUser = await storage.getUser(userId);
        if (dbUser) {
          // Check if user is deactivated (inactive or suspended)
          if (dbUser.status === 'inactive' || dbUser.status === 'suspended') {
            console.log(`[isAuthenticated] Blocked deactivated OIDC user: ${userId}`);
            // Don't destroy session - let /api/auth/user detect deactivation and return proper response
            return res.status(403).json({ 
              message: "Your account has been deactivated. Please contact your administrator.",
              isDeactivated: true
            });
          }
          user.id = dbUser.id;
          user.role = dbUser.role;
          user.assignedPropertyIds = dbUser.assignedPropertyIds;
        }
      }
    } catch (err) {
      console.error("[isAuthenticated] Error loading user from DB:", err);
    }
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    // Skip DB user loading - just continue with session data
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
