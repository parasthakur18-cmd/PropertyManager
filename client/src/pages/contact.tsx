import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft, Mail, Phone, MapPin } from "lucide-react";
import { useState } from "react";
import hostezeeLogo from "@assets/Hostezee_Logo_1768292341444.jpeg";

export default function Contact() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      setStatus({ type: "error", message: "Please fill in all fields" });
      return;
    }

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setStatus({ type: "success", message: "Message sent! We'll be in touch soon." });
        setFormData({ name: "", email: "", subject: "", message: "" });
      }
    } catch (error) {
      setStatus({ type: "error", message: "Failed to send message. Please try again." });
    }
  };

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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">Contact Us</h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-12">Have questions? We're here to help!</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Get In Touch</h2>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <Mail className="h-6 w-6 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Email</p>
                      <a href="mailto:support@hostezee.in" className="text-teal-600 dark:text-teal-400 hover:underline">support@hostezee.in</a>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Phone className="h-6 w-6 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Phone</p>
                      <a href="tel:+918800000000" className="text-teal-600 dark:text-teal-400 hover:underline">+91 (880) 000-0000</a>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <MapPin className="h-6 w-6 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Address</p>
                      <p className="text-slate-600 dark:text-slate-400">Bangalore, India</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl p-6">
                <h3 className="font-semibold text-teal-900 dark:text-teal-300 mb-2">Response Time</h3>
                <p className="text-sm text-teal-800 dark:text-teal-400">We typically respond to inquiries within 24 hours during business days.</p>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  name="name"
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Your Email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <input
                  type="text"
                  name="subject"
                  placeholder="Subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <textarea
                  name="message"
                  placeholder="Your Message"
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                ></textarea>
                {status && (
                  <div className={`p-3 rounded-lg ${status.type === "success" ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300" : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300"}`}>
                    {status.message}
                  </div>
                )}
                <Button type="submit" className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white">
                  Send Message
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
