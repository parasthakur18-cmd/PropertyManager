import { ArrowRight, Database, Cloud, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Architecture() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-serif mb-2">PMS Architecture</h1>
        <p className="text-muted-foreground">System connections and data flow diagram</p>
      </div>

      {/* System Overview */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            System Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
              <pre>{`Frontend (React)
    ↓ TanStack Query + Axios
Backend (Express.js)
    ↓ SQL Queries
Database (PostgreSQL/Neon)
    ↓
External Services (RazorPay, Authkey, OpenAI)`}</pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Frontend Components */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Frontend Pages & Components</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Dashboard & Operations</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>✓ Dashboard (KPIs, Charts)</li>
                <li>✓ Bookings Management</li>
                <li>✓ Active Bookings</li>
                <li>✓ Room Calendar</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Guests & Finance</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>✓ Guests (profiles + ID proofs)</li>
                <li>✓ Billing & Bills</li>
                <li>✓ Payments (RazorPay)</li>
                <li>✓ Expenses & Analytics</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Admin & Support</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>✓ Users Management</li>
                <li>✓ Enquiries</li>
                <li>✓ Settings & Audit Logs</li>
                <li>✓ Notifications Center</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Backend API Routes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Badge variant="outline">/api/dashboard</Badge>
              <p className="text-sm text-muted-foreground">KPI stats & analytics</p>
            </div>
            <div className="space-y-2">
              <Badge variant="outline">/api/bookings</Badge>
              <p className="text-sm text-muted-foreground">CRUD booking operations</p>
            </div>
            <div className="space-y-2">
              <Badge variant="outline">/api/guests</Badge>
              <p className="text-sm text-muted-foreground">Guest profiles & ID proofs</p>
            </div>
            <div className="space-y-2">
              <Badge variant="outline">/api/rooms</Badge>
              <p className="text-sm text-muted-foreground">Room management</p>
            </div>
            <div className="space-y-2">
              <Badge variant="outline">/api/bills</Badge>
              <p className="text-sm text-muted-foreground">Bill generation & tracking</p>
            </div>
            <div className="space-y-2">
              <Badge variant="outline">/api/payments</Badge>
              <p className="text-sm text-muted-foreground">RazorPay integration</p>
            </div>
            <div className="space-y-2">
              <Badge variant="outline">/api/orders</Badge>
              <p className="text-sm text-muted-foreground">Restaurant operations</p>
            </div>
            <div className="space-y-2">
              <Badge variant="outline">/api/notifications</Badge>
              <p className="text-sm text-muted-foreground">Real-time updates</p>
            </div>
            <div className="space-y-2">
              <Badge variant="outline">/api/audit-logs</Badge>
              <p className="text-sm text-muted-foreground">Activity tracking</p>
            </div>
            <div className="space-y-2">
              <Badge variant="outline">/api/users</Badge>
              <p className="text-sm text-muted-foreground">User management</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Tables */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Tables (PostgreSQL)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "guests", fields: ["id", "fullName", "email", "phone", "idProof*"] },
              { name: "bookings", fields: ["id", "roomId", "guestId", "checkIn", "checkOut", "totalAmt"] },
              { name: "rooms", fields: ["id", "roomNum", "type", "rate", "status", "features"] },
              { name: "bills", fields: ["id", "bookingId", "guestId", "items", "total", "status"] },
              { name: "orders", fields: ["id", "roomId", "bookingId", "items", "status", "time"] },
              { name: "users", fields: ["id", "email", "role", "password", "properties"] },
              { name: "notifications", fields: ["id", "userId", "message", "type", "read", "time"] },
              { name: "audit_logs", fields: ["id", "action", "user", "timestamp", "changes", "status"] },
              { name: "payments", fields: ["id", "bookingId", "amount", "status", "method", "time"] },
            ].map((table) => (
              <div key={table.name} className="border rounded-lg p-3">
                <p className="font-mono font-semibold text-sm mb-2 text-primary">{table.name}</p>
                <ul className="text-xs space-y-1">
                  {table.fields.map((field) => (
                    <li key={field} className="text-muted-foreground">
                      • {field}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Flow Examples */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Key Data Flows</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold mb-3">1. Guest Management Flow</h4>
            <div className="bg-muted p-4 rounded-lg text-sm space-y-2 font-mono">
              <div>User clicks "Add Guest"</div>
              <div className="ml-4 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" /> Form Dialog Opens (Zod validation)
              </div>
              <div className="ml-4 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" /> User captures/uploads ID proof
              </div>
              <div className="ml-4 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" /> Submit → POST /api/guests
              </div>
              <div className="ml-4 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" /> Backend validates → INSERT guests table
              </div>
              <div className="ml-4 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" /> TanStack Query invalidates cache
              </div>
              <div className="ml-4 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" /> Guest appears in list
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">2. Auto-Checkout at 4 PM</h4>
            <div className="bg-muted p-4 rounded-lg text-sm space-y-2 font-mono">
              <div>Frontend monitors time → 4 PM trigger</div>
              <div className="ml-4 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" /> POST /api/bookings/force-auto-checkout
              </div>
              <div className="ml-4 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" /> Backend gets overdue bookings
              </div>
              <div className="ml-4 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" /> Auto-generate bills + Update status
              </div>
              <div className="ml-4 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" /> Record audit log + Notify user
              </div>
              <div className="ml-4 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" /> Dashboard shows notification
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">3. Payment Integration (RazorPay)</h4>
            <div className="bg-muted p-4 rounded-lg text-sm space-y-2 font-mono">
              <div>User generates payment link</div>
              <div className="ml-4 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" /> POST /api/payments → RazorPay API
              </div>
              <div className="ml-4 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" /> Link sent via WhatsApp (Authkey.io)
              </div>
              <div className="ml-4 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" /> Customer pays
              </div>
              <div className="ml-4 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" /> RazorPay webhook triggered
              </div>
              <div className="ml-4 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" /> Backend: Update bill status → PAID
              </div>
              <div className="ml-4 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" /> Dashboard: Real-time payment notification
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* External Services */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            External Services Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Replit Auth</h4>
              <p className="text-sm text-muted-foreground">User login & session management (OIDC)</p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">RazorPay</h4>
              <p className="text-sm text-muted-foreground">Payment processing & payment links with webhooks</p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Authkey.io</h4>
              <p className="text-sm text-muted-foreground">WhatsApp & SMS notifications</p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">OpenAI (GPT-4o-mini)</h4>
              <p className="text-sm text-muted-foreground">Chatbot assistant via Replit AI</p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Replit Object Storage</h4>
              <p className="text-sm text-muted-foreground">Store & retrieve ID proofs and documents</p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Neon PostgreSQL</h4>
              <p className="text-sm text-muted-foreground">Primary database (serverless)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tech Stack */}
      <Card>
        <CardHeader>
          <CardTitle>Technology Stack</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Frontend</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• React 18 + TypeScript</li>
                <li>• Vite (build)</li>
                <li>• TanStack Query (data)</li>
                <li>• Wouter (routing)</li>
                <li>• React Hook Form + Zod</li>
                <li>• Tailwind CSS + shadcn/ui</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Backend</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Express.js + Node.js</li>
                <li>• TypeScript</li>
                <li>• Drizzle ORM</li>
                <li>• Passport.js (auth)</li>
                <li>• RESTful API design</li>
                <li>• Error handling</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Database</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• PostgreSQL (Neon)</li>
                <li>• Drizzle ORM</li>
                <li>• Zod schemas</li>
                <li>• Transaction mgmt</li>
                <li>• Referential integrity</li>
                <li>• Serial ID columns</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
