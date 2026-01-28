import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Circle, Zap, TrendingUp, Users, Lock, Smartphone, Brain } from "lucide-react";

export default function AdvancedFeatures() {
  const features = [
    {
      category: "Channel Management",
      icon: Zap,
      description: "Multi-channel distribution and real-time sync",
      items: [
        { title: "OTA Connections", desc: "Airbnb, Booking.com, Expedia, MakeMyTrip, Trivago", status: "future" },
        { title: "Automatic Sync", desc: "Real-time availability & pricing updates across channels", status: "future" },
        { title: "Overbooking Prevention", desc: "Prevents double-booking across all channels", status: "future" },
      ]
    },
    {
      category: "Revenue Management",
      icon: TrendingUp,
      description: "Dynamic pricing and revenue optimization",
      items: [
        { title: "AI-Based Pricing", desc: "Auto-adjust rates based on demand, competition, seasonality", status: "future" },
        { title: "Group Discounts", desc: "Automatic discounts for multi-room bookings", status: "future" },
        { title: "Last-Minute Deals", desc: "Lower prices for short-notice bookings", status: "future" },
        { title: "Seasonal Pricing", desc: "Different rates for peak/shoulder/low seasons", status: "future" },
      ]
    },
    {
      category: "Guest Management",
      icon: Users,
      description: "Comprehensive CRM and guest experience",
      items: [
        { title: "Guest Profiles", desc: "Track all stays, spending, preferences, special requests", status: "building" },
        { title: "Loyalty Program", desc: "Reward repeat guests with points/discounts", status: "future" },
        { title: "Guest Segmentation", desc: "VIP guests, regular guests, one-time visitors", status: "future" },
        { title: "Post-Stay Surveys", desc: "Auto-send feedback requests after checkout", status: "future" },
      ]
    },
    {
      category: "Analytics & BI",
      icon: TrendingUp,
      description: "Advanced reporting and business intelligence",
      items: [
        { title: "KPI Dashboard", desc: "Occupancy, ADR, RevPAR, GOPPAR in real-time", status: "building" },
        { title: "Predictive Analytics", desc: "Forecast demand & occupancy trends", status: "future" },
        { title: "Guest Segmentation Reports", desc: "Analyze which channels bring best guests", status: "future" },
        { title: "Competitor Analysis", desc: "Track local market rates and trends", status: "future" },
      ]
    },
    {
      category: "Housekeeping Ops",
      icon: Smartphone,
      description: "Smart housekeeping and maintenance management",
      items: [
        { title: "Mobile Task Management", desc: "Staff get tasks on mobile phones with priorities", status: "future" },
        { title: "Photo Proof", desc: "Staff submit photos as proof of completion", status: "future" },
        { title: "Inventory Tracking", desc: "Monitor cleaning supplies usage", status: "future" },
        { title: "Staff Performance", desc: "Track individual staff productivity & quality", status: "future" },
      ]
    },
    {
      category: "Payments & Accounting",
      icon: Lock,
      description: "Advanced payment processing and accounting",
      items: [
        { title: "Multiple Payment Methods", desc: "Cards, wallets, transfers, BNPL (Simpl, LazyPay)", status: "building" },
        { title: "Split Payments", desc: "Divide bill across multiple guests", status: "future" },
        { title: "Auto-Reconciliation", desc: "Match payments with bookings automatically", status: "future" },
        { title: "GST Integration", desc: "Automatic GST calculation & ITC tracking", status: "building" },
      ]
    },
    {
      category: "Messaging & Communication",
      icon: Zap,
      description: "Multi-channel guest communication",
      items: [
        { title: "WhatsApp Integration", desc: "Send/receive messages, payment links, check-in codes", status: "future" },
        { title: "SMS Gateway", desc: "Text-based communications", status: "future" },
        { title: "Email Automation", desc: "Trigger emails based on booking events", status: "building" },
        { title: "Chatbots", desc: "AI-powered 24/7 guest support", status: "future" },
      ]
    },
    {
      category: "Guest Experience",
      icon: Users,
      description: "Digital guest journey and self-service",
      items: [
        { title: "Mobile Check-In", desc: "QR code based contactless check-in", status: "building" },
        { title: "Digital Keys", desc: "Use mobile as room key (NFC/Bluetooth)", status: "future" },
        { title: "Guest Portal", desc: "24/7 access to booking, services, requests", status: "building" },
        { title: "Local Recommendations", desc: "Curated guides for restaurants, attractions", status: "future" },
      ]
    },
    {
      category: "Staff Management",
      icon: Users,
      description: "HR and scheduling management",
      items: [
        { title: "Shift Scheduling", desc: "Auto-optimize staff schedules based on occupancy", status: "future" },
        { title: "Attendance Tracking", desc: "Digital clock-in/out", status: "future" },
        { title: "Commission Tracking", desc: "Automated commission calculations", status: "future" },
        { title: "Payroll Integration", desc: "Auto-generate payroll reports", status: "future" },
      ]
    },
    {
      category: "Integrations",
      icon: Zap,
      description: "Pre-built ecosystem of integrations",
      items: [
        { title: "Accounting Software", desc: "QuickBooks, Tally, SAP", status: "future" },
        { title: "Payment Gateways", desc: "Stripe, Square, RazorPay", status: "building" },
        { title: "Smart Devices", desc: "WiFi systems, keyless locks, thermostats", status: "future" },
        { title: "API-First", desc: "REST API for custom integrations", status: "future" },
      ]
    },
    {
      category: "Security & Compliance",
      icon: Lock,
      description: "Enterprise-grade security and regulations",
      items: [
        { title: "PCI-DSS Compliance", desc: "Secure payment data handling", status: "building" },
        { title: "GDPR Compliance", desc: "European guest data protection", status: "building" },
        { title: "End-to-End Encryption", desc: "All sensitive data encrypted", status: "building" },
        { title: "Audit Logs", desc: "Track all actions for compliance", status: "building" },
      ]
    },
    {
      category: "AI & Automation",
      icon: Brain,
      description: "Machine learning powered features",
      items: [
        { title: "Price Optimization", desc: "ML algorithm auto-adjusts prices for max revenue", status: "future" },
        { title: "Demand Forecasting", desc: "Predict busy/slow periods", status: "future" },
        { title: "Churn Prediction", desc: "Identify guests likely to cancel", status: "future" },
        { title: "Revenue Prediction", desc: "Forecast monthly/yearly revenue", status: "future" },
      ]
    },
    {
      category: "Enterprise Features",
      icon: TrendingUp,
      description: "Scaling for multi-property operations",
      items: [
        { title: "Portfolio Dashboard", desc: "Manage 10, 100, or 1000+ properties", status: "building" },
        { title: "Consolidated Reporting", desc: "Cross-property analytics", status: "future" },
        { title: "Bulk Operations", desc: "Updates across multiple properties", status: "future" },
        { title: "Centralized Accounting", desc: "Aggregate financial reports", status: "future" },
      ]
    },
  ];

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === "building") {
      return <Badge className="bg-blue-500">🔨 Building</Badge>;
    }
    if (status === "future") {
      return <Badge variant="outline">🚀 Roadmap</Badge>;
    }
    return <Badge variant="secondary">✓ Ready</Badge>;
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold font-serif mb-2">Advanced PMS Features</h1>
        <p className="text-muted-foreground text-lg">What makes a world-class Property Management System</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="font-semibold">8 Features</p>
              <p className="text-sm text-muted-foreground">Building Now</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Circle className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="font-semibold">40+ Features</p>
              <p className="text-sm text-muted-foreground">On Roadmap</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <p className="font-semibold">15-25%</p>
              <p className="text-sm text-muted-foreground">Revenue Increase</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Categories */}
      <Tabs defaultValue="0" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-4 mb-6 h-auto">
          {features.map((feature, idx) => (
            <TabsTrigger key={idx} value={idx.toString()} className="text-xs sm:text-sm">
              {feature.category}
            </TabsTrigger>
          ))}
        </TabsList>

        {features.map((feature, idx) => (
          <TabsContent key={idx} value={idx.toString()}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <feature.icon className="h-5 w-5 text-primary" />
                  <CardTitle>{feature.category}</CardTitle>
                </div>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {feature.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-semibold">{item.title}</h4>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Comparison Table */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Market Comparison: Hostezee vs Competition</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-semibold">Feature</th>
                <th className="text-center p-2">CloudBeds</th>
                <th className="text-center p-2">Mews</th>
                <th className="text-center p-2">Hostezee</th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: "Multi-Channel Integration", cloudbeds: "✓", mews: "✓", hostezee: "🔄" },
                { feature: "Dynamic Pricing", cloudbeds: "✓", mews: "✓", hostezee: "🔄" },
                { feature: "Guest CRM", cloudbeds: "✓", mews: "✓", hostezee: "✓" },
                { feature: "Payment Processing", cloudbeds: "✓", mews: "✓", hostezee: "✓" },
                { feature: "Mobile Apps", cloudbeds: "✓", mews: "✓", hostezee: "🔄" },
                { feature: "India Compliance (GST/Tax)", cloudbeds: "✗", mews: "✗", hostezee: "✓ Unique" },
                { feature: "Affordability", cloudbeds: "$$", mews: "$$$", hostezee: "$ 50-70% cheaper" },
                { feature: "Ease of Use", cloudbeds: "Good", mews: "Complex", hostezee: "✓ Simple" },
              ].map((row, idx) => (
                <tr key={idx} className="border-b hover:bg-muted">
                  <td className="p-2 font-medium">{row.feature}</td>
                  <td className="p-2 text-center">{row.cloudbeds}</td>
                  <td className="p-2 text-center">{row.mews}</td>
                  <td className="p-2 text-center">{row.hostezee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Hostezee Unique Advantages */}
      <Card className="mt-8 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle>🎯 Hostezee's Unique Positioning</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Why Hostezee Wins in India</h4>
              <ul className="space-y-1 text-sm">
                <li>✓ 50-70% cheaper than CloudBeds</li>
                <li>✓ Built for Indian compliance (GST, regulations)</li>
                <li>✓ WhatsApp-first communication</li>
                <li>✓ Mobile-first design (staff use phones, not desktops)</li>
                <li>✓ Hindi/regional language support</li>
                <li>✓ Works offline (poor internet areas)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Revenue Impact Potential</h4>
              <ul className="space-y-1 text-sm">
                <li>• 15-25% increase in ADR (pricing optimization)</li>
                <li>• 30-40% from direct bookings (vs OTA commissions)</li>
                <li>• 20-30% from upselling (activities, services)</li>
                <li>• 25% faster housekeeping (lower costs)</li>
                <li>• 40% repeat bookings (better CRM)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Implementation Roadmap */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Hostezee Development Roadmap</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-l-4 border-green-500 pl-4 py-2">
            <h4 className="font-semibold">Phase 1: Now (Q4 2025) ✓</h4>
            <p className="text-sm text-muted-foreground">Core booking, guests, multi-property, payments</p>
          </div>
          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <h4 className="font-semibold">Phase 2: Q1 2026</h4>
            <p className="text-sm text-muted-foreground">OTA integration, dynamic pricing, analytics, mobile apps</p>
          </div>
          <div className="border-l-4 border-purple-500 pl-4 py-2">
            <h4 className="font-semibold">Phase 3: Q2 2026</h4>
            <p className="text-sm text-muted-foreground">Housekeeping, staff management, CRM, accounting</p>
          </div>
          <div className="border-l-4 border-yellow-500 pl-4 py-2">
            <h4 className="font-semibold">Phase 4: Q3-Q4 2026</h4>
            <p className="text-sm text-muted-foreground">Marketplace, AI features, enterprise scaling</p>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="mt-8 bg-primary/5">
        <CardContent className="pt-6">
          <p className="text-center text-sm">
            <span className="font-semibold">Hostezee Goal:</span> The easiest, most affordable PMS in India. 
            <br />
            <span className="text-muted-foreground">CloudBeds for India, at 1/3 the price, 10x simpler to use</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
