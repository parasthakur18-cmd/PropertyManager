import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bug, Send, Loader2, CheckCircle, ImagePlus, X, MessageSquare, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ErrorReport } from "@shared/schema";

interface ReportIssueProps {
  propertyId?: number;
}

const issueCategories = [
  { value: "error", label: "Something went wrong / Error" },
  { value: "not-working", label: "Feature not working properly" },
  { value: "missing", label: "Something is missing" },
  { value: "slow", label: "App is slow or not loading" },
  { value: "confusing", label: "Hard to understand / Confusing" },
  { value: "suggestion", label: "Suggestion / Feature request" },
  { value: "other", label: "Other" },
];

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

export function ReportIssueButton({ propertyId }: ReportIssueProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const [activeTab, setActiveTab] = useState("new");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: myReports = [] } = useQuery<ErrorReport[]>({
    queryKey: ["/api/my-reports"],
    enabled: isOpen,
  });

  const reportsWithReplies = myReports.filter(r => r.adminReply);

  const reportMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/error-reports", "POST", data);
    },
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/my-reports"] });
      setTimeout(() => {
        setSubmitted(false);
        setDescription("");
        setCategory("");
        setImagePreview(null);
        setImageError("");
        setActiveTab("history");
      }, 2000);
    },
    onError: () => {
      toast({
        title: "Could not send report",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImageError("");
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageError("Please select an image file.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageError("Image must be under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = () => {
    if (!description.trim()) return;
    
    reportMutation.mutate({
      page: window.location.pathname,
      errorMessage: category ? issueCategories.find(c => c.value === category)?.label : "User reported issue",
      userDescription: description.trim(),
      propertyId: propertyId || null,
      browserInfo: `${navigator.userAgent} | Screen: ${window.innerWidth}x${window.innerHeight}`,
      imageUrl: imagePreview || null,
    });
  };

  return (
    <>
      {createPortal(
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          size="icon"
          style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            zIndex: 9999
          }}
          className="h-8 w-8 rounded-full shadow-md border-primary/30 bg-background"
          data-testid="button-report-issue"
          title="Report an issue"
        >
          {reportsWithReplies.length > 0 ? (
            <span className="relative">
              <Bug className="h-3.5 w-3.5 text-primary" />
              <span className="absolute -top-1.5 -right-1.5 h-2 w-2 rounded-full bg-red-500" />
            </span>
          ) : (
            <Bug className="h-3.5 w-3.5 text-primary" />
          )}
        </Button>,
        document.body
      )}

      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setIsOpen(false); setSubmitted(false); } }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" data-testid="dialog-report-issue">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-primary" />
              Support
            </DialogTitle>
            <DialogDescription>
              Report issues or check replies from the admin.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="new" className="flex-1" data-testid="tab-new-report">New Report</TabsTrigger>
              <TabsTrigger value="history" className="flex-1 gap-1" data-testid="tab-report-history">
                My Reports
                {reportsWithReplies.length > 0 && (
                  <Badge variant="destructive" className="h-4 min-w-4 text-[10px] px-1">{reportsWithReplies.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="mt-4">
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                  <p className="text-lg font-medium">Report Sent!</p>
                  <p className="text-sm text-muted-foreground text-center">
                    Our team has been notified and will look into this.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>What kind of issue?</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger data-testid="select-issue-category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {issueCategories.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Describe the problem *</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tell us what happened..."
                      rows={4}
                      data-testid="input-issue-description"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Attach a screenshot (optional)</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      data-testid="input-issue-image"
                    />
                    {!imagePreview ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 border-dashed"
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="button-attach-image"
                      >
                        <ImagePlus className="h-4 w-4" />
                        Choose image
                      </Button>
                    ) : (
                      <div className="relative rounded-md border overflow-hidden">
                        <img
                          src={imagePreview}
                          alt="Attached screenshot"
                          className="w-full max-h-40 object-contain bg-muted"
                          data-testid="img-issue-preview"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 rounded-full"
                          onClick={removeImage}
                          data-testid="button-remove-image"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {imageError && (
                      <p className="text-xs text-destructive">{imageError}</p>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Your current page and device info will be included automatically.
                  </p>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsOpen(false)}
                      data-testid="button-cancel-report"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      className="flex-1 gap-1"
                      onClick={handleSubmit}
                      disabled={!description.trim() || reportMutation.isPending}
                      data-testid="button-submit-report"
                    >
                      {reportMutation.isPending ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                      ) : (
                        <><Send className="h-4 w-4" /> Send Report</>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              {myReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No reports submitted yet.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {myReports.map(report => (
                    <div key={report.id} className="border rounded-lg p-3 space-y-2" data-testid={`report-history-${report.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{report.errorMessage || "Report"}</p>
                        <Badge variant={report.status === "open" ? "default" : "secondary"} className="text-[10px] shrink-0">
                          {report.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{report.userDescription}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {report.createdAt ? new Date(report.createdAt).toLocaleString() : ""}
                      </p>
                      {report.adminReply && (
                        <div className="bg-primary/5 border border-primary/20 rounded p-2 mt-1">
                          <p className="text-xs font-medium text-primary flex items-center gap-1 mb-1">
                            <MessageSquare className="h-3 w-3" /> Admin Reply
                          </p>
                          <p className="text-sm">{report.adminReply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
