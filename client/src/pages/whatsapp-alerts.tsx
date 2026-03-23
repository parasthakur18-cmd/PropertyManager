import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { BellRing, Phone, Users, User, Loader2, CheckCircle2 } from "lucide-react";

interface AlertConfig {
  id: number;
  templateKey: string;
  templateName: string;
  templateWid: string;
  description: string | null;
  isGloballyEnabled: boolean;
}

interface AlertRule {
  id?: number;
  templateKey: string;
  propertyId: number;
  isEnabled: boolean;
  recipientMode: string;
  recipientStaffIds: number[] | null;
  recipientRoles: string[] | null;
}

interface StaffMember {
  id: number;
  name: string;
  phone: string | null;
  role: string | null;
  isActive: boolean;
}

interface Property {
  id: number;
  name: string;
}

const ROLE_OPTIONS = [
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
  { value: "kitchen", label: "Kitchen" },
  { value: "reception", label: "Reception" },
  { value: "housekeeping", label: "Housekeeping" },
  { value: "security", label: "Security" },
];

const RECIPIENT_MODES = [
  { value: "property_contact", label: "Property contact number", description: "Send to the main contact phone set on the property", icon: Phone },
  { value: "all_staff", label: "All active staff", description: "Send to every staff member with a phone number", icon: Users },
  { value: "selected_staff", label: "Selected staff members", description: "Pick specific people who get the alert", icon: User },
  { value: "by_role", label: "By role", description: "All active staff with the selected roles", icon: Users },
];

