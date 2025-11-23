import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { 
  Building2, Calendar, Users, DollarSign, Shield, Zap, CheckCircle, 
  ArrowRight, Instagram, TrendingUp, BarChart3, MessageCircle, Lock,
  Smartphone, Globe, Briefcase, Award
} from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({ name: "", email: "", property: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      setFormStatus({ type: "error", message: "Please fill in all required fields" });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormStatus({ type: "success", message: "Thank you! We'll get back to you within 24 hours." });
        setFormData({ name: "", email: "", property: "", message: "" });
      } else {
        setFormStatus({ type: "error", message: "Failed to send message. Please try again." });
      }
    } catch (error) {
      setFormStatus({ type: "error", message: "Failed to send message. Please email us directly at support@hostezee.in" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-md">
              <Building2 className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Hostezee</h1>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => setLocation("/login")}
              data-testid="button-login"
              className="text-slate-700 dark:text-slate-300"
            >
              Login
            </Button>
            <Button
              onClick={() => setLocation("/signup")}
              data-testid="button-signup"
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-28 pb-16 md:pt-40 md:pb-24 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 w-fit">
                <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">✨ The Property Manager's Toolkit</span>
              </div>

              <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white leading-tight">
                Property Management,
                <span className="block text-teal-600 dark:text-teal-400">Simplified</span>
              </h1>

              <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                Manage bookings, guests, finances, and operations in one beautiful platform. Perfect for hotels, resorts, and premium lodging properties.
              </p>

              <div className="flex gap-4 pt-4">
                <Button
                  size="lg"
                  onClick={() => setLocation("/signup")}
                  data-testid="button-get-started"
                  className="bg-teal-600 hover:bg-teal-700 text-white text-base h-12 px-8 gap-2 group"
                >
                  Start Free Trial
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setLocation("/login")}
                  data-testid="button-demo"
                  className="border-slate-300 dark:border-slate-700 h-12"
                >
                  View Demo
                </Button>
              </div>

              <div className="flex flex-wrap gap-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-teal-600" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">14-day free trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-teal-600" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">No credit card needed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-teal-600" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Setup in 10 minutes</span>
                </div>
              </div>
            </div>

            {/* Right Visual */}
            <div className="relative h-96 md:h-full min-h-96">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-3xl blur-3xl"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-teal-100 to-cyan-100 dark:from-teal-900/30 dark:to-cyan-900/30 rounded-3xl border border-teal-200 dark:border-teal-800/50 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4 p-6">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg">
                    <TrendingUp className="h-8 w-8 text-teal-600 mb-3" />
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">245</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Bookings this month</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg">
                    <DollarSign className="h-8 w-8 text-green-600 mb-3" />
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">$48K</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Revenue tracked</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg">
                    <Users className="h-8 w-8 text-blue-600 mb-3" />
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">892</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Guests managed</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg">
                    <BarChart3 className="h-8 w-8 text-orange-600 mb-3" />
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">94%</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Occupancy rate</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl md:text-4xl font-bold text-teal-600 dark:text-teal-400 mb-2">500+</p>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">Properties Managed</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-teal-600 dark:text-teal-400 mb-2">50K+</p>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">Bookings Annually</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-teal-600 dark:text-teal-400 mb-2">$500M+</p>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">Revenue Managed</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-teal-600 dark:text-teal-400 mb-2">99.9%</p>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">System Uptime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-20 md:py-28 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              Everything Included
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Enterprise-grade features designed specifically for property managers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Calendar, title: "Smart Booking System", desc: "Airbnb-style calendar with real-time availability" },
              { icon: Users, title: "Guest Management", desc: "Profiles, tracking, and WhatsApp notifications" },
              { icon: DollarSign, title: "Financial Hub", desc: "Billing, P&L reports, and revenue tracking" },
              { icon: Smartphone, title: "QR Self Check-in", desc: "Contactless guest check-in with ID verification" },
              { icon: Globe, title: "Multi-Property", desc: "Manage unlimited properties from one dashboard" },
              { icon: BarChart3, title: "Analytics & Reports", desc: "Deep insights into bookings, revenue, and trends" },
              { icon: MessageCircle, title: "Guest Communications", desc: "Email, SMS, and WhatsApp notifications" },
              { icon: Briefcase, title: "Restaurant Management", desc: "In-house restaurant, menus, and room service" },
              { icon: Shield, title: "Enterprise Security", desc: "Role-based access, audit logs, and encryption" },
            ].map((feature, index) => (
              <Card key={index} className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex-shrink-0">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{feature.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-28 bg-white dark:bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              Get Started in 4 Steps
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              From signup to first booking in less than an hour
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Sign Up", desc: "Create your account in 2 minutes" },
              { step: "2", title: "Add Property", desc: "Configure your property details" },
              { step: "3", title: "Create Rooms", desc: "Set up rooms and pricing rules" },
              { step: "4", title: "Start Bookings", desc: "Accept bookings immediately" },
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="text-center">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-teal-600 text-white text-2xl font-bold mb-4 shadow-lg">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{item.desc}</p>
                </div>
                {index < 3 && (
                  <div className="hidden md:block absolute top-8 -right-3 text-teal-300">
                    <ArrowRight className="h-6 w-6" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 md:py-28 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div>
              <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-8">
                Have Questions?
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-600 text-white flex-shrink-0">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Email</h3>
                    <a href="mailto:support@hostezee.in" className="text-slate-600 dark:text-slate-400 hover:text-teal-600 transition">
                      support@hostezee.in
                    </a>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Response within 24 hours</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-600 text-white flex-shrink-0">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Phone</h3>
                    <a href="tel:+919001949260" className="text-slate-600 dark:text-slate-400 hover:text-teal-600 transition">
                      +91 9001949260
                    </a>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Mon-Fri, 9 AM - 6 PM IST</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-600 text-white flex-shrink-0">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Headquarters</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      Tower B, Cybercity<br/>
                      Sector 39, Gurgaon 122001<br/>
                      Haryana, India
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-lg">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                Send us a Message
              </h3>
              <form className="space-y-4" data-testid="contact-form">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="Your name"
                    data-testid="input-contact-name"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    placeholder="your@email.com"
                    data-testid="input-contact-email"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Property Name (Optional)
                  </label>
                  <input
                    type="text"
                    name="property"
                    value={formData.property}
                    onChange={handleFormChange}
                    placeholder="Your property"
                    data-testid="input-contact-property"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Message
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleFormChange}
                    placeholder="Tell us your inquiry..."
                    rows={4}
                    data-testid="textarea-contact-message"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  />
                </div>

                {formStatus && (
                  <div className={`p-3 rounded-lg text-sm ${formStatus.type === "success" ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300" : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300"}`}>
                    {formStatus.message}
                  </div>
                )}

                <Button
                  type="submit"
                  onClick={handleFormSubmit}
                  disabled={isSubmitting}
                  data-testid="button-contact-submit"
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-900 dark:to-cyan-900 py-16 md:py-20">
        <div className="relative max-w-4xl mx-auto px-4 md:px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Operations?
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Join 500+ property managers who trust Hostezee. Start your free 14-day trial today.
          </p>
          <Button
            size="lg"
            onClick={() => setLocation("/signup")}
            data-testid="button-cta-signup"
            className="bg-white text-teal-600 hover:bg-slate-100 text-base h-12 px-8 font-semibold gap-2"
          >
            Start Free Trial
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-slate-950 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">
                  <Building2 className="h-5 w-5" />
                </div>
                <span className="font-bold text-white">Hostezee</span>
              </div>
              <p className="text-sm">Property Management System for Hotels & Resorts</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <p>&copy; 2025 Hostezee PMS. All rights reserved.</p>
              <div className="flex gap-4 mt-4 md:mt-0">
                <a href="https://www.instagram.com/hostezee" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                  <Instagram className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
