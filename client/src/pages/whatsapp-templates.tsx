import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, MessageCircle, Eye, Save, X, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MessageTemplate {
  id: number;
  name: string;
  content: string;
  templateType: string | null;
  propertyId: number | null;
  isActive: boolean;
}

interface Property {
  id: number;
  name: string;
}

const PLACEHOLDERS = [
  { key: "{guestName}", desc: "Guest's full name" },
  { key: "{propertyName}", desc: "Property name" },
  { key: "{roomNumber}", desc: "Room number" },
  { key: "{checkIn}", desc: "Check-in date" },
  { key: "{checkOut}", desc: "Check-out date" },
  { key: "{nights}", desc: "Number of nights" },
  { key: "{phone}", desc: "Property contact phone" },
];

function fillPlaceholders(content: string, sample: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(sample)) {
    result = result.replaceAll(key, value);
  }
  return result;
}

const SAMPLE_VALUES: Record<string, string> = {
  "{guestName}": "Rahul Sharma",
  "{propertyName}": "The Blue Mont Resort",
  "{roomNumber}": "104",
  "{checkIn}": "02 May 2026",
  "{checkOut}": "04 May 2026",
  "{nights}": "2",
  "{phone}": "9015224562",
};

export default function WhatsAppTemplates() {
  const { toast } = useToast();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all");
  const [editDialog, setEditDialog] = useState<{ open: boolean; template: MessageTemplate | null }>({ open: false, template: null });
  const [previewDialog, setPreviewDialog] = useState<{ open: boolean; content: string; name: string }>({ open: false, content: "", name: "" });
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [formName, setFormName] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formPropertyId, setFormPropertyId] = useState<string>("all");
  const [formType, setFormType] = useState("welcome");

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    staleTime: 5 * 60 * 1000,
  });

  const queryKey = selectedPropertyId === "all"
    ? ["/api/message-templates"]
    : ["/api/message-templates", selectedPropertyId];

  const { data: templates = [], isLoading } = useQuery<MessageTemplate[]>({
    queryKey,
    queryFn: async () => {
      const url = selectedPropertyId === "all"
        ? "/api/message-templates"
        : `/api/message-templates?propertyId=${selectedPropertyId}`;
      const res = await fetch(url, { credentials: "include" });
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; content: string; propertyId: number | null; templateType: string }) =>
      (await apiRequest("/api/message-templates", "POST", data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/message-templates"] });
      toast({ title: "Template created", description: "WhatsApp message template saved successfully" });
      closeDialog();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MessageTemplate> }) =>
      (await apiRequest(`/api/message-templates/${id}`, "PATCH", data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/message-templates"] });
      toast({ title: "Template updated" });
      closeDialog();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) =>
      (await apiRequest(`/api/message-templates/${id}`, "DELETE")).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/message-templates"] });
      toast({ title: "Template deleted" });
      setDeleteConfirmId(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function openCreate() {
    setFormName("");
    setFormContent("");
    setFormPropertyId(selectedPropertyId === "all" ? "all" : selectedPropertyId);
    setFormType("welcome");
    setEditDialog({ open: true, template: null });
  }

  function openEdit(t: MessageTemplate) {
    setFormName(t.name);
    setFormContent(t.content);
    setFormPropertyId(t.propertyId ? String(t.propertyId) : "all");
    setFormType(t.templateType || "welcome");
    setEditDialog({ open: true, template: t });
  }

  function closeDialog() {
    setEditDialog({ open: false, template: null });
  }

  function handleSave() {
    if (!formName.trim() || !formContent.trim()) {
      toast({ title: "Required", description: "Name and content are required", variant: "destructive" });
      return;
    }
    const payload = {
      name: formName.trim(),
      content: formContent.trim(),
      propertyId: formPropertyId === "all" ? null : parseInt(formPropertyId),
      templateType: formType,
    };
    if (editDialog.template) {
      updateMutation.mutate({ id: editDialog.template.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function insertPlaceholder(ph: string) {
    setFormContent(prev => prev + ph);
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-[#25D366]" />
            WhatsApp Message Templates
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create reusable message templates with dynamic placeholders. Send them to guests directly from the Active Bookings page.
          </p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-template" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-sm shrink-0">Filter by property:</Label>
        <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
          <SelectTrigger className="w-56" data-testid="select-filter-property">
            <SelectValue placeholder="All properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties.map(p => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Alert className="border-[#25D366]/30 bg-[#25D366]/5">
        <Info className="h-4 w-4 text-[#25D366]" />
        <AlertDescription className="text-xs">
          <strong>Available placeholders:</strong>{" "}
          {PLACEHOLDERS.map(p => (
            <code key={p.key} className="mx-0.5 bg-muted px-1 py-0.5 rounded text-[10px]">{p.key}</code>
          ))}
          — these are automatically filled from the guest's booking when you send the message.
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading templates…</div>
      ) : templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No templates yet. Create your first one!</p>
            <Button onClick={openCreate} variant="outline" className="mt-4 gap-1.5">
              <Plus className="h-4 w-4" /> New Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map(t => {
            const prop = properties.find(p => p.id === t.propertyId);
            return (
              <Card key={t.id} className="group" data-testid={`card-template-${t.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-semibold truncate">{t.name}</CardTitle>
                      <CardDescription className="text-xs flex items-center gap-1.5 mt-0.5">
                        {prop ? (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{prop.name}</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">All Properties</Badge>
                        )}
                        {t.templateType && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 capitalize">{t.templateType}</Badge>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        data-testid={`button-preview-template-${t.id}`}
                        onClick={() => setPreviewDialog({ open: true, content: fillPlaceholders(t.content, SAMPLE_VALUES), name: t.name })}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        data-testid={`button-edit-template-${t.id}`}
                        onClick={() => openEdit(t)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        data-testid={`button-delete-template-${t.id}`}
                        onClick={() => setDeleteConfirmId(t.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4 font-sans">{t.content}</pre>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={open => !open && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editDialog.template ? "Edit Template" : "New WhatsApp Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tpl-name">Template Name *</Label>
                <Input
                  id="tpl-name"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Welcome Message"
                  data-testid="input-template-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Property</Label>
                <Select value={formPropertyId} onValueChange={setFormPropertyId}>
                  <SelectTrigger data-testid="select-template-property">
                    <SelectValue placeholder="All Properties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger data-testid="select-template-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="welcome">Welcome</SelectItem>
                  <SelectItem value="checkout">Checkout</SelectItem>
                  <SelectItem value="info">Information</SelectItem>
                  <SelectItem value="offer">Offer / Promotion</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Message Content *</Label>
              <div className="flex flex-wrap gap-1 mb-1.5">
                <span className="text-xs text-muted-foreground mr-1 self-center">Insert:</span>
                {PLACEHOLDERS.map(ph => (
                  <button
                    key={ph.key}
                    type="button"
                    title={ph.desc}
                    className="text-[10px] bg-muted hover:bg-muted/80 px-1.5 py-0.5 rounded border font-mono"
                    onClick={() => insertPlaceholder(ph.key)}
                  >
                    {ph.key}
                  </button>
                ))}
              </div>
              <Textarea
                value={formContent}
                onChange={e => setFormContent(e.target.value)}
                rows={10}
                placeholder="Type your message here. Use {guestName}, {roomNumber}, etc."
                className="font-mono text-xs resize-y"
                data-testid="textarea-template-content"
              />
            </div>

            {formContent && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Live Preview (sample data)</Label>
                <div className="rounded-lg bg-[#e9fbe9] dark:bg-[#1a3a1a] border border-[#25D366]/30 p-3">
                  <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed">
                    {fillPlaceholders(formContent, SAMPLE_VALUES)}
                  </pre>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={isPending} data-testid="button-save-template">
              {isPending ? "Saving…" : (
                <>
                  <Save className="h-4 w-4 mr-1.5" />
                  {editDialog.template ? "Save Changes" : "Create Template"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialog.open} onOpenChange={open => !open && setPreviewDialog(p => ({ ...p, open: false }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-[#25D366]" />
              Preview: {previewDialog.name}
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-lg bg-[#e9fbe9] dark:bg-[#1a3a1a] border border-[#25D366]/30 p-4">
            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{previewDialog.content}</pre>
          </div>
          <p className="text-xs text-muted-foreground">Sample data shown — real values filled from guest's booking when sending.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialog(p => ({ ...p, open: false }))}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={open => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Template?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This template will be removed and can no longer be sent to guests.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteConfirmId !== null && deleteMutation.mutate(deleteConfirmId)}
              data-testid="button-confirm-delete-template"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
