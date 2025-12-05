import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import type { Property } from "@shared/schema";
import { 
  TrendingUp, 
  TrendingDown, 
  IndianRupee, 
  Building2, 
  FileText,
  Download,
  Calendar,
  Users,
  Home,
  Utensils,
  Receipt
} from "lucide-react";
import { format } from "date-fns";

interface PnLData {
  leaseId: number;
  leaseStartDate: string;
  leaseEndDate: string;
  landlordName: string;
  totalLeaseAmount: number;
  totalRevenue: number;
  totalExpenses: number;
  totalSalaries: number;
  expensesByCategory: { category: string; total: number }[];
  finalProfit: number;
  profitMargin: string;
}

interface PnLReport {
  propertyId: number;
  leaseId: number | null;
  pnlData: PnLData[];
  totalRevenue: number;
  totalLeaseAmount: number;
  totalExpenses: number;
  totalSalaries: number;
  totalCosts: number;
  finalProfit: number;
  profitMargin: string;
  message?: string;
}

export default function PnLStatement() {
  const { user } = useAuth();
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [selectedLeaseId, setSelectedLeaseId] = useState<number | null>(null);

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const availableProperties = properties.filter(p => {
    if (user?.role === 'admin') return true;
    const assignedIds = user?.assignedPropertyIds || [];
    return assignedIds.includes(String(p.id));
  });

  const { data: leases = [] } = useQuery<any[]>({
    queryKey: ["/api/leases"],
  });

  const propertyLeases = selectedPropertyId 
    ? leases.filter(l => l.propertyId === selectedPropertyId)
    : [];

  const { data: pnlReport, isLoading, error } = useQuery<PnLReport>({
    queryKey: ["/api/properties", selectedPropertyId, "pnl", selectedLeaseId],
    queryFn: async () => {
      if (!selectedPropertyId) return null;
      const url = selectedLeaseId 
        ? `/api/properties/${selectedPropertyId}/pnl?leaseId=${selectedLeaseId}`
        : `/api/properties/${selectedPropertyId}/pnl`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch P&L report");
      return response.json();
    },
    enabled: !!selectedPropertyId,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const exportToPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Profit & Loss Statement
            </h1>
            <p className="text-muted-foreground mt-1">
              Complete financial overview including revenue, expenses, leases, and salaries
            </p>
          </div>
          {pnlReport && pnlReport.pnlData.length > 0 && (
            <Button variant="outline" onClick={exportToPDF} data-testid="button-export-pnl">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={selectedPropertyId?.toString() || ""}
                  onValueChange={(value) => {
                    setSelectedPropertyId(parseInt(value));
                    setSelectedLeaseId(null);
                  }}
                >
                  <SelectTrigger className="w-[200px]" data-testid="select-pnl-property">
                    <SelectValue placeholder="Select Property" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProperties.map((property) => (
                      <SelectItem 
                        key={property.id} 
                        value={property.id.toString()}
                        data-testid={`select-pnl-property-${property.id}`}
                      >
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPropertyId && propertyLeases.length > 0 && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={selectedLeaseId?.toString() || "all"}
                    onValueChange={(value) => setSelectedLeaseId(value === "all" ? null : parseInt(value))}
                  >
                    <SelectTrigger className="w-[250px]" data-testid="select-pnl-lease">
                      <SelectValue placeholder="All Lease Periods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" data-testid="select-pnl-lease-all">All Lease Periods</SelectItem>
                      {propertyLeases.map((lease) => (
                        <SelectItem 
                          key={lease.id} 
                          value={lease.id.toString()}
                          data-testid={`select-pnl-lease-${lease.id}`}
                        >
                          {format(new Date(lease.startDate), "MMM yyyy")} - {lease.endDate ? format(new Date(lease.endDate), "MMM yyyy") : "Present"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* No Property Selected */}
        {!selectedPropertyId && (
          <Card className="py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Select a Property</h3>
              <p className="text-muted-foreground max-w-md mt-1">
                Choose a property from the dropdown above to view its complete Profit & Loss statement
              </p>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {selectedPropertyId && isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </div>
        )}

        {/* No Leases Found */}
        {selectedPropertyId && pnlReport?.message && (
          <Card className="py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Lease Records</h3>
              <p className="text-muted-foreground max-w-md mt-1">
                {pnlReport.message}. Add a lease agreement to generate P&L reports.
              </p>
            </CardContent>
          </Card>
        )}

        {/* P&L Report */}
        {selectedPropertyId && pnlReport && pnlReport.pnlData.length > 0 && (
          <div className="space-y-6 print:space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600" data-testid="text-pnl-revenue">
                    {formatCurrency(pnlReport.totalRevenue)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    Total Costs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600" data-testid="text-pnl-costs">
                    {formatCurrency(pnlReport.totalCosts)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <IndianRupee className="h-4 w-4" />
                    Net Profit/Loss
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div 
                    className={`text-2xl font-bold ${pnlReport.finalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    data-testid="text-pnl-profit"
                  >
                    {formatCurrency(pnlReport.finalProfit)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Profit Margin
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div 
                    className={`text-2xl font-bold ${parseFloat(pnlReport.profitMargin) >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    data-testid="text-pnl-margin"
                  >
                    {pnlReport.profitMargin}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed P&L Statement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Detailed Statement
                </CardTitle>
                <CardDescription>
                  Complete breakdown of income and expenses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Revenue Section */}
                <div>
                  <h3 className="font-semibold text-green-600 mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    REVENUE
                  </h3>
                  <div className="space-y-2 pl-6">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        Room Bookings & Services
                      </span>
                      <span className="font-mono font-medium">{formatCurrency(pnlReport.totalRevenue)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-3 mt-2 bg-green-50 dark:bg-green-950/20 px-4 rounded-lg">
                    <span className="font-semibold">Total Revenue</span>
                    <span className="font-mono font-bold text-green-600">{formatCurrency(pnlReport.totalRevenue)}</span>
                  </div>
                </div>

                <Separator />

                {/* Costs Section */}
                <div>
                  <h3 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    COSTS & EXPENSES
                  </h3>
                  <div className="space-y-2 pl-6">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        Property Lease/Rent
                      </span>
                      <span className="font-mono font-medium text-red-600">
                        -{formatCurrency(pnlReport.totalLeaseAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        Staff Salaries
                      </span>
                      <span className="font-mono font-medium text-red-600">
                        -{formatCurrency(pnlReport.totalSalaries)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                        Operating Expenses
                      </span>
                      <span className="font-mono font-medium text-red-600">
                        -{formatCurrency(pnlReport.totalExpenses)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-3 mt-2 bg-red-50 dark:bg-red-950/20 px-4 rounded-lg">
                    <span className="font-semibold">Total Costs</span>
                    <span className="font-mono font-bold text-red-600">-{formatCurrency(pnlReport.totalCosts)}</span>
                  </div>
                </div>

                <Separator />

                {/* Net Profit/Loss */}
                <div className={`p-4 rounded-lg ${pnlReport.finalProfit >= 0 ? 'bg-green-100 dark:bg-green-950/30' : 'bg-red-100 dark:bg-red-950/30'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">NET PROFIT / (LOSS)</span>
                    <span className={`text-2xl font-mono font-bold ${pnlReport.finalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(pnlReport.finalProfit)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Revenue - (Lease + Salaries + Expenses) = Net Profit
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Lease Period Details */}
            {pnlReport.pnlData.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>By Lease Period</CardTitle>
                  <CardDescription>P&L breakdown for each lease agreement</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pnlReport.pnlData.map((lease, index) => (
                      <div key={lease.leaseId} className="p-4 border rounded-lg">
                        <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                          <div>
                            <h4 className="font-semibold">{lease.landlordName}</h4>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(lease.leaseStartDate), "dd MMM yyyy")} - {format(new Date(lease.leaseEndDate), "dd MMM yyyy")}
                            </p>
                          </div>
                          <Badge variant={lease.finalProfit >= 0 ? "default" : "destructive"}>
                            {formatCurrency(lease.finalProfit)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Revenue</span>
                            <p className="font-mono text-green-600">{formatCurrency(lease.totalRevenue)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Lease</span>
                            <p className="font-mono text-red-600">-{formatCurrency(lease.totalLeaseAmount)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Salaries</span>
                            <p className="font-mono text-red-600">-{formatCurrency(lease.totalSalaries)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Expenses</span>
                            <p className="font-mono text-red-600">-{formatCurrency(lease.totalExpenses)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Margin</span>
                            <p className="font-mono">{lease.profitMargin}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Expense Categories */}
            {pnlReport.pnlData[0]?.expensesByCategory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Expense Breakdown</CardTitle>
                  <CardDescription>Operating expenses by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pnlReport.pnlData[0].expensesByCategory.map((cat, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                        <span className="capitalize">{cat.category || "Uncategorized"}</span>
                        <span className="font-mono">{formatCurrency(cat.total)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
