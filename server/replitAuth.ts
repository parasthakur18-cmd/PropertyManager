import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: true,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
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
  const adminEmails = ['paras.thakur18@gmail.com', 'thepahadistays@gmail.com'];
  const isAdmin = adminEmails.includes(claims["email"]);
  
  if (existingUser) {
    // User exists - update profile info but preserve role unless they're an admin email
    const updatedUser = await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
      role: isAdmin ? 'admin' : existingUser.role, // Preserve existing role unless admin email
    });
    
    // If admin user has no assigned properties, auto-assign all properties
    // Only for actual admin role, not for staff/manager
    if (updatedUser.role === 'admin' && (!updatedUser.assignedPropertyIds || updatedUser.assignedPropertyIds.length === 0)) {
      const allProperties = await storage.getAllProperties();
      const propertyIds = allProperties.map((p: any) => p.id);
      if (propertyIds.length > 0) {
        await storage.updateUserRole(claims["sub"], 'admin', propertyIds);
      }
    }
  } else {
    // New user via Google OAuth - requires Super Admin approval
    const allUsers = await storage.getAllUsers();
    const isFirstUser = allUsers.length === 0;
    
    // Import db for direct insert with verificationStatus
    const { db } = await import("./db");
    const { users } = await import("@shared/schema");
    
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
    
    // If new admin user, auto-assign all properties
    if (shouldAutoApprove && newUser.role === 'admin') {
      const allProperties = await storage.getAllProperties();
      const propertyIds = allProperties.map((p: any) => p.id);
      if (propertyIds.length > 0) {
        await storage.updateUserRole(claims["sub"], 'admin', propertyIds);
      }
    }
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

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

  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) console.error("Logout error:", err);
      
      // Destroy the session
      if (req.session) {
        req.session.destroy((sessionErr) => {
          if (sessionErr) console.error("Session destroy error:", sessionErr);
          
          // Clear session cookies
          res.clearCookie("connect.sid", { path: "/" });
          res.clearCookie("session", { path: "/" });
          
          // Redirect to home (forces fresh login)
          res.redirect("/");
        });
      } else {
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
    (req as any).user.id = (req.session as any).userId;
    (req as any).user.isEmailAuth = true;
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
