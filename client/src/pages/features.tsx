import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft, Calendar, Users, BarChart3, Shield, Zap, CheckCircle, MessageCircle, Lock, Facebook, Twitter, Instagram, Linkedin, Brain, BarChart4, Smartphone, Clock, TrendingUp, CreditCard, Briefcase, AlertCircle } from "lucide-react";
import hostezeeLogo from "@assets/Hostezee_Logo_1768292341444.jpeg";

export default function Features() {
  const [, setLocation] = useLocation();

  const features = [
    // Core Features
    {
      icon: Calendar,
      title: "Intelligent Booking Engine",
      description: "Advanced availability management with real-time synchronization, dynamic pricing, and automated booking confirmations.",
      category: "Core"
    },
    {
      icon: Users,
      title: "Guest Management",
      description: "Complete guest profiles, preferences tracking, personalized communication, and guest self-check-in via QR codes.",
      category: "Core"
    },
    {
      icon: BarChart3,
      title: "Revenue Intelligence",
      description: "Real-time analytics, revenue reports, occupancy tracking, and predictive insights for better decisions.",
      category: "Core"
    },
    // New AI & Performance Features
    {
      icon: Brain,
      title: "AI-Powered Notifications",
      description: "Intelligent notification system with smart reminders every 3 hours, auto-dismiss after 3 hours, and task-specific alerts.",
      category: "New"
    },
    {
      icon: TrendingUp,
      title: "Employee Performance Dashboard",
      description: "Track staff performance with 3 analytics tabs: User Performance, Staff Performance, and Score Points for performance-based insights.",
      category: "New"
    },
    // Restaurant & Operations
    {
      icon: Smartphone,
      title: "WhatsApp Integration",
      description: "Real-time WhatsApp notifications for food orders, guest inquiries, and payment alerts - works even when app is closed.",
      category: "Restaurant"
    },
    {
      icon: MessageCircle,
      title: "Restaurant Operations",
      description: "Complete kitchen management, menu system with categories/items/variants, real-time order tracking, and quick order entry.",
      category: "Restaurant"
    },
    // Financial Features
    {
      icon: CreditCard,
      title: "Split Payment System",
      description: "Simplified payment collection with single cash input, auto-calculated balance, and one-click payment link generation.",
      category: "Financial"
    },
    {
      icon: Briefcase,
      title: "Comprehensive Financial Tracking",
      description: "Property lease agreements, expense management, P&L reports, pending payments tracking, and professional bill generation.",
      category: "Financial"
    },
    // Advanced Features
    {
      icon: Clock,
      title: "Attendance & Salary Management",
      description: "Staff attendance tracking, automatic salary calculation with intelligent deductions based on employment dates, and monthly summaries.",
      category: "Staff"
    },
    {
      icon: AlertCircle,
      title: "Feature Settings Control",
      description: "10 toggleable features for admins: food orders, WhatsApp, auto-checkout, auto-salary, attendance, performance analytics, and more.",
      category: "Advanced"
    },
    {
      icon: BarChart4,
      title: "RazorPay Payment Integration",
      description: "Direct payment collection via WhatsApp, automatic payment confirmation via webhook, and real-time payment notifications.",
      category: "Financial"
    },
    // Security & Support
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "ISO 27001 compliance, end-to-end encryption, SOC 2 certification, and regular security audits.",
      category: "Security"
    },
    {
      icon: Lock,
      title: "Data Privacy",
      description: "GDPR compliant with strict data isolation, encrypted storage, secure authentication, and object storage integration.",
      category: "Security"
    },
    {
      icon: CheckCircle,
      title: "Reliability & Support",
      description: "99.9% uptime guarantee, automatic backups, disaster recovery, automated crash reporting, and 24/7 support.",
      category: "Support"
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={hostezeeLogo} alt="Hostezee" className="h-12 w-auto object-contain" />
          </div>
          <Button variant="ghost" onClick={() => setLocation("/")} data-testid="button-back" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="pt-24 pb-12 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">Powerful Features</h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-12">Complete property management solution with AI, payments, and staff management</p>

          {/* Organize by category */}
          {['Core', 'New', 'Restaurant', 'Financial', 'Staff', 'Advanced', 'Security', 'Support'].map((category) => {
            const categoryFeatures = features.filter(f => f.category === category);
            if (categoryFeatures.length === 0) return null;
            
            const categoryLabels = {
              'Core': '🏢 Core Management',
              'New': '✨ AI & New Features',
              'Restaurant': '🍽️ Restaurant & Orders',
              'Financial': '💰 Financial Management',
              'Staff': '👥 Staff Management',
              'Advanced': '⚙️ Advanced Controls',
              'Security': '🔒 Security & Compliance',
              'Support': '📞 Support & Reliability'
            };

            return (
              <div key={category} className="mb-12">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">{categoryLabels[category as keyof typeof categoryLabels]}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {categoryFeatures.map((feature, index) => (
                    <div key={index} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 hover:shadow-lg hover:border-teal-400 dark:hover:border-teal-600 transition-all">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex-shrink-0">
                          <feature.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{feature.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="mt-12 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-xl border border-teal-200 dark:border-teal-800 p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Ready to transform your property management?</h2>
            <Button
              size="lg"
              onClick={() => {
                setLocation("/onboarding");
              }}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white mb-6"
            >
              Start Free Trial
            </Button>
            <div className="flex gap-4 justify-center text-slate-600 dark:text-slate-400">
              <a href="https://www.facebook.com/hostezee" target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 dark:hover:text-teal-400 transition">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="https://www.twitter.com/hostezee" target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 dark:hover:text-teal-400 transition">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="https://www.instagram.com/hostezee" target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 dark:hover:text-teal-400 transition">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://www.linkedin.com/company/hostezee" target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 dark:hover:text-teal-400 transition">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
