import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Building2, ArrowLeft, Award, Users, Globe, Zap, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

export default function About() {
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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">About Hostezee</h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-12">Transforming hospitality management with cutting-edge technology</p>

          <div className="space-y-12">
            {/* Mission */}
            <section>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Our Mission</h2>
              <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed">
                To empower hotel and resort owners with intelligent, easy-to-use property management software that streamlines operations, maximizes revenue, and creates exceptional guest experiences.
              </p>
            </section>

            {/* Vision */}
            <section>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Our Vision</h2>
              <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed">
                To be the world's leading property management platform for hotels, resorts, and premium lodging providers. We believe in democratizing access to enterprise-grade tools for properties of all sizes.
              </p>
            </section>

            {/* Values */}
            <section>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Our Values</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                  <Award className="h-8 w-8 text-teal-600 dark:text-teal-400 mb-3" />
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2">Excellence</h3>
                  <p className="text-slate-600 dark:text-slate-400">We deliver premium quality in every aspect of our platform.</p>
                </div>
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                  <Users className="h-8 w-8 text-teal-600 dark:text-teal-400 mb-3" />
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2">Customer Focus</h3>
                  <p className="text-slate-600 dark:text-slate-400">Your success is our success. We listen and iterate.</p>
                </div>
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                  <Globe className="h-8 w-8 text-teal-600 dark:text-teal-400 mb-3" />
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2">Global Reach</h3>
                  <p className="text-slate-600 dark:text-slate-400">Supporting properties and guests around the world.</p>
                </div>
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                  <Zap className="h-8 w-8 text-teal-600 dark:text-teal-400 mb-3" />
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2">Innovation</h3>
                  <p className="text-slate-600 dark:text-slate-400">Continuously advancing hospitality technology.</p>
                </div>
              </div>
            </section>

            {/* Stats */}
            <section className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-xl border border-teal-200 dark:border-teal-800 p-8">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">By The Numbers</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">500+</p>
                  <p className="text-slate-600 dark:text-slate-400">Premium Properties</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">$500M+</p>
                  <p className="text-slate-600 dark:text-slate-400">Revenue Managed</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">50+</p>
                  <p className="text-slate-600 dark:text-slate-400">Countries</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">99.9%</p>
                  <p className="text-slate-600 dark:text-slate-400">Uptime</p>
                </div>
              </div>
            </section>

            {/* CTA */}
            <section className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Join the Hostezee Family</h2>
              <Button
                size="lg"
                onClick={() => {
                  window.location.href = "/api/login";
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
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
