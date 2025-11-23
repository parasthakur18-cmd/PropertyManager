import { Building2, Calendar, Users, BarChart3, ArrowRight, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 overflow-hidden flex flex-col">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
              <Building2 className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Hostezee</h1>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                window.location.href = "/";
              }}
              data-testid="button-back-home"
              className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Home
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center pt-24 pb-12 px-4">
        <div className="relative w-full max-w-6xl">
          {/* Animated Background Gradient */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl -z-10">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-teal-400/30 to-cyan-400/30 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-cyan-400/20 to-teal-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: "1s"}}></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16 items-center">
            {/* Left Section - Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 w-fit hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors">
                  <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">Welcome Back</span>
                </div>

                <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white leading-tight">
                  Experience
                  <span className="block bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                    Modern Hospitality
                  </span>
                </h1>

                <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                  The world's leading property management platform trusted by premium hotels, resorts, and luxury accommodations worldwide. Streamline operations, maximize revenue, and delight guests at scale.
                </p>
              </div>

              <div className="space-y-4">
                <Button
                  size="lg"
                  onClick={() => {
                    window.location.href = "/api/login";
                  }}
                  data-testid="button-login"
                  className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white text-base h-13 shadow-lg hover:shadow-xl transition-all gap-2 group"
                >
                  Access Your Dashboard
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setLocation("/forgot-password")}
                  data-testid="button-forgot-password"
                  className="w-full border-slate-300 dark:border-slate-700 h-13 hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  Reset Your Password
                </Button>

                <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                  New to Hostezee?{" "}
                  <a href="#" onClick={() => setLocation("/signup")} className="font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition">
                    Start your free trial
                  </a>
                </p>
              </div>

              {/* Trust Badges */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-8">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-4">Trusted Globally</p>
                <div className="flex flex-wrap gap-8">
                  <div>
                    <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">500+</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Premium Properties</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">$500M+</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Revenue Managed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">99.9%</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Uptime Guarantee</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section - Features Showcase */}
            <div className="relative h-96 md:h-full min-h-96 lg:min-h-80">
              <div className="space-y-6">
                {[
                  { icon: Calendar, title: "Intelligent Booking Engine", desc: "AI-powered availability and dynamic pricing optimization", color: "from-blue-500 to-cyan-500" },
                  { icon: Users, title: "Guest Experience Platform", desc: "Personalized journeys from booking to checkout", color: "from-teal-500 to-green-500" },
                  { icon: BarChart3, title: "Revenue Intelligence", desc: "Real-time analytics and predictive insights", color: "from-orange-500 to-red-500" },
                ].map((feature, index) => (
                  <div
                    key={index}
                    className="group relative"
                  >
                    <div className="relative bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-xl transition-all duration-300 hover:border-teal-300 dark:hover:border-teal-700 cursor-default">
                      <div className="flex items-start gap-4">
                        <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} text-white flex-shrink-0 group-hover:scale-110 transition-transform`}>
                          <feature.icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{feature.title}</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{feature.desc}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Additional Info Card */}
                <div className="relative bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-2xl border border-teal-200 dark:border-teal-800 p-6">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-teal-600 dark:text-teal-400">Enterprise-grade security</span> with ISO 27001 compliance, data encryption, and SOC 2 certification
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Join the world's leading hospitality platforms using Hostezee
          </p>
          <Button
            size="lg"
            onClick={() => {
              window.location.href = "/api/login";
            }}
            data-testid="button-signup-cta"
            className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all gap-2"
          >
            Start Your Free Trial
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
