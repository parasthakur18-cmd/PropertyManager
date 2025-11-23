import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Building2, ArrowLeft } from "lucide-react";

export default function Privacy() {
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
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Privacy Policy</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8">Last updated: November 2024</p>

          <div className="space-y-8 text-slate-700 dark:text-slate-300">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">1. Introduction</h2>
              <p>Hostezee ("we" or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our property management platform.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">2. Information We Collect</h2>
              <p>We collect information you provide directly to us, including:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Account registration information (name, email, phone, password)</li>
                <li>Property and room details</li>
                <li>Guest information (names, contact details, ID proofs)</li>
                <li>Booking and transaction data</li>
                <li>Staff and user management data</li>
                <li>Financial information for billing and reporting</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">3. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide, maintain, and improve our services</li>
                <li>Process bookings, payments, and generate bills</li>
                <li>Send notifications and communications related to your account</li>
                <li>Generate analytics and financial reports</li>
                <li>Ensure platform security and prevent fraud</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">4. Data Security</h2>
              <p>We implement industry-standard security measures to protect your data, including:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>SSL/TLS encryption for data in transit</li>
                <li>Encrypted storage for sensitive information</li>
                <li>Regular security audits and monitoring</li>
                <li>Restricted access to user data</li>
                <li>Secure authentication and session management</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">5. Data Sharing</h2>
              <p>We do not sell, rent, or trade your personal information. We may share data only with:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Your authorized staff members within your account</li>
                <li>Third-party service providers (e.g., WhatsApp API for notifications)</li>
                <li>Legal authorities if required by law</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">6. Data Retention</h2>
              <p>We retain your data as long as your account is active. You can export or delete your data at any time. Upon account termination, you have 30 days to export your data before we securely delete it.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">7. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Export your data in standard formats</li>
                <li>Withdraw consent for data processing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">8. Cookies and Tracking</h2>
              <p>We use cookies to maintain your session and provide a seamless experience. These are essential for platform functionality and are not used for tracking or advertising.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">9. Third-Party Services</h2>
              <p>Our platform integrates with third-party services for notifications and payments. These services have their own privacy policies. We recommend reviewing them. We are not responsible for their data practices.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">10. Changes to Privacy Policy</h2>
              <p>We may update this policy periodically. Significant changes will be communicated via email. Continued use of the platform indicates acceptance of the updated policy.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">11. Contact Us</h2>
              <p>For privacy inquiries or to exercise your rights, contact us at:</p>
              <p className="mt-4">
                <strong>Email:</strong> privacy@hostezee.in<br />
                <strong>Phone:</strong> +91 9001949260<br />
                <strong>Address:</strong> Hostezee, India
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
