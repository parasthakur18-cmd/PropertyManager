import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from "date-fns";
import { CalendarDays, CheckCircle, XCircle, AlertCircle, TrendingDown, Plus } from "lucide-react";

const attendanceFormSchema = z.object({
  staffMemberId: z.string().optional(),
  attendanceDate: z.string().min(1, "Date is required"),
  status: z.enum(["present", "absent", "leave", "half-day"]),
  remarks: z.string().optional(),
});

const addStaffSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  propertyId: z.string().min(1, "Property is required"),
});

interface AttendanceStats {
  staffId: string;
  staffName: string;
  totalWorkDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  halfDays: number;
  attendancePercentage: number;
  deductionPerDay: number;
  totalDeduction: number;
  baseSalary: number;
  netSalary: number;
}

export default function Attendance() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddStaffDialogOpen, setIsAddStaffDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);

  const { data: properties = [] } = useQuery<any[]>({
    queryKey: ["/api/properties"],
  });

  const { data: staffMembers = [], refetch: refetchStaff } = useQuery<any[]>({
    queryKey: ["/api/staff-members"],
  });

  const { data: attendance = [] } = useQuery<any[]>({
    queryKey: ["/api/attendance", selectedMonth],
    queryFn: async () => {
      const response = await fetch(
        `/api/attendance?month=${selectedMonth.toISOString().slice(0, 7)}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch attendance");
      return response.json();
    },
  });

  const { data: attendanceStats = [] } = useQuery<AttendanceStats[]>({
    queryKey: ["/api/attendance/stats", selectedMonth],
    queryFn: async () => {
      const response = await fetch(
        `/api/attendance/stats?month=${selectedMonth.toISOString().slice(0, 7)}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const form = useForm<z.infer<typeof attendanceFormSchema>>({
    resolver: zodResolver(attendanceFormSchema),
    defaultValues: {
      staffMemberId: "",
      attendanceDate: new Date().toISOString().split("T")[0],
      status: "present",
      remarks: "",
    },
  });

  const addStaffForm = useForm<z.infer<typeof addStaffSchema>>({
    resolver: zodResolver(addStaffSchema),
    defaultValues: {
      name: "",
      jobTitle: "",
      propertyId: "",
    },
  });

  const addStaffMutation = useMutation({
    mutationFn: async (data: z.infer<typeof addStaffSchema>) => {
      return await apiRequest("/api/staff-members", "POST", {
        name: data.name,
        jobTitle: data.jobTitle,
        propertyId: parseInt(data.propertyId),
        baseSalary: 0,
      });
    },
    onSuccess: () => {
      refetchStaff();
      setIsAddStaffDialogOpen(false);
      addStaffForm.reset();
      toast({
        title: "Success",
        description: "Staff member added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add staff member",
        variant: "destructive",
      });
    },
  });

  const createAttendanceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof attendanceFormSchema>) => {
      return await apiRequest("/api/attendance", "POST", {
        staffMemberId: data.staffMemberId,
        attendanceDate: new Date(data.attendanceDate),
        status: data.status,
        remarks: data.remarks || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/stats"] });
      toast({
        title: "Success",
        description: "Attendance recorded successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record attendance",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: z.infer<typeof attendanceFormSchema>) => {
    createAttendanceMutation.mutate(data);
  };

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
    .filter(day => !isWeekend(day));

  const getStaffStats = (staffId: string) => {
    return attendanceStats.find(s => s.staffId === staffId);
  };

  const getAttendanceForDate = (staffId: string, date: Date) => {
    return attendance.find(a => 
      a.staffMemberId === staffId && 
      format(new Date(a.attendanceDate), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "absent":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "leave":
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      case "half-day":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <CalendarDays className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Attendance & Salary Management
          </h1>
          <p className="text-muted-foreground">
            Track attendance and automatic salary deductions
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-record-attendance">
              <CalendarDays className="h-4 w-4 mr-2" />
              Record Attendance
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-attendance-form">
            <DialogHeader>
              <DialogTitle>Record Attendance</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="staffMemberId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Staff Member (Optional)</FormLabel>
                      <div className="flex gap-2">
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-staff" className="flex-1">
                              <SelectValue placeholder="Select staff member" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {staffMembers.map((staff) => (
                              <SelectItem key={staff.id} value={String(staff.id)}>
                                {staff.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          type="button" 
                          size="icon" 
                          variant="outline" 
                          data-testid="button-add-staff"
                          onClick={() => setIsAddStaffDialogOpen(true)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="attendanceDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          data-testid="input-attendance-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                          <SelectItem value="leave">Leave</SelectItem>
                          <SelectItem value="half-day">Half Day</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remarks (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Add notes..."
                          data-testid="textarea-remarks"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={createAttendanceMutation.isPending}
                  data-testid="button-submit"
                >
                  {createAttendanceMutation.isPending ? "Recording..." : "Record"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isAddStaffDialogOpen} onOpenChange={setIsAddStaffDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
            </DialogHeader>
            <Form {...addStaffForm}>
              <form onSubmit={addStaffForm.handleSubmit((data) => addStaffMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={addStaffForm.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-property">
                            <SelectValue placeholder="Select property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties.map((property) => (
                            <SelectItem key={property.id} value={String(property.id)}>
                              {property.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addStaffForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., John Doe" data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addStaffForm.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Manager, Chef, Housekeeper" data-testid="input-job-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={addStaffMutation.isPending} className="w-full">
                  {addStaffMutation.isPending ? "Adding..." : "Add Staff Member"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Month Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Month</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="month"
            value={selectedMonth.toISOString().slice(0, 7)}
            onChange={(e) => setSelectedMonth(new Date(e.target.value + "-01"))}
            data-testid="input-month-selector"
          />
        </CardContent>
      </Card>

      {/* Attendance Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {attendanceStats.slice(0, 4).map((stat) => (
          <Card key={stat.staffId}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{stat.staffName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Attendance:</span>
                <Badge variant="default">{stat.attendancePercentage.toFixed(1)}%</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Absents:</span>
                <span className="font-semibold text-red-600">{stat.absentDays}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base Salary:</span>
                <span className="font-mono">₹{stat.baseSalary.toLocaleString()}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                <span>Net Salary:</span>
                <span className="text-green-600">₹{stat.netSalary.toLocaleString()}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Deduction: ₹{stat.totalDeduction.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Attendance Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Attendance Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 overflow-x-auto">
            {staffMembers.map((staff) => (
              <div key={staff.id} className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">{staff.name} - {staff.jobTitle}</h3>
                <div className="grid grid-cols-7 gap-2">
                  {daysInMonth.map((day) => {
                    const dayAttendance = getAttendanceForDate(staff.id, day);
                    const status = dayAttendance?.status || "unmarked";
                    return (
                      <div
                        key={day.toString()}
                        className="flex flex-col items-center p-2 rounded border text-xs"
                        data-testid={`attendance-cell-${format(day, "yyyy-MM-dd")}`}
                      >
                        <span className="font-medium">{format(day, "d")}</span>
                        <div className="mt-1">
                          {status === "unmarked" ? (
                            <div className="h-5 w-5 border-2 border-dashed border-gray-300 rounded"></div>
                          ) : (
                            getStatusIcon(status)
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Salary Calculation Formula */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Salary Calculation Formula
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="bg-muted p-4 rounded-lg space-y-2 font-mono">
            <div><strong>Working Days in Month:</strong> Total weekdays (excluding weekends)</div>
            <div><strong>Per Day Deduction:</strong> Base Salary ÷ Working Days</div>
            <div><strong>Absence Deduction:</strong> Per Day Rate × Number of Absences</div>
            <div className="border-t pt-2 text-base">
              <strong>Net Salary = Base Salary - Absence Deduction - Advances</strong>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded text-blue-900 dark:text-blue-100">
            💡 <strong>Example:</strong> If base salary is ₹30,000 and there are 5 absences in a month with 20 working days:
            <br/>Per day rate = ₹30,000 ÷ 20 = ₹1,500
            <br/>Deduction = ₹1,500 × 5 = ₹7,500
            <br/>Net Salary = ₹30,000 - ₹7,500 = ₹22,500
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
