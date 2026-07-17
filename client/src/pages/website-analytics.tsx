import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { TrendingUp, Users, Calendar, Globe, Building2, Smartphone } from "lucide-react";
import { format, parseISO } from "date-fns";

const COLORS = ["#1E3A5F", "#2BB6A8", "#F2B705", "#e74c3c", "#9b59b6", "#e67e22", "#1abc9c"];

export default function WebsiteAnalytics() {
  const { data: analytics, isLoading } = useQuery<any>({
    queryKey: ["/api/website-leads/analytics/summary"],
    queryFn: () => fetch("/api/website-leads/analytics/summary").then(r => r.json()),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Today", value: analytics?.today ?? 0, icon: Calendar, color: "text-blue-600" },
    { label: "Yesterday", value: analytics?.yesterday ?? 0, icon: Calendar, color: "text-indigo-600" },
    { label: "This Week", value: analytics?.weekly ?? 0, icon: TrendingUp, color: "text-teal-600" },
    { label: "This Month", value: analytics?.monthly ?? 0, icon: Users, color: "text-purple-600" },
    { label: "This Year", value: analytics?.yearly ?? 0, icon: Globe, color: "text-orange-600" },
    { label: "Total", value: analytics?.total ?? 0, icon: Building2, color: "text-gray-600" },
  ];

  const dailyTrend = (analytics?.dailyTrend || []).map((d: any) => ({
    date: d.date ? format(parseISO(String(d.date)), "dd MMM") : "",
    count: parseInt(d.count || 0),
  }));

  const byStatus = (analytics?.byStatus || []).map((s: any) => ({
    name: s.lead_status,
    value: parseInt(s.count || 0),
  }));

  const bySource = (analytics?.bySource || []).map((s: any) => ({
    name: s.source,
    value: parseInt(s.count || 0),
  }));

  const byProperty = (analytics?.byProperty || []).map((p: any) => ({
    name: p.property,
    count: parseInt(p.count || 0),
  }));

  const byRoomType = (analytics?.byRoomType || []).map((r: any) => ({
    name: r.room_type,
    count: parseInt(r.count || 0),
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Website Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Lead performance and conversion insights</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.label} data-testid={`card-kpi-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">{kpi.label}</span>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Daily Leads (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyTrend.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#2BB6A8" strokeWidth={2} dot={{ r: 3 }} name="Leads" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {byStatus.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No data</div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={200}>
                  <PieChart>
                    <Pie data={byStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                      {byStatus.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {byStatus.map((s: any, i: number) => (
                    <div key={s.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="capitalize">{s.name}</span>
                      </div>
                      <Badge variant="secondary">{s.value}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lead Source Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" /> Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            {bySource.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={bySource} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1E3A5F" radius={[0, 4, 4, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Property-wise */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Property-wise Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {byProperty.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byProperty}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2BB6A8" radius={[4, 4, 0, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Most Requested Rooms */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Smartphone className="h-4 w-4" /> Most Requested Rooms</CardTitle>
          </CardHeader>
          <CardContent>
            {byRoomType.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No data</div>
            ) : (
              <div className="space-y-3">
                {byRoomType.slice(0, 8).map((r: any, i: number) => {
                  const maxCount = byRoomType[0]?.count || 1;
                  const pct = Math.round((r.count / maxCount) * 100);
                  return (
                    <div key={r.name} className="space-y-1" data-testid={`room-type-${i}`}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate max-w-[200px]">{r.name}</span>
                        <Badge variant="outline">{r.count}</Badge>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
