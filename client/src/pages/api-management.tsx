import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Key, Plus, RefreshCw, XCircle, CheckCircle, Copy, AlertTriangle, Globe, Clock, Trash2, Eye, EyeOff } from "lucide-react";

export default function ApiManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPropertyId, setNewKeyPropertyId] = useState("");
  const [generatedKey, setGeneratedKey] = useState<{ apiKey: string; apiSecret: string; propertyName: string } | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<number, boolean>>({});

  const isAdmin = user?.role === "admin" || user?.role === "super-admin";

  const { data: apiKeys = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/website-api-keys"],
    queryFn: () => fetch("/api/website-api-keys").then(r => r.json()),
    enabled: isAdmin,
  });

  const { data: properties = [] } = useQuery<any[]>({
    queryKey: ["/api/properties"],
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: (data: { propertyName: string; propertyId?: number }) => apiRequest("POST", "/api/website-api-keys", data),
    onSuccess: async (res) => {
      const data = await res.json();
      setGeneratedKey({ apiKey: data.apiKey, apiSecret: data.apiSecret, propertyName: data.propertyName });
      setShowCreate(false);
      setNewKeyName("");
      setNewKeyPropertyId("");
      queryClient.invalidateQueries({ queryKey: ["/api/website-api-keys"] });
    },
    onError: () => toast({ title: "Failed to generate API key", variant: "destructive" }),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/website-api-keys/${id}/revoke`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/website-api-keys"] }); toast({ title: "API key revoked" }); },
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/website-api-keys/${id}/activate`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/website-api-keys"] }); toast({ title: "API key activated" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/website-api-keys/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/website-api-keys"] }); toast({ title: "API key deleted" }); },
  });

  const copyToClipboard = (text: string, label = "Copied") => {
    navigator.clipboard.writeText(text).then(() => toast({ title: label }));
  };

  const handleCreate = () => {
    if (!newKeyName.trim()) return;
    createMutation.mutate({
      propertyName: newKeyName.trim(),
      propertyId: newKeyPropertyId ? parseInt(newKeyPropertyId) : undefined,
    });
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card><CardContent className="py-10 text-center text-muted-foreground">Admin access required to manage API keys.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">API Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage API keys for hotel websites to send enquiries to Hostezee</p>
        </div>
        <Button onClick={() => setShowCreate(true)} data-testid="button-generate-key">
          <Plus className="h-4 w-4 mr-2" /> Generate API Key
        </Button>
      </div>

      {/* API Endpoint Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> API Endpoint</CardTitle>
          <CardDescription>Share this with your website developer. They only need the API URL and the API Key.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Endpoint URL</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm bg-background border rounded px-3 py-2 font-mono">POST https://hostezee.in/api/v1/website-leads</code>
              <Button size="sm" variant="outline" onClick={() => copyToClipboard("https://hostezee.in/api/v1/website-leads", "URL copied")} data-testid="button-copy-endpoint"><Copy className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Authentication</Label>
            <code className="block text-sm bg-background border rounded px-3 py-2 font-mono">Authorization: Bearer {"<api_key>"}</code>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sample Request Body</Label>
            <pre className="text-xs bg-background border rounded px-3 py-2 font-mono overflow-x-auto">{`{
  "property_name": "The Woodpecker Inn",
  "website": "https://thewoodpeckerinn.in",
  "guest_name": "John Doe",
  "mobile_number": "9876543210",
  "email": "john@example.com",
  "check_in": "2026-08-01",
  "check_out": "2026-08-03",
  "adults": 2,
  "children": 1,
  "room_type": "King Room",
  "landing_page": "https://thewoodpeckerinn.in/rooms",
  "utm_source": "google",
  "utm_medium": "organic",
  "device_type": "mobile",
  "browser": "Chrome"
}`}</pre>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Success Response</Label>
            <pre className="text-xs bg-background border rounded px-3 py-2 font-mono">{`{"success": true, "lead_id": "uuid", "message": "Lead created successfully"}`}</pre>
          </div>
        </CardContent>
      </Card>

      {/* API Keys List */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Your API Keys</h2>
        {isLoading ? (
          <Card><CardContent className="py-10 text-center"><div className="h-6 w-6 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto" /></CardContent></Card>
        ) : apiKeys.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Key className="h-10 w-10 mx-auto opacity-30 mb-3" />
              <p className="text-muted-foreground">No API keys yet. Generate one for each hotel website.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key: any) => (
              <Card key={key.id} data-testid={`card-api-key-${key.id}`} className={key.status === "revoked" ? "opacity-60" : ""}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{key.propertyName}</span>
                        <Badge variant={key.status === "active" ? "default" : "secondary"} className={key.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : ""}>
                          {key.status === "active" ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                          {key.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 truncate">{key.apiKey}</code>
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => copyToClipboard(key.apiKey, "API key copied")} data-testid={`button-copy-key-${key.id}`}><Copy className="h-3.5 w-3.5" /></Button>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Created: {key.createdAt ? format(new Date(key.createdAt), "dd MMM yyyy") : "—"}</span>
                        {key.lastUsedAt && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />Last used: {format(new Date(key.lastUsedAt), "dd MMM yyyy HH:mm")}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {key.status === "active" ? (
                        <Button size="sm" variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => revokeMutation.mutate(key.id)} disabled={revokeMutation.isPending} data-testid={`button-revoke-${key.id}`}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Revoke
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => activateMutation.mutate(key.id)} disabled={activateMutation.isPending} data-testid={`button-activate-${key.id}`}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Activate
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => { if (confirm("Delete this API key? This cannot be undone.")) deleteMutation.mutate(key.id); }} data-testid={`button-delete-key-${key.id}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate New API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Property / Website Name *</Label>
              <Input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="e.g. The Woodpecker Inn" data-testid="input-new-key-name" />
            </div>
            <div>
              <Label>Link to Property (optional)</Label>
              <select className="w-full border rounded px-3 py-2 text-sm bg-background" value={newKeyPropertyId} onChange={e => setNewKeyPropertyId(e.target.value)} data-testid="select-property-link">
                <option value="">— Not linked —</option>
                {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm flex gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-amber-800 dark:text-amber-200">The API secret will be shown <strong>only once</strong> after generation. Save it immediately.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} data-testid="button-cancel-create">Cancel</Button>
            <Button onClick={handleCreate} disabled={!newKeyName.trim() || createMutation.isPending} data-testid="button-create-key">
              <Key className="h-4 w-4 mr-2" /> Generate Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generated Key Dialog */}
      <Dialog open={!!generatedKey} onOpenChange={open => !open && setGeneratedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700"><CheckCircle className="h-5 w-5" /> API Key Generated!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm flex gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-amber-800 dark:text-amber-200"><strong>Copy both values now.</strong> The API Secret will never be shown again.</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Property</Label>
              <p className="font-semibold text-sm">{generatedKey?.propertyName}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">API Key (public — use in Authorization header)</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 text-xs font-mono bg-muted px-3 py-2 rounded break-all">{generatedKey?.apiKey}</code>
                <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => copyToClipboard(generatedKey?.apiKey || "", "API key copied")} data-testid="button-copy-generated-key"><Copy className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">API Secret (private — do not share publicly)</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 text-xs font-mono bg-muted px-3 py-2 rounded break-all">{generatedKey?.apiSecret}</code>
                <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => copyToClipboard(generatedKey?.apiSecret || "", "API secret copied")} data-testid="button-copy-generated-secret"><Copy className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Usage Example</Label>
              <pre className="text-xs bg-muted p-3 rounded font-mono overflow-x-auto">{`curl -X POST https://hostezee.in/api/v1/website-leads \\
  -H "Authorization: Bearer ${generatedKey?.apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"guest_name":"John","mobile_number":"9876543210"}'`}</pre>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setGeneratedKey(null)} data-testid="button-close-generated">Done — I have saved the credentials</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
