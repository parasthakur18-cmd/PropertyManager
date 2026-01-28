import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, TrendingUp, Users, Award, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface PerformanceUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  totalTasksAssigned: number;
  tasksCompletedOnTime: number;
  tasksCompletedLate: number;
  averageCompletionTimeMinutes: number;
  performanceScore: number;
}

interface TaskLog {
  id: number;
  userId: string;
  userName: string;
  taskType: string;
  taskCount: number;
  reminderCount: number;
  completionTime: number;
  lastRemindedAt: string;
  allTasksCompletedAt: string;
}

export default function Performance() {
  const [activeTab, setActiveTab] = useState("user-performance");

  const { data: userPerformance = [], isLoading: userLoading } = useQuery<PerformanceUser[]>({
    queryKey: ["/api/performance/users"],
  });

  const { data: staffPerformance = [], isLoading: staffLoading } = useQuery<PerformanceUser[]>({
    queryKey: ["/api/performance/staff"],
  });

  const { data: taskLogs = [], isLoading: logsLoading } = useQuery<TaskLog[]>({
    queryKey: ["/api/performance/task-logs"],
  });

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { color: "bg-green-100 dark:bg-green-950", text: "text-green-700 dark:text-green-400", label: "Excellent" };
    if (score >= 75) return { color: "bg-blue-100 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-400", label: "Good" };
    if (score >= 60) return { color: "bg-yellow-100 dark:bg-yellow-950", text: "text-yellow-700 dark:text-yellow-400", label: "Fair" };
    return { color: "bg-red-100 dark:bg-red-950", text: "text-red-700 dark:text-red-400", label: "Needs Improvement" };
  };

  const PerformanceTable = ({ data, isLoading }: { data: PerformanceUser[]; isLoading: boolean }) => {
    if (isLoading) return <Skeleton className="h-96" />;
    if (data.length === 0) return <p className="text-muted-foreground text-center py-8">No performance data available</p>;

    const sorted = [...data].sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0));

    return (
      <div className="space-y-4">
        {sorted.map((user, idx) => {
          const score = user.performanceScore || 0;
          const badge = getScoreBadge(score);
          const completionRate = user.totalTasksAssigned > 0 ? Math.round((user.tasksCompletedOnTime / user.totalTasksAssigned) * 100) : 0;

          return (
            <Card key={user.id} className="hover-elevate cursor-pointer" data-testid={`card-performance-${user.id}`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4 flex-wrap md:flex-nowrap">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 pt-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-sm font-semibold text-primary">#{idx + 1}</span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {user.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{user.totalTasksAssigned} tasks assigned</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-shrink-0">
                    <div className="flex flex-col items-center gap-1 p-2 bg-slate-50 dark:bg-muted rounded">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        <span className="text-xs font-medium">{completionRate}%</span>
                      </div>
                      <span className="text-xs text-muted-foreground">On-time</span>
                    </div>

                    <div className="flex flex-col items-center gap-1 p-2 bg-slate-50 dark:bg-muted rounded">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-blue-600" />
                        <span className="text-xs font-medium">{Math.round(user.averageCompletionTimeMinutes || 0)}m</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Avg time</span>
                    </div>

                    <div className="flex flex-col items-center gap-1 p-2 bg-slate-50 dark:bg-muted rounded">
                      <span className="text-xs font-medium">{user.tasksCompletedLate}</span>
                      <span className="text-xs text-muted-foreground">Late</span>
                    </div>

                    <div className={`flex flex-col items-center gap-1 p-2 rounded ${badge.color}`}>
                      <span className={`text-sm font-bold ${badge.text}`}>{Math.round(score)}</span>
                      <span className={`text-xs ${badge.text}`}>Score</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-8 w-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold">Performance Dashboard</h1>
          </div>
          <p className="text-muted-foreground">Track employee performance, task completion rates, and score points</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:w-auto" data-testid="tabs-performance">
            <TabsTrigger value="user-performance" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">User Performance</span>
            </TabsTrigger>
            <TabsTrigger value="staff-performance" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              <span className="hidden sm:inline">Staff Performance</span>
            </TabsTrigger>
            <TabsTrigger value="score-points" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Score Points</span>
            </TabsTrigger>
          </TabsList>

          {/* User Performance Tab */}
          <TabsContent value="user-performance" className="space-y-4">
            <Card data-testid="card-user-performance">
              <CardHeader>
                <CardTitle>User Performance Metrics</CardTitle>
                <CardDescription>Track admin and manager task completion rates and efficiency</CardDescription>
              </CardHeader>
              <CardContent>
                <PerformanceTable data={userPerformance} isLoading={userLoading} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Performance Tab */}
          <TabsContent value="staff-performance" className="space-y-4">
            <Card data-testid="card-staff-performance">
              <CardHeader>
                <CardTitle>Staff Performance Metrics</CardTitle>
                <CardDescription>Monitor kitchen and operational staff task response times and reliability</CardDescription>
              </CardHeader>
              <CardContent>
                <PerformanceTable data={staffPerformance} isLoading={staffLoading} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Score Points Tab */}
          <TabsContent value="score-points" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card data-testid="card-score-stat-excellent">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">Excellent (90+)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{userPerformance.filter(u => (u.performanceScore || 0) >= 90).length + staffPerformance.filter(s => (s.performanceScore || 0) >= 90).length}</p>
                </CardContent>
              </Card>

              <Card data-testid="card-score-stat-good">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">Good (75-89)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{userPerformance.filter(u => (u.performanceScore || 0) >= 75 && (u.performanceScore || 0) < 90).length + staffPerformance.filter(s => (s.performanceScore || 0) >= 75 && (s.performanceScore || 0) < 90).length}</p>
                </CardContent>
              </Card>

              <Card data-testid="card-score-stat-fair">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Fair (60-74)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{userPerformance.filter(u => (u.performanceScore || 0) >= 60 && (u.performanceScore || 0) < 75).length + staffPerformance.filter(s => (s.performanceScore || 0) >= 60 && (s.performanceScore || 0) < 75).length}</p>
                </CardContent>
              </Card>

              <Card data-testid="card-score-stat-needs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400">Needs Improvement (&lt;60)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{userPerformance.filter(u => (u.performanceScore || 0) < 60).length + staffPerformance.filter(s => (s.performanceScore || 0) < 60).length}</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Task Activity */}
            <Card data-testid="card-recent-activity">
              <CardHeader>
                <CardTitle>Recent Task Activity</CardTitle>
                <CardDescription>Latest task notifications and completions</CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <Skeleton className="h-64" />
                ) : taskLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No recent task activity</p>
                ) : (
                  <div className="space-y-3">
                    {taskLogs.slice(0, 10).map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-muted rounded-md border" data-testid={`row-task-log-${log.id}`}>
                        <div className="flex-shrink-0 pt-0.5">
                          {log.completionTime ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm truncate">{log.userName}</p>
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {log.taskType}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {log.taskCount} items • {log.reminderCount} reminders • {log.completionTime ? `${Math.round(log.completionTime / 60)}h completion` : "Pending"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.lastRemindedAt), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
