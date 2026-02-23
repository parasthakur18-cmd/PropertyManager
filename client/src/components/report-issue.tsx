import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Bug, Send, Loader2, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

export function ReportIssueButton({ propertyId }: ReportIssueProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const reportMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/error-reports", "POST", data);
    },
    onSuccess: () => {
      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setDescription("");
        setCategory("");
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

  const handleSubmit = () => {
    if (!description.trim()) return;
    
    reportMutation.mutate({
      page: window.location.pathname,
      errorMessage: category ? issueCategories.find(c => c.value === category)?.label : "User reported issue",
      userDescription: description.trim(),
      propertyId: propertyId || null,
      browserInfo: `${navigator.userAgent} | Screen: ${window.innerWidth}x${window.innerHeight}`,
    });
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg"
        size="sm"
        data-testid="button-report-issue"
      >
        <Bug className="h-4 w-4" />
        <span className="hidden sm:inline">Report Issue</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setIsOpen(false); setSubmitted(false); } }}>
        <DialogContent className="max-w-md" data-testid="dialog-report-issue">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-primary" />
              Report an Issue
            </DialogTitle>
            <DialogDescription>
              Having trouble? Let our team know and we'll fix it.
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-lg font-medium">Report Sent!</p>
              <p className="text-sm text-muted-foreground text-center">
                Our team has been notified and will look into this.
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
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
                  placeholder="Tell us what happened. For example: 'I tried to create a new booking but got an error when I clicked submit'"
                  rows={4}
                  data-testid="input-issue-description"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Your current page ({window.location.pathname}) and device info will be included automatically to help us debug faster.
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
        </DialogContent>
      </Dialog>
    </>
  );
}
