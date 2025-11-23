import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Building2, ArrowLeft, Calendar, Users, BarChart3, Shield, Zap, CheckCircle, MessageCircle, Lock } from "lucide-react";

export default function Features() {
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: Calendar,
      title: "Intelligent Booking Engine",
      description: "Advanced availability management with real-time synchronization, dynamic pricing, and automated booking confirmations."
    },
    {
      icon: Users,
      title: "Guest Management",
      description: "Complete guest profiles, preferences tracking, and personalized communication throughout their stay."
    },
    {
      icon: BarChart3,
      title: "Revenue Intelligence",
      description: "Real-time analytics, revenue reports, occupancy tracking, and predictive insights for better decisions."
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "ISO 27001 compliance, end-to-end encryption, SOC 2 certification, and regular security audits."
    },
    {
      icon: Zap,
      title: "Automation",
      description: "Automated billing, notifications, payment reminders, and staff scheduling to save time."
    },
    {
      icon: MessageCircle,
      title: "Multi-Channel Notifications",
      description: "WhatsApp, Email, and SMS notifications for bookings, check-ins, and payments in real-time."
    },
    {
      icon: Lock,
      title: "Data Privacy",
      description: "GDPR compliant with strict data isolation, encrypted storage, and secure authentication."
    },
    {
      icon: CheckCircle,
      title: "Quality Assurance",
      description: "99.9% uptime guarantee, automatic backups, disaster recovery, and dedicated support team."
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
              <Building2 className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Hostezee</h1>
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
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-12">Everything you need to manage your property efficiently</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 hover:shadow-lg transition-all">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex-shrink-0">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-xl border border-teal-200 dark:border-teal-800 p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Ready to transform your property management?</h2>
            <Button
              size="lg"
              onClick={() => {
                window.location.href = "/api/login";
              }}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white"
            >
              Start Free Trial
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
