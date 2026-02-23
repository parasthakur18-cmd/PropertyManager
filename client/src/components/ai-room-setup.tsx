import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, BedDouble, Check, Loader2, Bot, User } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "assistant" | "user";
  content: string;
}

interface AIRoomSetupProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: number;
  propertyName: string;
}

export function AIRoomSetup({ isOpen, onClose, propertyId, propertyName }: AIRoomSetupProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hi! I'm here to help you set up rooms for ${propertyName}. Let's make it quick and easy!\n\nHow many rooms does your property have?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [pendingRooms, setPendingRooms] = useState<any[] | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const res = await apiRequest("/api/ai-setup/parse-rooms", "POST", {
        message: userMessage,
        conversationHistory,
      });
      return res;
    },
    onSuccess: (data: any) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
      if (data.isComplete && data.roomsData) {
        setPendingRooms(data.roomsData);
      }
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I had trouble processing that. Could you try again?",
        },
      ]);
    },
  });

  const createRoomsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/ai-setup/create-rooms", "POST", {
        propertyId,
        rooms: pendingRooms,
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

  const handleSend = () => {
    const text = input.trim();
    if (!text || chatMutation.isPending) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setPendingRooms(null);
    chatMutation.mutate(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleConfirmCreate = () => {
    setIsCreating(true);
    createRoomsMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent
        className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0"
        data-testid="dialog-ai-room-setup"
      >
        <DialogHeader className="px-4 py-3 border-b bg-primary/5">
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span>Room Setup Assistant</span>
              <p className="text-xs font-normal text-muted-foreground">
                {propertyName}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[300px] max-h-[50vh]"
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              <div
                className={`rounded-lg px-3 py-2 max-w-[80%] text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
                data-testid={`text-chat-message-${idx}`}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {chatMutation.isPending && (
            <div className="flex gap-2 items-center">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="bg-muted rounded-lg px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          {pendingRooms && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300">
                <BedDouble className="w-4 h-4" />
                Ready to create {pendingRooms.length} rooms
              </div>
              <div className="flex flex-wrap gap-1">
                {pendingRooms.slice(0, 10).map((room, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="text-xs"
                    data-testid={`badge-pending-room-${idx}`}
                  >
                    {room.roomNumber} - {room.roomType}
                  </Badge>
                ))}
                {pendingRooms.length > 10 && (
                  <Badge variant="secondary" className="text-xs">
                    +{pendingRooms.length - 10} more
                  </Badge>
                )}
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  onClick={handleConfirmCreate}
                  disabled={createRoomsMutation.isPending}
                  className="gap-1"
                  data-testid="button-confirm-create-rooms"
                >
                  {createRoomsMutation.isPending ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="w-3 h-3" />
                      Create Rooms
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPendingRooms(null);
                    setMessages((prev) => [
                      ...prev,
                      {
                        role: "user",
                        content: "Let me make some changes.",
                      },
                    ]);
                    chatMutation.mutate("Let me make some changes to the room setup.");
                  }}
                  disabled={chatMutation.isPending}
                  data-testid="button-modify-rooms"
                >
                  Modify
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t px-4 py-3 flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer..."
            disabled={chatMutation.isPending || createRoomsMutation.isPending}
            className="flex-1"
            data-testid="input-ai-chat"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
            data-testid="button-send-chat"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
