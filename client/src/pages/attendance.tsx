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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from "date-fns";
import { CalendarDays, CheckCircle, XCircle, AlertCircle, TrendingDown, Plus, Edit2 } from "lucide-react";

const attendanceFormSchema = z.object({
  staffMemberId: z.string().min(1, "Staff member is required"),
  attendanceDate: z.string().min(1, "Date is required"),
  status: z.enum(["present", "absent", "leave", "half-day"]),
  remarks: z.string().optional(),
});

const addStaffSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  propertyId: z.string().min(1, "Property is required"),
  joiningDate: z.string().optional(),
  baseSalary: z.coerce.number().nonnegative("Base salary must be non-negative").optional(),
});

const editStaffSchema = z.object({
  baseSalary: z.coerce.number().nonnegative("Base salary must be non-negative"),
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
  const [isEditStaffDialogOpen, setIsEditStaffDialogOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [rosterDate, setRosterDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: properties = [] } = useQuery<any[]>({
    queryKey: ["/api/properties"],
  });

  const { data: staffMembers = [], refetch: refetchStaff } = useQuery<any[]>({
    queryKey: ["/api/staff-members"],
  });

  const monthString = selectedMonth.toISOString().slice(0, 7);

  const { data: attendance = [] } = useQuery<any[]>({
    queryKey: ["/api/attendance", monthString],
    queryFn: async () => {
      const response = await fetch(
        `/api/attendance?month=${monthString}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch attendance");
      const data = await response.json();
      console.log(`[ATTENDANCE FETCH] Month: ${monthString}, Records returned:`, data);
      return data;
    },
  });

  const { data: attendanceStats = [] } = useQuery<AttendanceStats[]>({
    queryKey: ["/api/attendance/stats", monthString],
    queryFn: async () => {
      const response = await fetch(
        `/api/attendance/stats?month=${monthString}`,
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
      joiningDate: new Date().toISOString().split("T")[0],
      baseSalary: 0,
    },
  });

  const editStaffForm = useForm<z.infer<typeof editStaffSchema>>({
    resolver: zodResolver(editStaffSchema),
    defaultValues: {
      baseSalary: 0,
    },
  });

  const addStaffMutation = useMutation({
    mutationFn: async (data: z.infer<typeof addStaffSchema>) => {
      return await apiRequest("/api/staff-members", "POST", {
        name: data.name,
        jobTitle: data.jobTitle,
        propertyId: parseInt(data.propertyId),
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
        baseSalary: data.baseSalary || 0,
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
    mutationFn: async (data: any) => {
      if (!data.staffMemberId) {
        throw new Error("Staff member is required");
      }
      return await apiRequest("/api/attendance", "POST", {
        staffMemberId: parseInt(data.staffMemberId, 10),
        propertyId: data.propertyId || null,
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

  const editStaffMutation = useMutation({
    mutationFn: async (data: z.infer<typeof editStaffSchema>) => {
      return await apiRequest(`/api/staff-members/${editingStaffId}`, "PATCH", {
        baseSalary: data.baseSalary,
      });
    },
    onSuccess: () => {
      refetchStaff();
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/stats"] });
      setIsEditStaffDialogOpen(false);
      editStaffForm.reset();
      setEditingStaffId(null);
      toast({
        title: "Success",
        description: "Staff salary updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update salary",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: z.infer<typeof attendanceFormSchema>) => {
    createAttendanceMutation.mutate(data);
  };

  const handleRosterStatusChange = (staffMemberId: string, status: string) => {
    const staff = staffMembers.find(s => String(s.id) === staffMemberId);
    createAttendanceMutation.mutate({
      staffMemberId: staffMemberId,
      propertyId: staff?.propertyId || 1,
      attendanceDate: rosterDate,
      status: status as any,
      remarks: "",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present": return "bg-green-100 hover:bg-green-200 text-green-800";
      case "absent": return "bg-red-100 hover:bg-red-200 text-red-800";
      case "leave": return "bg-blue-100 hover:bg-blue-200 text-blue-800";
      case "half-day": return "bg-yellow-100 hover:bg-yellow-200 text-yellow-800";
      default: return "bg-gray-100 hover:bg-gray-200 text-gray-800";
    }
  };

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
    .filter(day => !isWeekend(day));

  const getStaffStats = (staffId: string) => {
    return attendanceStats.find(s => s.staffId === staffId);
  };

  const getAttendanceForDate = (staffId: string | number, date: Date) => {
    const staffIdStr = String(staffId);
    const dateStr = format(date, "yyyy-MM-dd");
    const result = attendance.find(a => {
      // Handle both camelCase and snake_case field names from API
      const actualStaffId = a.staffId !== undefined ? a.staffId : a.staff_id;
      const actualAttendanceDate = a.attendanceDate !== undefined ? a.attendanceDate : a.attendance_date;
      const attendanceDateStr = format(new Date(actualAttendanceDate), "yyyy-MM-dd");
      const isMatch = String(actualStaffId) === staffIdStr && attendanceDateStr === dateStr;
      if (isMatch) {
        console.log(`[MATCH FOUND] Staff: ${staffIdStr}, Date: ${dateStr}, Status: ${a.status}`);
      }
      return isMatch;
    });
    return result;
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
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          Attendance & Salary Management
        </h1>
        <p className="text-muted-foreground">
          Track attendance and automatic salary deductions
        </p>
      </div>

      <Tabs defaultValue="roster" className="w-full">
        <TabsList className="w-full flex flex-col md:flex-row h-auto md:h-10">
          <TabsTrigger value="roster" className="flex-1">Quick Roster</TabsTrigger>
          <TabsTrigger value="individual" className="flex-1">Record Attendance</TabsTrigger>
          <TabsTrigger value="salary" className="flex-1">Salary Management</TabsTrigger>
        </TabsList>

        <TabsContent value="roster" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mark Attendance for All Staff</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Date</label>
                <Input
                  type="date"
                  value={rosterDate}
                  onChange={(e) => setRosterDate(e.target.value)}
                  className="mt-1"
                  data-testid="input-roster-date"
                />
              </div>

              {staffMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No staff members added yet. Click "Add Staff" to add your first staff member.</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted">
                        <th className="text-left p-3 font-semibold">Staff Member</th>
                        <th className="text-center p-3 font-semibold">Present</th>
                        <th className="text-center p-3 font-semibold">Absent</th>
                        <th className="text-center p-3 font-semibold">Leave</th>
                        <th className="text-center p-3 font-semibold">Half Day</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffMembers.map((staff) => {
                        const dayAttendance = getAttendanceForDate(staff.id, new Date(rosterDate));
                        const currentStatus = dayAttendance?.status;
                        return (
                          <tr key={staff.id} className="border-b hover:bg-muted/50">
                            <td className="p-3">
                              <div className="font-medium">{staff.name}</div>
                              <div className="text-xs text-muted-foreground">{staff.jobTitle}</div>
                            </td>
                            <td className="text-center p-2">
                              <Button
                                size="sm"
                                className={currentStatus === "present" ? "bg-green-700 hover:bg-green-800 text-white" : "bg-green-100 hover:bg-green-200 text-green-700"}
                                onClick={() => handleRosterStatusChange(String(staff.id), "present")}
                                data-testid={`button-present-${staff.id}`}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            </td>
                            <td className="text-center p-2">
                              <Button
                                size="sm"
                                className={currentStatus === "absent" ? "bg-red-700 hover:bg-red-800 text-white" : "bg-red-100 hover:bg-red-200 text-red-700"}
                                onClick={() => handleRosterStatusChange(String(staff.id), "absent")}
                                data-testid={`button-absent-${staff.id}`}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </td>
                            <td className="text-center p-2">
                              <Button
                                size="sm"
                                className={currentStatus === "leave" ? "bg-blue-700 hover:bg-blue-800 text-white" : "bg-blue-100 hover:bg-blue-200 text-blue-700"}
                                onClick={() => handleRosterStatusChange(String(staff.id), "leave")}
                                data-testid={`button-leave-${staff.id}`}
                              >
                                <AlertCircle className="h-4 w-4" />
                              </Button>
                            </td>
                            <td className="text-center p-2">
                              <Button
                                size="sm"
                                className={currentStatus === "half-day" ? "bg-yellow-700 hover:bg-yellow-800 text-white" : "bg-yellow-100 hover:bg-yellow-200 text-yellow-700"}
                                onClick={() => handleRosterStatusChange(String(staff.id), "half-day")}
                                data-testid={`button-half-day-${staff.id}`}
                              >
                                <AlertCircle className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={() => setIsAddStaffDialogOpen(true)} 
                  variant="outline"
                  data-testid="button-add-staff-roster"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Staff Member
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Salary Summary</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Month: {format(selectedMonth, "MMMM yyyy")}
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted">
                      <th className="text-left p-3 font-semibold">Staff Member</th>
                      <th className="text-right p-3 font-semibold">Base Salary</th>
                      <th className="text-center p-3 font-semibold">Absents</th>
                      <th className="text-right p-3 font-semibold">Deduction/Day</th>
                      <th className="text-right p-3 font-semibold">Total Deduction</th>
                      <th className="text-right p-3 font-semibold">Net Salary</th>
                      <th className="text-center p-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceStats.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-muted-foreground">
                          No salary data available for this month
                        </td>
                      </tr>
                    ) : (
                      attendanceStats.map((stat) => (
                        <tr key={stat.staffId} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-medium">{stat.staffName}</td>
                          <td className="text-right p-3 font-mono">₹{stat.baseSalary.toLocaleString()}</td>
                          <td className="text-center p-3">
                            <Badge variant={stat.absentDays > 0 ? "destructive" : "secondary"}>
                              {stat.absentDays}
                            </Badge>
                          </td>
                          <td className="text-right p-3 font-mono">₹{stat.deductionPerDay.toLocaleString()}</td>
                          <td className="text-right p-3 font-mono text-red-600">₹{stat.totalDeduction.toLocaleString()}</td>
                          <td className="text-right p-3 font-mono font-semibold text-green-600">₹{stat.netSalary.toLocaleString()}</td>
                          <td className="text-center p-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingStaffId(parseInt(stat.staffId));
                                editStaffForm.reset({ baseSalary: stat.baseSalary || 0 });
                                setIsEditStaffDialogOpen(true);
                              }}
                              data-testid={`button-edit-salary-table-${stat.staffId}`}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Salary Calculation Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Salary Calculation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded">
                  <p className="text-xs text-muted-foreground mb-1">Total Work Days</p>
                  <p className="font-semibold text-lg">
                    {attendanceStats[0]?.totalWorkDays || 0}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-950 p-3 rounded">
                  <p className="text-xs text-muted-foreground mb-1">Total Present Days</p>
                  <p className="font-semibold text-lg text-green-600">
                    {attendanceStats.reduce((sum, s) => sum + s.presentDays, 0)}
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-950 p-3 rounded">
                  <p className="text-xs text-muted-foreground mb-1">Total Absent Days</p>
                  <p className="font-semibold text-lg text-red-600">
                    {attendanceStats.reduce((sum, s) => sum + s.absentDays, 0)}
                  </p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-950 p-3 rounded">
                  <p className="text-xs text-muted-foreground mb-1">Total Leave Days</p>
                  <p className="font-semibold text-lg text-orange-600">
                    {attendanceStats.reduce((sum, s) => sum + s.leaveDays, 0)}
                  </p>
                </div>
              </div>
              <div className="bg-muted p-4 rounded-lg space-y-2 font-mono text-xs">
                <div><strong>Formula:</strong></div>
                <div className="ml-2">Deduction Per Day = Base Salary ÷ Working Days</div>
                <div className="ml-2">Total Deduction = Deduction Per Day × Absent Days</div>
                <div className="border-t pt-2 mt-2">
                  <strong>Net Salary = Base Salary - Total Deduction</strong>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individual" className="space-y-4">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-record-attendance">
                <CalendarDays className="h-4 w-4 mr-2" />
                Record Single Attendance
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
        </TabsContent>
      </Tabs>

      <Dialog open={isEditStaffDialogOpen} onOpenChange={setIsEditStaffDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Staff Salary</DialogTitle>
          </DialogHeader>
          <Form {...editStaffForm}>
            <form onSubmit={editStaffForm.handleSubmit((data) => editStaffMutation.mutate(data))} className="space-y-4">
              <FormField
                control={editStaffForm.control}
                name="baseSalary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Salary</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" placeholder="e.g., 30000" data-testid="input-edit-salary" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={editStaffMutation.isPending} className="w-full">
                {editStaffMutation.isPending ? "Saving..." : "Save Salary"}
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
                <FormField
                  control={addStaffForm.control}
                  name="joiningDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Joining Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-joining-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addStaffForm.control}
                  name="baseSalary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Salary (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="e.g., 30000" data-testid="input-base-salary" />
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
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{staff.name} - {staff.jobTitle}</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingStaffId(staff.id);
                      editStaffForm.reset({ baseSalary: staff.baseSalary || 0 });
                      setIsEditStaffDialogOpen(true);
                    }}
                    data-testid={`button-edit-salary-${staff.id}`}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit Salary
                  </Button>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {daysInMonth.map((day) => {
                    const dayAttendance = getAttendanceForDate(staff.id, day);
                    const status = dayAttendance?.status || "unmarked";
                    const getColor = (s: string) => {
                      if (s === "present") return { bg: "rgb(34, 197, 94)", text: "white" };
                      if (s === "absent") return { bg: "rgb(239, 68, 68)", text: "white" };
                      if (s === "leave") return { bg: "rgb(59, 130, 246)", text: "white" };
                      if (s === "half-day") return { bg: "rgb(234, 179, 8)", text: "white" };
                      return { bg: "rgb(243, 244, 246)", text: "rgb(75, 85, 99)" };
                    };
                    const colors = getColor(status);
                    return (
                      <div
                        key={day.toString()}
                        className="flex flex-col items-center justify-center p-2 rounded border text-xs font-bold"
                        style={{ 
                          backgroundColor: colors.bg,
                          color: colors.text,
                          height: "48px",
                          width: "100%",
                          border: "1px solid #ccc"
                        }}
                        data-testid={`attendance-cell-${format(day, "yyyy-MM-dd")}`}
                      >
                        {format(day, "d")}
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
