import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, parseISO, isPast, isToday } from "date-fns";
import { Plus, CheckCircle2, Clock, AlertTriangle, ListTodo, Trash2, Edit, Phone, Bell, Calendar, User } from "lucide-react";
import type { Task } from "@shared/schema";

interface Property {
  id: number;
  name: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
}

export default function TasksPage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/tasks", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsCreateOpen(false);
      toast({ title: "Task created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create task", description: error.message, variant: "destructive" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest(`/api/tasks/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setEditingTask(null);
      toast({ title: "Task updated successfully" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/tasks/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task deleted" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => 
      apiRequest(`/api/tasks/${id}/status`, "PATCH", { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Status updated" });
    },
  });

  const filteredTasks = tasks.filter((task) => {
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    if (propertyFilter !== "all" && task.propertyId !== parseInt(propertyFilter)) return false;
    if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
    return true;
  });

  const pendingTasks = filteredTasks.filter(t => t.status === "pending");
  const inProgressTasks = filteredTasks.filter(t => t.status === "in_progress");
  const completedTasks = filteredTasks.filter(t => t.status === "completed");
  const overdueTasks = filteredTasks.filter(t => {
    if (t.status === "completed") return false;
    const dueDate = parseISO(t.dueDate);
    return isPast(dueDate) && !isToday(dueDate);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "in_progress": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "completed": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "overdue": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default: return "";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "medium": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "low": return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default: return "";
    }
  };

  const getPropertyName = (propertyId: number) => {
    const property = properties.find(p => p.id === propertyId);
    return property?.name || "Unknown";
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-tasks-title">Task Manager</h1>
          <p className="text-muted-foreground">Manage and track tasks across properties</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-task">
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <TaskForm
              properties={properties}
              users={users}
              onSubmit={(data) => createTaskMutation.mutate(data)}
              isLoading={createTaskMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-pending-count">{pendingTasks.length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <ListTodo className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-inprogress-count">{inProgressTasks.length}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-overdue-count">{overdueTasks.length}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-completed-count">{completedTasks.length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-property-filter">
            <SelectValue placeholder="All Properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px]" data-testid="select-priority-filter">
            <SelectValue placeholder="All Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" data-testid="tab-all">All ({filteredTasks.length})</TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending">Pending ({pendingTasks.length})</TabsTrigger>
          <TabsTrigger value="overdue" data-testid="tab-overdue">Overdue ({overdueTasks.length})</TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">Completed ({completedTasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <TaskList 
            tasks={filteredTasks} 
            isLoading={isLoading}
            getPropertyName={getPropertyName}
            getStatusColor={getStatusColor}
            getPriorityColor={getPriorityColor}
            onStatusChange={(id, status) => updateStatusMutation.mutate({ id, status })}
            onEdit={setEditingTask}
            onDelete={(id) => deleteTaskMutation.mutate(id)}
          />
        </TabsContent>
        <TabsContent value="pending" className="mt-4">
          <TaskList 
            tasks={pendingTasks} 
            isLoading={isLoading}
            getPropertyName={getPropertyName}
            getStatusColor={getStatusColor}
            getPriorityColor={getPriorityColor}
            onStatusChange={(id, status) => updateStatusMutation.mutate({ id, status })}
            onEdit={setEditingTask}
            onDelete={(id) => deleteTaskMutation.mutate(id)}
          />
        </TabsContent>
        <TabsContent value="overdue" className="mt-4">
          <TaskList 
            tasks={overdueTasks} 
            isLoading={isLoading}
            getPropertyName={getPropertyName}
            getStatusColor={getStatusColor}
            getPriorityColor={getPriorityColor}
            onStatusChange={(id, status) => updateStatusMutation.mutate({ id, status })}
            onEdit={setEditingTask}
            onDelete={(id) => deleteTaskMutation.mutate(id)}
            showOverdue
          />
        </TabsContent>
        <TabsContent value="completed" className="mt-4">
          <TaskList 
            tasks={completedTasks} 
            isLoading={isLoading}
            getPropertyName={getPropertyName}
            getStatusColor={getStatusColor}
            getPriorityColor={getPriorityColor}
            onStatusChange={(id, status) => updateStatusMutation.mutate({ id, status })}
            onEdit={setEditingTask}
            onDelete={(id) => deleteTaskMutation.mutate(id)}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <TaskForm
              properties={properties}
              users={users}
              initialData={editingTask}
              onSubmit={(data) => updateTaskMutation.mutate({ id: editingTask.id, ...data })}
              isLoading={updateTaskMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskList({
  tasks,
  isLoading,
  getPropertyName,
  getStatusColor,
  getPriorityColor,
  onStatusChange,
  onEdit,
  onDelete,
  showOverdue = false,
}: {
  tasks: Task[];
  isLoading: boolean;
  getPropertyName: (id: number) => string;
  getStatusColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
  onStatusChange: (id: number, status: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  showOverdue?: boolean;
}) {
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading tasks...</div>;
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No tasks found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const dueDate = parseISO(task.dueDate);
        const isOverdue = task.status !== "completed" && isPast(dueDate) && !isToday(dueDate);

        return (
          <Card key={task.id} className={isOverdue ? "border-red-300 dark:border-red-800" : ""}>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold" data-testid={`text-task-title-${task.id}`}>{task.title}</h3>
                    <Badge className={getPriorityColor(task.priority || "medium")}>{task.priority}</Badge>
                    <Badge className={getStatusColor(isOverdue ? "overdue" : (task.status || "pending"))}>
                      {isOverdue ? "Overdue" : task.status?.replace("_", " ")}
                    </Badge>
                    {task.reminderEnabled && (
                      <Badge variant="outline" className="gap-1">
                        <Bell className="h-3 w-3" /> Reminders On
                      </Badge>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Due: {format(dueDate, "MMM d, yyyy")} {task.dueTime && `at ${task.dueTime}`}
                    </span>
                    <span>{getPropertyName(task.propertyId)}</span>
                    {task.assignedUserName && (
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {task.assignedUserName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {task.status !== "completed" && (
                    <Select
                      value={task.status || "pending"}
                      onValueChange={(status) => onStatusChange(task.id, status)}
                    >
                      <SelectTrigger className="w-[140px]" data-testid={`select-status-${task.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Button variant="outline" size="icon" onClick={() => onEdit(task)} data-testid={`button-edit-${task.id}`}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => onDelete(task.id)} data-testid={`button-delete-${task.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function TaskForm({
  properties,
  users,
  initialData,
  onSubmit,
  isLoading,
}: {
  properties: Property[];
  users: User[];
  initialData?: Task;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    propertyId: initialData?.propertyId || "",
    title: initialData?.title || "",
    description: initialData?.description || "",
    assignedUserId: initialData?.assignedUserId || "",
    priority: initialData?.priority || "medium",
    dueDate: initialData?.dueDate || format(new Date(), "yyyy-MM-dd"),
    dueTime: initialData?.dueTime || "10:00",
    reminderEnabled: initialData?.reminderEnabled !== false,
    reminderType: initialData?.reminderType || "daily",
    reminderTime: initialData?.reminderTime || "10:00",
    reminderRecipients: initialData?.reminderRecipients || [],
  });

  const [customPhone, setCustomPhone] = useState("");

  const handleAddPhone = () => {
    if (customPhone && !formData.reminderRecipients.includes(customPhone)) {
      setFormData({
        ...formData,
        reminderRecipients: [...formData.reminderRecipients, customPhone],
      });
      setCustomPhone("");
    }
  };

  const handleRemovePhone = (phone: string) => {
    setFormData({
      ...formData,
      reminderRecipients: formData.reminderRecipients.filter((p: string) => p !== phone),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedUser = users.find(u => u.id === formData.assignedUserId);
    onSubmit({
      ...formData,
      propertyId: parseInt(formData.propertyId as string),
      assignedUserName: selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Property *</Label>
        <Select
          value={formData.propertyId.toString()}
          onValueChange={(value) => setFormData({ ...formData, propertyId: value })}
        >
          <SelectTrigger data-testid="select-form-property">
            <SelectValue placeholder="Select property" />
          </SelectTrigger>
          <SelectContent>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Task Title *</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter task title"
          required
          data-testid="input-task-title"
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Task description"
          data-testid="input-task-description"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Assigned To</Label>
          <Select
            value={formData.assignedUserId}
            onValueChange={(value) => setFormData({ ...formData, assignedUserId: value })}
          >
            <SelectTrigger data-testid="select-assigned-user">
              <SelectValue placeholder="Select staff" />
            </SelectTrigger>
            <SelectContent>
              {users.filter(u => u.role !== 'super-admin').map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={formData.priority}
            onValueChange={(value) => setFormData({ ...formData, priority: value })}
          >
            <SelectTrigger data-testid="select-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Due Date *</Label>
          <Input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            required
            data-testid="input-due-date"
          />
        </div>
        <div className="space-y-2">
          <Label>Due Time</Label>
          <Input
            type="time"
            value={formData.dueTime}
            onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
            data-testid="input-due-time"
          />
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="reminderEnabled"
            checked={formData.reminderEnabled}
            onCheckedChange={(checked) => setFormData({ ...formData, reminderEnabled: !!checked })}
            data-testid="checkbox-reminder-enabled"
          />
          <Label htmlFor="reminderEnabled" className="flex items-center gap-2">
            <Bell className="h-4 w-4" /> Enable WhatsApp Reminders
          </Label>
        </div>

        {formData.reminderEnabled && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reminder Type</Label>
                <Select
                  value={formData.reminderType}
                  onValueChange={(value) => setFormData({ ...formData, reminderType: value })}
                >
                  <SelectTrigger data-testid="select-reminder-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One Time</SelectItem>
                    <SelectItem value="daily">Daily (until completed)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reminder Time</Label>
                <Input
                  type="time"
                  value={formData.reminderTime}
                  onChange={(e) => setFormData({ ...formData, reminderTime: e.target.value })}
                  data-testid="input-reminder-time"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> WhatsApp Recipients
              </Label>
              <div className="flex gap-2">
                <Input
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  data-testid="input-custom-phone"
                />
                <Button type="button" variant="outline" onClick={handleAddPhone} data-testid="button-add-phone">
                  Add
                </Button>
              </div>
              {formData.reminderRecipients.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.reminderRecipients.map((phone: string) => (
                    <Badge key={phone} variant="secondary" className="gap-1">
                      {phone}
                      <button type="button" onClick={() => handleRemovePhone(phone)} className="ml-1 hover:text-red-500">
                        x
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-submit-task">
        {isLoading ? "Saving..." : (initialData ? "Update Task" : "Create Task")}
      </Button>
    </form>
  );
}
