import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Search, Filter, Eye, Edit, MessageSquare, Clock, ChevronLeft, ChevronRight,
  Phone, Mail, Calendar, Users, Building2, Globe, TrendingUp, X, Plus,
} from "lucide-react";

const LEAD_STATUSES = ["new", "contacted", "quoted", "follow-up", "converted", "lost", "cancelled"];

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  quoted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "follow-up": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  converted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  lost: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

const PAGE_SIZE = 25;

export default function WebsiteLeads() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [editLead, setEditLead] = useState<any>(null);
  const [noteText, setNoteText] = useState("");
  const [viewMode, setViewMode] = useState<"view" | "edit" | "notes" | "timeline">("view");

  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String(page * PAGE_SIZE),
    ...(search ? { search } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  });

  const { data, isLoading } = useQuery<{ data: any[]; total: number }>({
    queryKey: ["/api/website-leads", params.toString()],
    queryFn: () => fetch(`/api/website-leads?${params}`).then(r => r.json()),
  });

  const { data: leadDetail } = useQuery<any>({
    queryKey: ["/api/website-leads", selectedLead?.id],
    queryFn: () => fetch(`/api/website-leads/${selectedLead?.id}`).then(r => r.json()),
    enabled: !!selectedLead?.id,
  });

  const { data: usersData } = useQuery<any[]>({ queryKey: ["/api/users"] });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/website-leads/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/website-leads"] });
      toast({ title: "Lead updated" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => apiRequest("POST", `/api/website-leads/${id}/notes`, { note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/website-leads", selectedLead?.id] });
      setNoteText("");
      toast({ title: "Note added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/website-leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/website-leads"] });
      setSelectedLead(null);
      toast({ title: "Lead deleted" });
    },
  });

  const leads = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleOpenLead = (lead: any, mode: "view" | "edit" | "notes" | "timeline") => {
    setSelectedLead(lead);
    setEditLead({ leadStatus: lead.leadStatus, assignedTo: lead.assignedTo || "", remarks: lead.remarks || "" });
    setViewMode(mode);
  };

  const handleSaveEdit = () => {
    if (!selectedLead) return;
    updateMutation.mutate({ id: selectedLead.id, data: editLead });
    setSelectedLead(null);
  };

  const handleAddNote = () => {
    if (!noteText.trim() || !selectedLead) return;
    addNoteMutation.mutate({ id: selectedLead.id, note: noteText.trim() });
  };

  const actionIcons: Record<string, string> = {
    lead_created: "🆕",
    status_changed: "🔄",
    note_added: "📝",
    assigned_changed: "👤",
    duplicate_enquiry: "🔁",
    converted: "✅",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Website Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">All enquiries from hotel websites</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">{total} total leads</Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                data-testid="input-search-leads"
                placeholder="Search by name, mobile, email…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {LEAD_STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} className="w-40" placeholder="From date" data-testid="input-date-from" />
            <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} className="w-40" placeholder="To date" data-testid="input-date-to" />
            {(search || statusFilter !== "all" || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); setDateFrom(""); setDateTo(""); setPage(0); }} data-testid="button-clear-filters">
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">Loading leads…</div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
              <Globe className="h-10 w-10 opacity-30" />
              <p>No leads found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    {["Date", "Property", "Guest Name", "Mobile", "Check-in", "Check-out", "Room", "Source", "Status", "Assigned To", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leads.map(lead => (
                    <tr key={lead.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-lead-${lead.id}`}>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {lead.createdAt ? format(new Date(lead.createdAt), "dd MMM yyyy") : "—"}
                        {lead.enquiryCount > 1 && <Badge className="ml-1 text-xs py-0 px-1" variant="secondary">×{lead.enquiryCount}</Badge>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium max-w-[140px] truncate">{lead.propertyName || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">{lead.guestName}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{lead.mobileNumber}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">{lead.checkIn || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">{lead.checkOut || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs max-w-[100px] truncate">{lead.roomType || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">{lead.utmSource || lead.enquirySource || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[lead.leadStatus] || statusColors.new}`}>
                          {lead.leadStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{lead.assignedTo || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleOpenLead(lead, "view")} data-testid={`button-view-lead-${lead.id}`}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleOpenLead(lead, "edit")} data-testid={`button-edit-lead-${lead.id}`}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleOpenLead(lead, "notes")} data-testid={`button-notes-lead-${lead.id}`}><MessageSquare className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleOpenLead(lead, "timeline")} data-testid={`button-timeline-lead-${lead.id}`}><Clock className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} data-testid="button-prev-page"><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} data-testid="button-next-page"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={open => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewMode === "view" && <><Eye className="h-4 w-4" /> Lead Details</>}
              {viewMode === "edit" && <><Edit className="h-4 w-4" /> Edit Lead</>}
              {viewMode === "notes" && <><MessageSquare className="h-4 w-4" /> Notes</>}
              {viewMode === "timeline" && <><Clock className="h-4 w-4" /> Timeline</>}
            </DialogTitle>
            <div className="flex gap-2 pt-2">
              {(["view", "edit", "notes", "timeline"] as const).map(m => (
                <Button key={m} size="sm" variant={viewMode === m ? "default" : "outline"} onClick={() => setViewMode(m)} className="capitalize" data-testid={`button-mode-${m}`}>{m}</Button>
              ))}
            </div>
          </DialogHeader>

          {viewMode === "view" && selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><span className="font-semibold text-lg">{selectedLead.guestName}</span></div>
                  <div className="flex items-center gap-2 text-sm"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{selectedLead.mobileNumber}</div>
                  {selectedLead.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{selectedLead.email}</div>}
                  <div className="flex items-center gap-2 text-sm"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{selectedLead.propertyName}</div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />Check-in: <strong>{selectedLead.checkIn || "—"}</strong></div>
                  <div className="flex items-center gap-2 text-sm"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />Check-out: <strong>{selectedLead.checkOut || "—"}</strong></div>
                  <div className="text-sm">Room: <strong>{selectedLead.roomType || "—"}</strong></div>
                  <div className="text-sm">Adults: <strong>{selectedLead.adults}</strong> | Children: <strong>{selectedLead.children}</strong></div>
                </div>
              </div>
              <div className="border-t pt-3 grid grid-cols-2 gap-3 text-sm">
                <div>Status: <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ml-1 ${statusColors[selectedLead.leadStatus] || ""}`}>{selectedLead.leadStatus}</span></div>
                <div>Assigned: <strong>{selectedLead.assignedTo || "Unassigned"}</strong></div>
                <div>Source: <strong>{selectedLead.utmSource || selectedLead.enquirySource || "—"}</strong></div>
                <div>Device: <strong>{selectedLead.deviceType || "—"}</strong></div>
                <div>Enquiries: <strong>{selectedLead.enquiryCount}</strong></div>
                <div>Last: <strong>{selectedLead.lastEnquiry ? format(new Date(selectedLead.lastEnquiry), "dd MMM yyyy HH:mm") : "—"}</strong></div>
              </div>
              {selectedLead.remarks && <div className="border-t pt-3"><p className="text-sm text-muted-foreground">Remarks</p><p className="text-sm mt-1">{selectedLead.remarks}</p></div>}
              {selectedLead.landingPage && <div className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /><a href={selectedLead.landingPage} target="_blank" className="underline truncate">{selectedLead.landingPage}</a></div>}
              {(user?.role === "admin" || user?.role === "super-admin") && (
                <div className="border-t pt-3 flex justify-end">
                  <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(selectedLead.id)} disabled={deleteMutation.isPending} data-testid="button-delete-lead">Delete Lead</Button>
                </div>
              )}
            </div>
          )}

          {viewMode === "edit" && editLead && (
            <div className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select value={editLead.leadStatus} onValueChange={v => setEditLead((e: any) => ({ ...e, leadStatus: v }))}>
                  <SelectTrigger data-testid="select-edit-status"><SelectValue /></SelectTrigger>
                  <SelectContent>{LEAD_STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assigned To</Label>
                <Input value={editLead.assignedTo} onChange={e => setEditLead((e2: any) => ({ ...e2, assignedTo: e.target.value }))} placeholder="Name or email" data-testid="input-assigned-to" />
              </div>
              <div>
                <Label>Remarks</Label>
                <Textarea value={editLead.remarks} onChange={e => setEditLead((e2: any) => ({ ...e2, remarks: e.target.value }))} rows={4} placeholder="Internal remarks…" data-testid="textarea-remarks" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedLead(null)} data-testid="button-cancel-edit">Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={updateMutation.isPending} data-testid="button-save-edit">Save Changes</Button>
              </DialogFooter>
            </div>
          )}

          {viewMode === "notes" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Type a note…" rows={3} className="flex-1" data-testid="textarea-note" />
                <Button onClick={handleAddNote} disabled={!noteText.trim() || addNoteMutation.isPending} data-testid="button-add-note"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-3">
                {(leadDetail?.history || []).filter((h: any) => h.action === "note_added").map((h: any) => (
                  <div key={h.id} className="bg-muted/40 rounded-lg p-3">
                    <p className="text-sm">{h.newValue}</p>
                    <p className="text-xs text-muted-foreground mt-1">{h.changedBy} · {h.createdAt ? format(new Date(h.createdAt), "dd MMM yyyy HH:mm") : ""}</p>
                  </div>
                ))}
                {(leadDetail?.history || []).filter((h: any) => h.action === "note_added").length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>
                )}
              </div>
            </div>
          )}

          {viewMode === "timeline" && (
            <div className="space-y-3">
              {(leadDetail?.history || []).map((h: any) => (
                <div key={h.id} className="flex gap-3 items-start">
                  <div className="text-xl shrink-0">{actionIcons[h.action] || "ℹ️"}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">{h.action.replace(/_/g, " ")}</p>
                    {h.newValue && <p className="text-xs text-muted-foreground truncate">{h.newValue}</p>}
                    {h.oldValue && h.newValue && h.action !== "note_added" && <p className="text-xs text-muted-foreground">{h.oldValue} → {h.newValue}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">{h.changedBy} · {h.createdAt ? format(new Date(h.createdAt), "dd MMM yyyy HH:mm") : ""}</p>
                  </div>
                </div>
              ))}
              {(leadDetail?.history || []).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No history yet</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
