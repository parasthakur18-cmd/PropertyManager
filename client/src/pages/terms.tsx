import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Building2, ArrowLeft } from "lucide-react";

export default function Terms() {
  const [, setLocation] = useLocation();

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
        <div className="max-w-4xl mx-auto prose dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Terms of Service</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8">Last updated: November 2024</p>

          <div className="space-y-8 text-slate-700 dark:text-slate-300">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">1. Acceptance of Terms</h2>
              <p>By accessing and using Hostezee, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">2. License</h2>
              <p>Hostezee grants you a limited, non-exclusive, non-transferable license to use the platform for your property management needs. This license does not include any rights to resell, transfer, or use the service for commercial purposes beyond your own property operations.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">3. User Accounts</h2>
              <p>When you create an account, you must provide accurate, complete, and current information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">4. Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Violate any applicable laws or regulations</li>
                <li>Transmit harmful, malicious, or illegal content</li>
                <li>Attempt to gain unauthorized access to the platform</li>
                <li>Interfere with the platform's functionality or security</li>
                <li>Use the platform for fraudulent or deceptive purposes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">5. Data Ownership</h2>
              <p>You retain all rights to your data. Hostezee stores your property, booking, guest, and financial information securely. You grant us the right to process, store, and backup your data to provide the service. We do not sell, share, or use your data for any purpose other than providing the service.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">6. Payment and Billing</h2>
              <p>Hostezee is currently provided free of charge. We reserve the right to introduce paid features or subscription tiers in the future. You will be notified of any changes and given the option to accept or decline.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">7. Limitation of Liability</h2>
              <p>Hostezee is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the platform, including loss of data, revenue, or business opportunities.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">8. Termination</h2>
              <p>We reserve the right to terminate or suspend your account at any time for violations of these terms or other violations of law. Upon termination, you retain the right to export your data within 30 days.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">9. Changes to Terms</h2>
              <p>We may update these terms at any time. Continued use of the platform after changes constitutes acceptance of the updated terms. We will notify you of significant changes via email.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">10. Contact</h2>
              <p>For questions about these terms, please contact us at legal@hostezee.in or call +91 9001949260.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
