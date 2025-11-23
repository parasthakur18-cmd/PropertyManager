import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Mail, Phone, MessageSquare, Calendar } from "lucide-react";
import { format } from "date-fns";

interface ContactEnquiry {
  id: number;
  name: string;
  email: string;
  phone?: string;
  propertyName?: string;
  message: string;
  status: string;
  createdAt: string;
}

export default function ContactEnquiries() {
  const { data: enquiries = [], isLoading } = useQuery<ContactEnquiry[]>({
    queryKey: ["/api/contact"],
    queryFn: async () => {
      const res = await fetch("/api/contact");
      if (!res.ok) throw new Error("Failed to fetch enquiries");
      return res.json();
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300";
      case "contacted":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300";
      case "resolved":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Contact Enquiries</h1>
        <p className="text-slate-600 dark:text-slate-400">View all leads and enquiries from your landing page</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : enquiries.length === 0 ? (
        <Card className="bg-slate-50 dark:bg-slate-800/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-slate-400 dark:text-slate-500 mb-4" />
            <p className="text-slate-600 dark:text-slate-400 text-lg">No enquiries yet</p>
            <p className="text-slate-500 dark:text-slate-500 text-sm">Enquiries will appear here when users submit the form on your landing page</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {enquiries.map((enquiry) => (
            <Card key={enquiry.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-xl text-slate-900 dark:text-white">{enquiry.name}</CardTitle>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className={getStatusColor(enquiry.status)}>
                        {enquiry.status === "new" ? "New" : enquiry.status === "contacted" ? "Contacted" : "Resolved"}
                      </Badge>
                      {enquiry.propertyName && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {enquiry.propertyName}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {format(new Date(enquiry.createdAt), "MMM dd, yyyy")}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex gap-3">
                    <Mail className="h-5 w-5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Email</p>
                      <a href={`mailto:${enquiry.email}`} className="text-slate-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 break-all">
                        {enquiry.email}
                      </a>
                    </div>
                  </div>
                  {enquiry.phone && (
                    <div className="flex gap-3">
                      <Phone className="h-5 w-5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Phone</p>
                        <a href={`tel:${enquiry.phone}`} className="text-slate-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400">
                          {enquiry.phone}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Message</p>
                  <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-slate-900 dark:text-white whitespace-pre-wrap">{enquiry.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
