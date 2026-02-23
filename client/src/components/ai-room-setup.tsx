import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BedDouble, Check, Loader2, Plus, Trash2, Sparkles } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RoomTypeConfig {
  roomType: string;
  count: number;
  pricePerNight: number;
  maxOccupancy: number;
  startNumber: number;
  roomCategory: string;
}

interface AIRoomSetupProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: number;
  propertyName: string;
}

const defaultRoomTypes = ["Deluxe", "Standard", "Suite", "Super Deluxe", "Premium", "Family", "Dormitory"];

export function AIRoomSetup({ isOpen, onClose, propertyId, propertyName }: AIRoomSetupProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"configure" | "review">("configure");
  const [roomTypes, setRoomTypes] = useState<RoomTypeConfig[]>([
    { roomType: "Deluxe", count: 1, pricePerNight: 2000, maxOccupancy: 2, startNumber: 101, roomCategory: "room" },
  ]);

  const addRoomType = () => {
    const usedTypes = roomTypes.map(r => r.roomType);
    const nextType = defaultRoomTypes.find(t => !usedTypes.includes(t)) || "Room Type";
    const maxStart = Math.max(...roomTypes.map(r => r.startNumber + r.count));
    setRoomTypes([...roomTypes, {
      roomType: nextType,
      count: 1,
      pricePerNight: 2000,
      maxOccupancy: 2,
      startNumber: maxStart,
      roomCategory: "room",
    }]);
  };

  const removeRoomType = (idx: number) => {
    setRoomTypes(roomTypes.filter((_, i) => i !== idx));
  };

  const updateRoomType = (idx: number, updates: Partial<RoomTypeConfig>) => {
    setRoomTypes(roomTypes.map((r, i) => i === idx ? { ...r, ...updates } : r));
  };

  const generateRooms = () => {
    const rooms: any[] = [];
    for (const rt of roomTypes) {
      for (let i = 0; i < rt.count; i++) {
        rooms.push({
          roomNumber: String(rt.startNumber + i),
          roomType: rt.roomType,
          pricePerNight: rt.pricePerNight,
          maxOccupancy: rt.maxOccupancy,
          totalBeds: rt.roomCategory === "dormitory" ? rt.maxOccupancy : 1,
          roomCategory: rt.roomCategory,
        });
      }
    }
    return rooms;
  };

  const totalRooms = roomTypes.reduce((sum, r) => sum + r.count, 0);
  const generatedRooms = step === "review" ? generateRooms() : [];

  const createRoomsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/ai-setup/create-rooms", "POST", {
        propertyId,
        rooms: generatedRooms,
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Rooms Created!",
        description: `Successfully created ${data.count} rooms for ${propertyName}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create rooms",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent
        className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        data-testid="dialog-ai-room-setup"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span>Quick Room Setup</span>
              <p className="text-xs font-normal text-muted-foreground">{propertyName}</p>
            </div>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {step === "configure"
              ? "Add your room types below. You can always edit rooms later."
              : `Review the ${totalRooms} rooms that will be created.`}
          </DialogDescription>
        </DialogHeader>

        {step === "configure" && (
          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            {roomTypes.map((rt, idx) => (
              <div key={idx} className="border rounded-lg p-3 space-y-3 bg-muted/30" data-testid={`card-room-type-${idx}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Room Type {idx + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removeRoomType(idx)}
                    data-testid={`button-remove-room-type-${idx}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Type Name</Label>
                    <Select value={rt.roomType} onValueChange={(v) => updateRoomType(idx, { roomType: v })}>
                      <SelectTrigger className="h-9" data-testid={`select-room-type-${idx}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {defaultRoomTypes.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    <Select value={rt.roomCategory} onValueChange={(v) => updateRoomType(idx, { roomCategory: v })}>
                      <SelectTrigger className="h-9" data-testid={`select-room-category-${idx}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="room">Room</SelectItem>
                        <SelectItem value="dormitory">Dormitory</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Number of Rooms</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={rt.count === 0 ? "" : rt.count}
                      onChange={(e) => updateRoomType(idx, { count: e.target.value === "" ? 0 : parseInt(e.target.value) || 0 })}
                      onBlur={() => { if (rt.count < 1) updateRoomType(idx, { count: 1 }); }}
                      className="h-9"
                      data-testid={`input-room-count-${idx}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Price / Night (₹)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={rt.pricePerNight === 0 ? "" : rt.pricePerNight}
                      onChange={(e) => updateRoomType(idx, { pricePerNight: e.target.value === "" ? 0 : parseInt(e.target.value) || 0 })}
                      className="h-9"
                      data-testid={`input-room-price-${idx}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max Guests</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={rt.maxOccupancy === 0 ? "" : rt.maxOccupancy}
                      onChange={(e) => updateRoomType(idx, { maxOccupancy: e.target.value === "" ? 0 : parseInt(e.target.value) || 0 })}
                      onBlur={() => { if (rt.maxOccupancy < 1) updateRoomType(idx, { maxOccupancy: 1 }); }}
                      className="h-9"
                      data-testid={`input-room-occupancy-${idx}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Start Room No.</Label>
                    <Input
                      type="number"
                      min={1}
                      value={rt.startNumber === 0 ? "" : rt.startNumber}
                      onChange={(e) => updateRoomType(idx, { startNumber: e.target.value === "" ? 0 : parseInt(e.target.value) || 0 })}
                      onBlur={() => { if (rt.startNumber < 1) updateRoomType(idx, { startNumber: 1 }); }}
                      className="h-9"
                      data-testid={`input-room-start-number-${idx}`}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-1"
              onClick={addRoomType}
              data-testid="button-add-room-type"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Another Room Type
            </Button>
          </div>
        )}

        {step === "review" && (
          <div className="flex-1 overflow-y-auto py-2">
            <div className="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300">
                <BedDouble className="w-4 h-4" />
                {totalRooms} rooms will be created
              </div>
              <div className="flex flex-wrap gap-1">
                {generatedRooms.slice(0, 20).map((room, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs" data-testid={`badge-pending-room-${idx}`}>
                    {room.roomNumber} - {room.roomType}
                  </Badge>
                ))}
                {generatedRooms.length > 20 && (
                  <Badge variant="secondary" className="text-xs">+{generatedRooms.length - 20} more</Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-2 space-y-1">
                {roomTypes.map((rt, idx) => (
                  <p key={idx}>
                    {rt.count}x {rt.roomType} ({rt.roomCategory}) — ₹{rt.pricePerNight.toLocaleString("en-IN")}/night, max {rt.maxOccupancy} guests
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t">
          {step === "configure" && (
            <>
              <Button type="button" variant="outline" className="flex-1" onClick={onClose} data-testid="button-cancel-setup">
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 gap-1"
                onClick={() => setStep("review")}
                disabled={totalRooms === 0}
                data-testid="button-review-rooms"
              >
                Review ({totalRooms} rooms)
              </Button>
            </>
          )}
          {step === "review" && (
            <>
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("configure")} data-testid="button-back-to-edit">
                Back to Edit
              </Button>
              <Button
                type="button"
                className="flex-1 gap-1"
                onClick={() => createRoomsMutation.mutate()}
                disabled={createRoomsMutation.isPending}
                data-testid="button-confirm-create-rooms"
              >
                {createRoomsMutation.isPending ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Creating...</>
                ) : (
                  <><Check className="w-3 h-3" /> Create Rooms</>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
