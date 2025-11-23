import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Building2, Calendar, Users, DollarSign, Shield, Zap, CheckCircle } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold font-serif text-slate-900">Hostezee</h1>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setLocation("/login")}
              data-testid="button-login"
            >
              Login
            </Button>
            <Button
              onClick={() => setLocation("/signup")}
              data-testid="button-signup"
            >
              Sign Up Free
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-5xl font-bold text-slate-900 mb-6">
            Property Management Made Simple
          </h2>
          <p className="text-xl text-slate-600 mb-8">
            Hostezee is a complete Property Management System designed for hotels, resorts, and lodging businesses. Manage bookings, guests, finances, and operations all in one place.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              size="lg"
              onClick={() => setLocation("/signup")}
              data-testid="button-get-started"
            >
              Get Started Free
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLocation("/login")}
              data-testid="button-login-hero"
            >
              Login
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <h3 className="text-3xl font-bold text-center text-slate-900 mb-16">
          Everything You Need
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Calendar className="h-5 w-5 text-primary" />
                Booking Management
              </CardTitle>
            </CardHeader>
            <CardContent className="text-slate-600">
              Create, modify, and manage bookings. Visual calendar view shows availability at a glance.
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Users className="h-5 w-5 text-primary" />
                Guest Management
              </CardTitle>
            </CardHeader>
            <CardContent className="text-slate-600">
              Track guests, their information, and check-in/check-out details. Guest self check-in via QR codes.
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <DollarSign className="h-5 w-5 text-primary" />
                Financial Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="text-slate-600">
              Complete billing system, expense tracking, revenue reports, and P&L statements.
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Building2 className="h-5 w-5 text-primary" />
                Multi-Property
              </CardTitle>
            </CardHeader>
            <CardContent className="text-slate-600">
              Manage multiple properties from one dashboard. Complete data isolation between users.
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Zap className="h-5 w-5 text-primary" />
                Restaurant & Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="text-slate-600">
              In-house restaurant management, menu creation, and room service order tracking.
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Shield className="h-5 w-5 text-primary" />
                Secure & Reliable
              </CardTitle>
            </CardHeader>
            <CardContent className="text-slate-600">
              Enterprise-grade security, automatic backups, and 99.9% uptime guarantee.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <h3 className="text-3xl font-bold text-center text-slate-900 mb-16">
          How It Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white text-lg font-bold mb-4">
              1
            </div>
            <h4 className="font-semibold text-slate-900 mb-2">Sign Up</h4>
            <p className="text-slate-600">Create your free account with email and password.</p>
          </div>

          <div className="text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white text-lg font-bold mb-4">
              2
            </div>
            <h4 className="font-semibold text-slate-900 mb-2">Add Property</h4>
            <p className="text-slate-600">Set up your property and define your rooms and pricing.</p>
          </div>

          <div className="text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white text-lg font-bold mb-4">
              3
            </div>
            <h4 className="font-semibold text-slate-900 mb-2">Manage Bookings</h4>
            <p className="text-slate-600">Start creating and managing bookings right away.</p>
          </div>

          <div className="text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white text-lg font-bold mb-4">
              4
            </div>
            <h4 className="font-semibold text-slate-900 mb-2">Track Finances</h4>
            <p className="text-slate-600">View reports and track your property's performance.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary to-primary/80 text-white py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h3 className="text-4xl font-bold mb-6">
            Ready to Simplify Your Property Management?
          </h3>
          <p className="text-lg mb-8 text-white/90">
            Join hundreds of property managers using Hostezee to streamline their operations.
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => setLocation("/signup")}
            data-testid="button-cta-signup"
          >
            Get Started Today
          </Button>
        </div>
      </section>

      {/* Features List */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <h3 className="text-3xl font-bold text-center text-slate-900 mb-16">
          Key Features
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {[
            "Real-time booking calendar",
            "Guest profile management",
            "Automated billing & invoicing",
            "Revenue reports & analytics",
            "Room availability tracking",
            "Staff member management",
            "Restaurant order management",
            "Salary & expense tracking",
            "Guest self check-in via QR",
            "WhatsApp & email notifications",
            "Travel agent management",
            "Dormitory bed-level tracking",
            "Custom pricing rules",
            "Multi-property support",
            "User role management",
            "Complete audit logs",
          ].map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
              <span className="text-slate-700">{feature}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-400">
            &copy; 2025 Hostezee. All rights reserved.
          </p>
          <div className="flex justify-center gap-6 mt-4 text-sm text-slate-400">
            <a href="#privacy" className="hover:text-white">Privacy Policy</a>
            <a href="#terms" className="hover:text-white">Terms of Service</a>
            <a href="#contact" className="hover:text-white">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
