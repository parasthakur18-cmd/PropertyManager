import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useState } from "react";
import hostezeeLogo from "@assets/Hostezee_Logo_1768292341444.jpeg";

export default function FAQ() {
  const [, setLocation] = useLocation();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const faqs = [
    {
      id: "1",
      question: "What is Hostezee?",
      answer: "Hostezee is a comprehensive property management system designed for hotels, resorts, and premium lodging properties. It helps you manage bookings, guests, finances, restaurant operations, and staff all in one platform."
    },
    {
      id: "2",
      question: "Is Hostezee free to use?",
      answer: "Yes! Hostezee is completely free for all users. There are no subscription fees, no hidden charges, and no credit card required. You get access to all features at no cost."
    },
    {
      id: "3",
      question: "How do I get started?",
      answer: "Sign up with your email, visit the onboarding guide at /onboarding, and follow the 8 simple steps to launch your property. The entire setup takes about 30 minutes."
    },
    {
      id: "4",
      question: "Can I manage multiple properties?",
      answer: "Yes! Hostezee supports unlimited properties. You can manage as many properties as you want from a single dashboard."
    },
    {
      id: "5",
      question: "Do you have WhatsApp notifications?",
      answer: "Yes, Hostezee integrates with WhatsApp to send guest notifications for bookings, check-in, checkout, and other important updates. This feature is optional and can be enabled in settings."
    },
    {
      id: "6",
      question: "How secure is my data?",
      answer: "Your data is encrypted and stored securely in our PostgreSQL database. We follow enterprise-grade security practices including SSL encryption, secure authentication, and regular backups."
    },
    {
      id: "7",
      question: "Can guests check in without staff help?",
      answer: "Yes! Guests can use the self check-in feature with QR codes. They scan the code, verify their identity via email, upload ID proof, and complete check-in contactlessly."
    },
    {
      id: "8",
      question: "How do I add staff members?",
      answer: "Go to Users Management, click 'Add New User', assign a role (Manager, Staff, Kitchen), and set property access. They can log in immediately with their credentials."
    },
    {
      id: "9",
      question: "Can I track staff salary?",
      answer: "Yes, Hostezee has a complete salary management system. Track attendance, calculate salaries based on working days, manage advances, and generate salary reports."
    },
    {
      id: "10",
      question: "How do I get support?",
      answer: "Email us at support@hostezee.in or call +91 9001949260 (Mon-Fri, 9 AM - 6 PM IST). Our support team will help you with any questions."
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
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            data-testid="button-back"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="pt-24 pb-12 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Frequently Asked Questions</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-12">Find answers to common questions about Hostezee</p>

          <div className="space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden hover:border-teal-300 dark:hover:border-teal-700 transition-colors"
              >
                <button
                  onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                  data-testid={`button-faq-${faq.id}`}
                >
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{faq.question}</h3>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-600 dark:text-slate-400 transition-transform ${
                      expandedId === faq.id ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {expandedId === faq.id && (
                  <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-900/30">
                    <p className="text-slate-700 dark:text-slate-300">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Contact Section */}
          <div className="mt-16 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Still Have Questions?</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Can't find what you're looking for? Reach out to our support team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:support@hostezee.in"
                className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors font-medium"
              >
                Email Support
              </a>
              <a
                href="tel:+919001949260"
                className="px-6 py-2 border border-teal-600 text-teal-600 dark:text-teal-400 dark:border-teal-400 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors font-medium"
              >
                Call Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
