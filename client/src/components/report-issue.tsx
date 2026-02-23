import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Bug, Send, Loader2, CheckCircle, ImagePlus, X } from "lucide-react";
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

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

export function ReportIssueButton({ propertyId }: ReportIssueProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        setImagePreview(null);
        setImageError("");
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
          <Bug className="h-3.5 w-3.5 text-primary" />
        </Button>,
        document.body
      )}

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
