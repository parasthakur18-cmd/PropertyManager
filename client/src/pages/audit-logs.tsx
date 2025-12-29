import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { format } from "date-fns";
import { Shield, Calendar, User, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditLogEntry {
  id: number;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  userName?: string;
  userRole?: string;
  propertyContext?: number[] | null;
  changeSet?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
}

export default function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: logs, isLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ["/api/audit-logs"],
  });

  const filteredLogs = logs?.filter(log =>
    log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entityId.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getActionColor = (action: string) => {
    if (action === "create") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    if (action === "update") return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    if (action === "delete") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  };

  const getEntityIcon = (entityType: string) => {
    switch(entityType) {
      case "booking": return "📅";
      case "guest": return "👤";
      case "payment": return "💳";
      case "bill": return "📄";
      case "room": return "🚪";
      case "order": return "🍽️";
      default: return "📋";
    }
  };

  // Helper to get only changed fields between before and after
  const getChangedFields = (before: Record<string, any> | null, after: Record<string, any> | null) => {
    if (!before && !after) return [];
    if (!before) return Object.entries(after || {}).map(([key, value]) => ({ field: key, oldValue: null, newValue: value }));
    if (!after) return Object.entries(before).map(([key, value]) => ({ field: key, oldValue: value, newValue: null }));
    
    const changes: { field: string; oldValue: any; newValue: any }[] = [];
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    
    allKeys.forEach(key => {
      const oldVal = before[key];
      const newVal = after[key];
      // Only show if values are different
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ field: key, oldValue: oldVal, newValue: newVal });
      }
    });
    
    return changes;
  };

  // Format field name to be more readable
  const formatFieldName = (field: string) => {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Format value for display
  const formatValue = (value: any) => {
    if (value === null || value === undefined) return <span className="text-muted-foreground italic">empty</span>;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-slate-900 dark:text-white" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Audit Trail</h1>
          </div>
          <p className="text-muted-foreground">Track all system activities and user actions</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Search by entity type, action, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
            data-testid="input-audit-search"
          />
        </div>

        {/* Logs List */}
        <div className="space-y-3">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-24" />
                </CardContent>
              </Card>
            ))
          ) : filteredLogs.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No audit logs found</p>
            </Card>
          ) : (
            filteredLogs.map(log => (
              <Card key={log.id} className="overflow-hidden hover-elevate" data-testid={`card-audit-${log.id}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{getEntityIcon(log.entityType)}</span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-900 dark:text-white capitalize">
                              {log.entityType}
                            </span>
                            <Badge className={getActionColor(log.action)}>
                              {log.action.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">ID: {log.entityId}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mt-3 pt-3 border-t border-border">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-foreground">
                              {log.userName && log.userName.trim() ? log.userName : log.userId || "Unknown User"}
                            </div>
                            <div className="text-xs text-muted-foreground capitalize">{log.userRole || "N/A"}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(log.createdAt), "MMM dd, yyyy HH:mm")}</span>
                        </div>
                        {log.propertyContext && (
                          <div className="text-muted-foreground">
                            <span>Properties: {log.propertyContext.join(", ")}</span>
                          </div>
                        )}
                      </div>

                      {/* Show detailed changes */}
                      {log.changeSet && (log.changeSet.before || log.changeSet.after) ? (
                        <div className="mt-4">
                          <div className="text-xs font-semibold text-foreground mb-2">Changes Made:</div>
                          <div className="bg-muted/50 rounded-lg border overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b bg-muted/80">
                                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Field</th>
                                  <th className="text-left px-3 py-2 font-medium text-red-600 dark:text-red-400">Before</th>
                                  <th className="text-left px-3 py-2 font-medium text-green-600 dark:text-green-400">After</th>
                                </tr>
                              </thead>
                              <tbody>
                                {getChangedFields(log.changeSet.before, log.changeSet.after).map((change, idx) => (
                                  <tr key={idx} className="border-b last:border-0">
                                    <td className="px-3 py-2 font-medium text-foreground">{formatFieldName(change.field)}</td>
                                    <td className="px-3 py-2 text-red-600 dark:text-red-400 font-mono text-xs">{formatValue(change.oldValue)}</td>
                                    <td className="px-3 py-2 text-green-600 dark:text-green-400 font-mono text-xs">{formatValue(change.newValue)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 text-xs text-muted-foreground italic">
                          No change details recorded for this action.
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Results count */}
        {!isLoading && (
          <div className="mt-6 text-sm text-muted-foreground text-center">
            Showing {filteredLogs.length} of {logs?.length || 0} audit log entries
          </div>
        )}
      </div>
    </div>
  );
}
