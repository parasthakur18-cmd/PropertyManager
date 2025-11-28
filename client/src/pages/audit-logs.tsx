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
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>{log.userRole || "Unknown"}</span>
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

                      {/* Show changes if available */}
                      {log.changeSet && (log.changeSet.before || log.changeSet.after) && (
                        <div className="mt-3 text-xs bg-muted p-3 rounded font-mono text-muted-foreground overflow-auto max-h-32">
                          {log.changeSet.before && (
                            <div>
                              <span className="text-red-600 dark:text-red-400">Before: </span>
                              {JSON.stringify(log.changeSet.before).substring(0, 150)}...
                            </div>
                          )}
                          {log.changeSet.after && (
                            <div>
                              <span className="text-green-600 dark:text-green-400">After: </span>
                              {JSON.stringify(log.changeSet.after).substring(0, 150)}...
                            </div>
                          )}
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