function PropertyRuleEditor({
  config,
  propertyId,
  staff,
}: {
  config: AlertConfig;
  propertyId: number;
  staff: StaffMember[];
}) {
  const { toast } = useToast();

  const { data: rules = [], isLoading: rulesLoading } = useQuery<AlertRule[]>({
    queryKey: ["/api/whatsapp-alerts/rules", propertyId],
    queryFn: () =>
      fetch(`/api/whatsapp-alerts/rules?propertyId=${propertyId}`)
        .then(r => r.json()),
    enabled: !!propertyId,
  });

  const existingRule = rules.find(r => r.templateKey === config.templateKey);

  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [recipientMode, setRecipientMode] = useState<string>("property_contact");
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!rulesLoading && !initialized) {
      setIsEnabled(existingRule?.isEnabled ?? false);
      setRecipientMode(existingRule?.recipientMode ?? "property_contact");
      setSelectedStaffIds(existingRule?.recipientStaffIds ?? []);
      setSelectedRoles(existingRule?.recipientRoles ?? []);
      setInitialized(true);
    }
  }, [rulesLoading, existingRule, initialized]);

  const isDirty =
    isEnabled !== (existingRule?.isEnabled ?? false) ||
    recipientMode !== (existingRule?.recipientMode ?? "property_contact") ||
    JSON.stringify(selectedStaffIds.sort()) !== JSON.stringify((existingRule?.recipientStaffIds ?? []).slice().sort()) ||
    JSON.stringify(selectedRoles.sort()) !== JSON.stringify((existingRule?.recipientRoles ?? []).slice().sort());

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest("PUT", `/api/whatsapp-alerts/rules/${config.templateKey}/${propertyId}`, {
        isEnabled,
        recipientMode,
        recipientStaffIds: recipientMode === "selected_staff" ? selectedStaffIds : null,
        recipientRoles: recipientMode === "by_role" ? selectedRoles : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-alerts/rules", propertyId] });
      toast({ title: "Saved", description: "Recipient rule updated." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (rulesLoading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  const toggleStaff = (id: number) =>
    setSelectedStaffIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleRole = (role: string) =>
    setSelectedRoles(prev => prev.includes(role) ? prev.filter(x => x !== role) : [...prev, role]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Switch
          checked={isEnabled}
          onCheckedChange={setIsEnabled}
          data-testid={`toggle-enabled-${config.templateKey}-${propertyId}`}
        />
        <Label className="font-medium">{isEnabled ? "Enabled for this property" : "Disabled for this property"}</Label>
      </div>

      {isEnabled && (
        <div className="space-y-3 pl-1">
          <p className="text-sm font-medium text-foreground">Who should receive this alert?</p>
          <RadioGroup
            value={recipientMode}
            onValueChange={setRecipientMode}
            data-testid={`recipient-mode-${config.templateKey}-${propertyId}`}
          >
            {RECIPIENT_MODES.map(mode => (
              <div key={mode.value} className="flex items-start gap-3 py-2">
                <RadioGroupItem value={mode.value} id={`${config.templateKey}-${propertyId}-${mode.value}`} className="mt-0.5" />
                <div>
                  <label
                    htmlFor={`${config.templateKey}-${propertyId}-${mode.value}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {mode.label}
                  </label>
                  <p className="text-xs text-muted-foreground">{mode.description}</p>
                </div>
              </div>
            ))}
          </RadioGroup>

          {recipientMode === "selected_staff" && (
            <div className="space-y-2 pl-1 border-l-2 border-muted ml-1 pl-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Select staff</p>
              {staff.length === 0 ? (
                <p className="text-sm text-muted-foreground">No staff members found for this property.</p>
              ) : (
                <div className="space-y-2">
                  {staff.map(s => (
                    <div key={s.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`staff-${s.id}`}
                        checked={selectedStaffIds.includes(s.id)}
                        onCheckedChange={() => toggleStaff(s.id)}
                        data-testid={`checkbox-staff-${s.id}`}
                      />
                      <label htmlFor={`staff-${s.id}`} className="text-sm cursor-pointer flex items-center gap-2">
                        {s.name}
                        {s.role && <Badge variant="outline" className="text-xs">{s.role}</Badge>}
                        {s.phone ? (
                          <span className="text-xs text-muted-foreground">{s.phone}</span>
                        ) : (
                          <span className="text-xs text-destructive">No phone</span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {recipientMode === "by_role" && (
            <div className="space-y-2 pl-1 border-l-2 border-muted ml-1 pl-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Select roles</p>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map(r => (
                  <div key={r.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`role-${r.value}`}
                      checked={selectedRoles.includes(r.value)}
                      onCheckedChange={() => toggleRole(r.value)}
                      data-testid={`checkbox-role-${r.value}`}
                    />
                    <label htmlFor={`role-${r.value}`} className="text-sm cursor-pointer">{r.label}</label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Button
        size="sm"
        disabled={!isDirty || saveMutation.isPending}
        onClick={() => saveMutation.mutate()}
        data-testid={`btn-save-rule-${config.templateKey}-${propertyId}`}
      >
        {saveMutation.isPending ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
        ) : (
          <><CheckCircle2 className="h-4 w-4 mr-2" />Save Changes</>
        )}
      </Button>
    </div>
  );
}

export default function WhatsappAlerts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Record<string, number | null>>({});

  const { data: configs = [], isLoading: configsLoading } = useQuery<AlertConfig[]>({
    queryKey: ["/api/whatsapp-alerts/configs"],
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const [staffCache, setStaffCache] = useState<Record<number, StaffMember[]>>({});

  const fetchStaff = async (propertyId: number) => {
    if (staffCache[propertyId]) return;
    const res = await fetch(`/api/whatsapp-alerts/staff/${propertyId}`);
    const data = await res.json();
    setStaffCache(prev => ({ ...prev, [propertyId]: data }));
  };

  const globalToggleMutation = useMutation({
    mutationFn: ({ key, isGloballyEnabled }: { key: string; isGloballyEnabled: boolean }) =>
      apiRequest("PUT", `/api/whatsapp-alerts/configs/${key}`, { isGloballyEnabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-alerts/configs"] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const activeProperties = (properties as Property[]).filter((p: any) => p.isActive !== false);

  return (
    <div className="container max-w-4xl mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <BellRing className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp Alert Controls</h1>
          <p className="text-sm text-muted-foreground">Control who receives staff WhatsApp alerts, per property and per template.</p>
        </div>
      </div>

      {configsLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading templates…
        </div>
      ) : configs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No alert templates configured yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {configs.map(config => (
            <Card key={config.templateKey} className="border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{config.templateName}</CardTitle>
                      <Badge variant="outline" className="text-xs font-mono">WID {config.templateWid}</Badge>
                    </div>
                    {config.description && (
                      <CardDescription className="text-sm">{config.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Label className="text-sm text-muted-foreground">
                      {config.isGloballyEnabled ? "Globally ON" : "Globally OFF"}
                    </Label>
                    <Switch
                      checked={config.isGloballyEnabled}
                      onCheckedChange={enabled =>
                        globalToggleMutation.mutate({ key: config.templateKey, isGloballyEnabled: enabled })
                      }
                      data-testid={`toggle-global-${config.templateKey}`}
                    />
                  </div>
                </div>
              </CardHeader>

              {config.isGloballyEnabled && (
                <>
                  <Separator />
                  <CardContent className="pt-4 space-y-4">
                    <div className="space-y-1">
                      <Label className="text-sm font-semibold">Property</Label>
                      <p className="text-xs text-muted-foreground">Select a property to configure who gets this alert there.</p>
                      <Select
                        value={selectedPropertyIds[config.templateKey] ? String(selectedPropertyIds[config.templateKey]) : ""}
                        onValueChange={v => {
                          const pid = Number(v);
                          setSelectedPropertyIds(prev => ({ ...prev, [config.templateKey]: pid }));
                          fetchStaff(pid);
                        }}
                      >
                        <SelectTrigger className="w-full max-w-xs" data-testid={`select-property-${config.templateKey}`}>
                          <SelectValue placeholder="Select a property…" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeProperties.map((p: Property) => (
                            <SelectItem key={p.id} value={String(p.id)} data-testid={`option-property-${p.id}`}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedPropertyIds[config.templateKey] && (
                      <div className="pt-2">
                        <PropertyRuleEditor
                          config={config}
                          propertyId={selectedPropertyIds[config.templateKey]!}
                          staff={staffCache[selectedPropertyIds[config.templateKey]!] || []}
                        />
                      </div>
                    )}
                  </CardContent>
                </>
              )}
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-4">
          <p className="text-xs text-muted-foreground">
            <strong>How it works:</strong> When an order alert fires, the system checks these settings first.
            If globally OFF, no message is sent. If globally ON, it checks the property rule — if there's no rule saved yet,
            no message is sent for that property. Use "Property contact number" to keep the current behaviour
            (sends to the number set under Properties → Edit → Contact Phone).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
