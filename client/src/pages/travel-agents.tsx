import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { TravelAgent, Property, Booking } from "@shared/schema";

export default function TravelAgents() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<TravelAgent | null>(null);
  const [deleteAgentId, setDeleteAgentId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    propertyId: undefined as number | undefined,
  });
  const { toast } = useToast();

  const { data: agents, isLoading } = useQuery<TravelAgent[]>({
    queryKey: ["/api/travel-agents"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: bookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("/api/travel-agents", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/travel-agents"] });
      toast({
        title: "Success",
        description: "Travel agent created successfully",
      });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      return await apiRequest(`/api/travel-agents/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/travel-agents"] });
      toast({
        title: "Success",
        description: "Travel agent updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedAgent(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/travel-agents/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/travel-agents"] });
      toast({
        title: "Success",
        description: "Travel agent deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setDeleteAgentId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      propertyId: undefined,
    });
  };

  const handleAdd = () => {
    if (!formData.name || !formData.propertyId) {
      toast({
        title: "Error",
        description: "Agent name and property are required",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (agent: TravelAgent) => {
    setSelectedAgent(agent);
    setFormData({
      name: agent.name,
      contactPerson: agent.contactPerson || "",
      phone: agent.phone || "",
      email: agent.email || "",
      propertyId: agent.propertyId,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedAgent) return;
    if (!formData.name || !formData.propertyId) {
      toast({
        title: "Error",
        description: "Agent name and property are required",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({ id: selectedAgent.id, data: formData });
  };

  const handleDelete = (agentId: number) => {
    // Check if any bookings are using this agent
    const bookingsWithAgent = bookings?.filter(b => b.travelAgentId === agentId);
    if (bookingsWithAgent && bookingsWithAgent.length > 0) {
      toast({
        title: "Cannot Delete",
        description: `This travel agent is linked to ${bookingsWithAgent.length} booking(s). Please remove the agent from those bookings first.`,
        variant: "destructive",
      });
      return;
    }
    setDeleteAgentId(agentId);
    setIsDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Travel Agents</h1>
          <p className="text-muted-foreground mt-1">
            Manage travel agents for your properties
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsAddDialogOpen(true);
          }}
          data-testid="button-create-agent"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Travel Agent
        </Button>
      </div>

      {agents && agents.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <p className="text-muted-foreground mb-4">No travel agents found</p>
          <Button
            onClick={() => {
              resetForm();
              setIsAddDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Travel Agent
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Agent Name</TableHead>
                <TableHead className="font-semibold">Property</TableHead>
                <TableHead className="font-semibold">Contact Person</TableHead>
                <TableHead className="font-semibold">Phone</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents?.map((agent) => {
                const property = properties?.find(p => p.id === agent.propertyId);
                return (
                  <TableRow key={agent.id} className="hover-elevate" data-testid={`row-agent-${agent.id}`}>
                    <TableCell className="font-medium" data-testid={`text-name-${agent.id}`}>
                      {agent.name}
                    </TableCell>
                    <TableCell data-testid={`text-property-${agent.id}`}>
                      {property?.name || "Unknown"}
                    </TableCell>
                    <TableCell data-testid={`text-contact-${agent.id}`}>
                      {agent.contactPerson || "-"}
                    </TableCell>
                    <TableCell data-testid={`text-phone-${agent.id}`}>
                      {agent.phone || "-"}
                    </TableCell>
                    <TableCell data-testid={`text-email-${agent.id}`}>
                      {agent.email || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(agent)}
                          data-testid={`button-edit-${agent.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(agent.id)}
                          data-testid={`button-delete-${agent.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Agent Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-add-agent">
          <DialogHeader>
            <DialogTitle>Add New Travel Agent</DialogTitle>
            <DialogDescription>
              Create a new travel agent for one of your properties
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="add-property">Property *</Label>
              <Select
                value={formData.propertyId?.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, propertyId: parseInt(value) })
                }
              >
                <SelectTrigger id="add-property" data-testid="select-add-property">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties?.map((property) => (
                    <SelectItem key={property.id} value={property.id.toString()}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="add-name">Agent Name *</Label>
              <Input
                id="add-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter agent name"
                data-testid="input-add-name"
              />
            </div>
            <div>
              <Label htmlFor="add-contact">Contact Person</Label>
              <Input
                id="add-contact"
                value={formData.contactPerson}
                onChange={(e) =>
                  setFormData({ ...formData, contactPerson: e.target.value })
                }
                placeholder="Enter contact person"
                data-testid="input-add-contact"
              />
            </div>
            <div>
              <Label htmlFor="add-phone">Phone</Label>
              <Input
                id="add-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
                data-testid="input-add-phone"
              />
            </div>
            <div>
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
                data-testid="input-add-email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={createMutation.isPending}
              data-testid="button-submit-add"
            >
              {createMutation.isPending ? "Creating..." : "Create Agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Agent Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-agent">
          <DialogHeader>
            <DialogTitle>Edit Travel Agent</DialogTitle>
            <DialogDescription>
              Update travel agent information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-property">Property *</Label>
              <Select
                value={formData.propertyId?.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, propertyId: parseInt(value) })
                }
              >
                <SelectTrigger id="edit-property" data-testid="select-edit-property">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties?.map((property) => (
                    <SelectItem key={property.id} value={property.id.toString()}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-name">Agent Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter agent name"
                data-testid="input-edit-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-contact">Contact Person</Label>
              <Input
                id="edit-contact"
                value={formData.contactPerson}
                onChange={(e) =>
                  setFormData({ ...formData, contactPerson: e.target.value })
                }
                placeholder="Enter contact person"
                data-testid="input-edit-contact"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
                data-testid="input-edit-phone"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
                data-testid="input-edit-email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedAgent(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
              data-testid="button-submit-edit"
            >
              {updateMutation.isPending ? "Updating..." : "Update Agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-agent">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Travel Agent?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this travel agent. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAgentId && deleteMutation.mutate(deleteAgentId)}
              className="bg-destructive text-destructive-foreground hover-elevate"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
