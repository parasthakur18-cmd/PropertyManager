import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Building2, ArrowLeft, Calendar, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

export default function Blog() {
  const [, setLocation] = useLocation();

  const articles = [
    {
      title: "10 Ways to Increase Hotel Revenue in 2025",
      date: "November 20, 2024",
      excerpt: "Learn proven strategies to optimize pricing, reduce vacancies, and maximize guest spending with modern property management.",
      category: "Revenue"
    },
    {
      title: "The Future of Guest Self-Check-in",
      date: "November 15, 2024",
      excerpt: "Discover how contactless check-in systems are transforming guest experiences and reducing operational costs.",
      category: "Technology"
    },
    {
      title: "Best Practices for Staff Management in Hotels",
      date: "November 10, 2024",
      excerpt: "Effective strategies for scheduling, training, and managing your hospitality team efficiently.",
      category: "Operations"
    },
    {
      title: "Data-Driven Decision Making for Hoteliers",
      date: "November 5, 2024",
      excerpt: "How to leverage analytics and reporting to make better business decisions and improve profitability.",
      category: "Analytics"
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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">Hostezee Blog</h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-12">Insights, tips, and industry updates for modern hoteliers</p>

          <div className="space-y-6">
            {articles.map((article, index) => (
              <div key={index} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between mb-3">
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400">
                    {article.category}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                    <Calendar className="h-4 w-4" />
                    {article.date}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{article.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">{article.excerpt}</p>
                <Button variant="outline" size="sm" onClick={() => setLocation("/")}>
                  Read More
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-xl border border-teal-200 dark:border-teal-800 p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Subscribe to our Newsletter</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">Get the latest insights and tips delivered to your inbox every week.</p>
            <form className="flex gap-2 max-w-md mx-auto mb-8">
              <input type="email" placeholder="Enter your email" className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
              <Button className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white">
                Subscribe
              </Button>
            </form>
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
