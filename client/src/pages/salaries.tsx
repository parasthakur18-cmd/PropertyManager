import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calendar, DollarSign, TrendingDown, Users, AlertCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

export default function SalariesPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().split('T')[0].slice(0, 7); // YYYY-MM format
  });
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const { toast } = useToast();

  // Parse selected month to get start and end dates
  const [year, month] = selectedMonth.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = endOfMonth(startDate);

  // Fetch user to get properties
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Set default property
  const propertyId = selectedPropertyId || (currentUser?.assignedPropertyIds?.[0] || 1);

  // Fetch detailed staff salaries
  const { data: salaries = [], isLoading, error } = useQuery({
    queryKey: ["/api/staff-salaries/detailed", propertyId, startDate, endDate],
    queryFn: async () => {
      const response = await fetch(
        `/api/staff-salaries/detailed?propertyId=${propertyId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        if (response.status === 403) {
          toast({ title: "Error", description: "You don't have access to this property", variant: "destructive" });
        }
        throw new Error("Failed to fetch salary details");
      }
      return response.json();
    },
    enabled: !!propertyId,
  });

  // Calculate totals
  const totals = {
    totalBaseSalary: salaries.reduce((sum, s) => sum + s.baseSalary, 0),
    totalDeductions: salaries.reduce((sum, s) => sum + s.attendanceDeductions, 0),
    totalAdvances: salaries.reduce((sum, s) => sum + s.totalAdvances, 0),
    totalFinalSalary: salaries.reduce((sum, s) => sum + s.finalSalary, 0),
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-4xl font-bold" data-testid="text-page-title">
            Staff Salary Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Complete salary breakdown with attendance deductions and advances
          </p>
        </div>

        {/* Month & Property Selection */}
        <div className="flex gap-4 items-end">
          <div className="flex-1 max-w-xs">
            <Label htmlFor="month-select">Select Month</Label>
            <Input
              id="month-select"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              data-testid="input-month-select"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold">{format(startDate, "MMMM yyyy")}</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Base Salary</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-base-salary">
              ₹{totals.totalBaseSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">{salaries.length} staff members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Deductions</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-total-deductions">
              -₹{totals.totalDeductions.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">From absences & half-days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Advances</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-total-advances">
              -₹{totals.totalAdvances.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">To be deducted from salary</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Final Salary</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-total-final-salary">
              ₹{totals.totalFinalSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">To be paid to staff</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="cards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cards" data-testid="tab-cards-view">
            Staff Cards
          </TabsTrigger>
          <TabsTrigger value="table" data-testid="tab-table-view">
            Detailed Table
          </TabsTrigger>
        </TabsList>

        {/* Cards View */}
        <TabsContent value="cards" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading salary data...</div>
          ) : error ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-red-700">Failed to load salary data. Please try again.</p>
              </CardContent>
            </Card>
          ) : salaries.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12 text-muted-foreground">
                No staff members found for this property
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
              {salaries.map((staff) => (
                <Card key={staff.staffId} className="hover-elevate" data-testid={`card-staff-${staff.staffId}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{staff.staffName}</CardTitle>
                        <p className="text-sm text-muted-foreground">{staff.jobTitle}</p>
                      </div>
                      <Badge
                        variant={
                          staff.status === 'paid'
                            ? 'default'
                            : staff.status === 'pending'
                            ? 'secondary'
                            : 'destructive'
                        }
                        data-testid={`badge-status-${staff.staffId}`}
                      >
                        {staff.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Salary Breakdown */}
                    <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                      <div>
                        <p className="text-xs text-muted-foreground">Base Salary</p>
                        <p className="font-semibold">
                          ₹{staff.baseSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Daily Rate</p>
                        <p className="font-semibold">
                          ₹{staff.dailyRate.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>

                    {/* Attendance Summary */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Attendance</p>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="p-2 bg-green-50 rounded">
                          <p className="text-sm font-bold text-green-700">{staff.presentDays}</p>
                          <p className="text-xs text-muted-foreground">Present</p>
                        </div>
                        <div className="p-2 bg-red-50 rounded">
                          <p className="text-sm font-bold text-red-700">{staff.absentDays}</p>
                          <p className="text-xs text-muted-foreground">Absent</p>
                        </div>
                        <div className="p-2 bg-blue-50 rounded">
                          <p className="text-sm font-bold text-blue-700">{staff.leaveDays}</p>
                          <p className="text-xs text-muted-foreground">Leave</p>
                        </div>
                        <div className="p-2 bg-yellow-50 rounded">
                          <p className="text-sm font-bold text-yellow-700">{staff.halfDays}</p>
                          <p className="text-xs text-muted-foreground">Half-day</p>
                        </div>
                      </div>
                    </div>

                    {/* Deductions */}
                    <div className="space-y-2 pb-4 border-b">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">Attendance Deductions</p>
                        <p className="font-semibold text-red-600">
                          -₹{staff.attendanceDeductions.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      {staff.advances.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Advances Deducted ({staff.advances.length})</p>
                          {staff.advances.map((adv) => (
                            <div key={adv.id} className="ml-2 text-xs text-muted-foreground flex justify-between">
                              <span>{adv.reason || 'Advance'} - {format(new Date(adv.date), 'MMM dd')}</span>
                              <span>₹{adv.amount.toLocaleString('en-IN')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2 border-t">
                        <p className="text-sm font-semibold">Total Advances</p>
                        <p className="font-semibold text-orange-600">
                          -₹{staff.totalAdvances.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>

                    {/* Final Salary (Highlighted) */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-200">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">FINAL PENDING SALARY</p>
                      <p className="text-3xl font-bold text-green-700" data-testid={`text-final-salary-${staff.staffId}`}>
                        ₹{staff.finalSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {staff.baseSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })} - {staff.attendanceDeductions.toLocaleString('en-IN', { maximumFractionDigits: 0 })} - {staff.totalAdvances.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Table View */}
        <TabsContent value="table" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staff Salary Details</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : salaries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No staff members found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-semibold">Name</th>
                        <th className="text-left p-3 font-semibold">Job Title</th>
                        <th className="text-right p-3 font-semibold">Base Salary</th>
                        <th className="text-center p-3 font-semibold">Present</th>
                        <th className="text-center p-3 font-semibold">Absent</th>
                        <th className="text-right p-3 font-semibold">Deductions</th>
                        <th className="text-right p-3 font-semibold">Advances</th>
                        <th className="text-right p-3 font-semibold text-green-600">Final Salary</th>
                        <th className="text-center p-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salaries.map((staff) => (
                        <tr key={staff.staffId} className="border-b hover-elevate" data-testid={`row-staff-${staff.staffId}`}>
                          <td className="p-3 font-medium">{staff.staffName}</td>
                          <td className="p-3 text-muted-foreground">{staff.jobTitle}</td>
                          <td className="text-right p-3 font-semibold">
                            ₹{staff.baseSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="text-center p-3">
                            <Badge variant="outline" className="bg-green-50">{staff.presentDays}</Badge>
                          </td>
                          <td className="text-center p-3">
                            <Badge variant="destructive">{staff.absentDays}</Badge>
                          </td>
                          <td className="text-right p-3 text-red-600 font-semibold">
                            -₹{staff.attendanceDeductions.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="text-right p-3 text-orange-600 font-semibold">
                            -₹{staff.totalAdvances.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="text-right p-3 text-green-700 font-bold text-base">
                            ₹{staff.finalSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="text-center p-3">
                            <Badge
                              variant={
                                staff.status === 'paid'
                                  ? 'default'
                                  : staff.status === 'pending'
                                  ? 'secondary'
                                  : 'destructive'
                              }
                            >
                              {staff.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      {/* Totals Row */}
                      <tr className="bg-muted/50 font-bold border-t-2">
                        <td colSpan={2} className="p-3">
                          TOTAL
                        </td>
                        <td className="text-right p-3">
                          ₹{totals.totalBaseSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td colSpan={2} className="text-center p-3">—</td>
                        <td className="text-right p-3 text-red-600">
                          -₹{totals.totalDeductions.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="text-right p-3 text-orange-600">
                          -₹{totals.totalAdvances.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="text-right p-3 text-green-700 text-base">
                          ₹{totals.totalFinalSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
