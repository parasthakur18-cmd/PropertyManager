import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Building2, ArrowLeft, Shield, Lock, CheckCircle, AlertCircle, Key, Eye } from "lucide-react";

export default function Security() {
  const [, setLocation] = useLocation();

  const securityFeatures = [
    {
      icon: Shield,
      title: "Enterprise-Grade Security",
      points: ["ISO 27001 Certified", "SOC 2 Type II Compliant", "Regular security audits", "Penetration testing"]
    },
    {
      icon: Lock,
      title: "Data Encryption",
      points: ["TLS/SSL for data in transit", "AES-256 encryption at rest", "Encrypted database storage", "Secure key management"]
    },
    {
      icon: Key,
      title: "Access Control",
      points: ["Role-based access control", "Multi-factor authentication", "Session management", "API key management"]
    },
    {
      icon: Eye,
      title: "Monitoring & Audit",
      points: ["24/7 security monitoring", "Complete audit logs", "Intrusion detection", "Threat intelligence"]
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
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">Security & Compliance</h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-12">Your data security is our top priority</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {securityFeatures.map((feature, index) => (
              <div key={index} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex-shrink-0">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{feature.title}</h3>
                </div>
                <ul className="space-y-2">
                  {feature.points.map((point, i) => (
                    <li key={i} className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <CheckCircle className="h-4 w-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-8 mb-12">
            <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-300 mb-4 flex items-center gap-2">
              <AlertCircle className="h-6 w-6" />
              Compliance Certifications
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-blue-800 dark:text-blue-300">
              <div>
                <p className="font-semibold">ISO 27001:2022</p>
                <p className="text-sm">Information Security Management</p>
              </div>
              <div>
                <p className="font-semibold">SOC 2 Type II</p>
                <p className="text-sm">Security, Availability & Confidentiality</p>
              </div>
              <div>
                <p className="font-semibold">GDPR Compliant</p>
                <p className="text-sm">EU Data Protection Regulation</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-xl border border-teal-200 dark:border-teal-800 p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Your data is in safe hands</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-2xl mx-auto">
              Enterprise-grade security infrastructure with round-the-clock monitoring and regular audits to protect your business.
            </p>
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
