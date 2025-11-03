import { useState, useEffect, useRef } from "react";
import { Download, QrCode } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import QRCodeGenerator from "qrcode";
import type { Property, Room } from "@shared/schema";

export default function QRCodes() {
  const { toast } = useToast();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  
  const roomQRRef = useRef<HTMLCanvasElement>(null);
  const cafeQRRef = useRef<HTMLCanvasElement>(null);
  
  // Fetch properties and rooms
  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });
  
  const { data: allRooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });
  
  // Filter rooms by selected property
  const filteredRooms = allRooms?.filter(
    room => selectedPropertyId ? room.propertyId === parseInt(selectedPropertyId) : true
  ) || [];
  
  const selectedRoom = allRooms?.find(r => r.id === parseInt(selectedRoomId));
  const selectedProperty = properties?.find(p => p.id === parseInt(selectedPropertyId));
  
  // Generate Room-Specific QR Code when property and room are selected
  useEffect(() => {
    if (!selectedPropertyId || !selectedRoomId || !selectedRoom) return;
    
    const baseUrl = window.location.origin;
    const roomOrderUrl = `${baseUrl}/menu?type=room&property=${selectedPropertyId}&room=${selectedRoom.roomNumber}`;
    
    if (roomQRRef.current) {
      QRCodeGenerator.toCanvas(
        roomQRRef.current,
        roomOrderUrl,
        {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        },
        (error) => {
          if (error) console.error('Room QR generation error:', error);
        }
      );
    }
  }, [selectedPropertyId, selectedRoomId, selectedRoom]);
  
  // Generate Café QR Code on mount
  useEffect(() => {
    const baseUrl = window.location.origin;
    const cafeOrderUrl = `${baseUrl}/menu?type=restaurant`;
    
    if (cafeQRRef.current) {
      QRCodeGenerator.toCanvas(
        cafeQRRef.current,
        cafeOrderUrl,
        {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        },
        (error) => {
          if (error) console.error('Café QR generation error:', error);
        }
      );
    }
  }, []);
  
  const downloadQRCode = (canvasRef: React.RefObject<HTMLCanvasElement>, filename: string, roomInfo?: { propertyName: string; roomNumber: string }) => {
    if (!canvasRef.current) return;
    
    // Create a new canvas with room number text
    const originalCanvas = canvasRef.current;
    const newCanvas = document.createElement('canvas');
    const ctx = newCanvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size (add space for text if room info provided)
    const padding = 40;
    const textHeight = roomInfo ? 100 : 0;
    newCanvas.width = originalCanvas.width + (padding * 2);
    newCanvas.height = originalCanvas.height + (padding * 2) + textHeight;
    
    // Fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    
    // Draw the original QR code centered
    ctx.drawImage(originalCanvas, padding, padding);
    
    // Add room number text if provided
    if (roomInfo) {
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      
      // Property name
      ctx.font = 'bold 24px Arial';
      ctx.fillText(roomInfo.propertyName, newCanvas.width / 2, originalCanvas.height + padding + 40);
      
      // Room number (larger and more prominent)
      ctx.font = 'bold 32px Arial';
      ctx.fillText(`Room ${roomInfo.roomNumber}`, newCanvas.width / 2, originalCanvas.height + padding + 75);
    }
    
    // Download the new canvas
    newCanvas.toBlob((blob) => {
      if (!blob) return;
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "QR Code Downloaded",
        description: `${filename} has been saved to your downloads`,
      });
    });
  };
  
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">QR Codes</h1>
        <p className="text-muted-foreground">
          Generate room-specific QR codes for guest ordering. Each room gets its own unique QR code.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Room-Specific QR Code Generator */}
        <Card data-testid="card-room-qr">
          <CardHeader>
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              <CardTitle>Room-Specific QR Code</CardTitle>
            </div>
            <CardDescription>
              Select a property and room to generate a unique QR code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Property Selection */}
            <div className="space-y-2">
              <Label htmlFor="property-select">Property</Label>
              <Select
                value={selectedPropertyId}
                onValueChange={(value) => {
                  setSelectedPropertyId(value);
                  setSelectedRoomId(""); // Reset room when property changes
                }}
              >
                <SelectTrigger id="property-select" data-testid="select-property">
                  <SelectValue placeholder="Select a property" />
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

            {/* Room Selection */}
            <div className="space-y-2">
              <Label htmlFor="room-select">Room Number</Label>
              <Select
                value={selectedRoomId}
                onValueChange={setSelectedRoomId}
                disabled={!selectedPropertyId}
              >
                <SelectTrigger id="room-select" data-testid="select-room">
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
                <SelectContent>
                  {filteredRooms.map((room) => (
                    <SelectItem key={room.id} value={room.id.toString()}>
                      Room {room.roomNumber} - {room.roomType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* QR Code Display */}
            {selectedPropertyId && selectedRoomId && selectedRoom ? (
              <>
                <div className="flex justify-center bg-white p-4 rounded-lg border">
                  <canvas ref={roomQRRef} data-testid="canvas-room-qr" />
                </div>
                <div className="text-sm text-center font-medium">
                  {selectedProperty?.name} - Room {selectedRoom.roomNumber}
                </div>
                <Button
                  className="w-full"
                  onClick={() => downloadQRCode(
                    roomQRRef, 
                    `${selectedProperty?.name.replace(/\s+/g, '-')}-Room-${selectedRoom.roomNumber}-QR.png`,
                    { propertyName: selectedProperty?.name || '', roomNumber: selectedRoom.roomNumber }
                  )}
                  data-testid="button-download-room-qr"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download QR Code
                </Button>
              </>
            ) : (
              <div className="flex items-center justify-center h-[300px] bg-muted rounded-lg border-2 border-dashed">
                <p className="text-muted-foreground text-sm">
                  Select property and room to generate QR code
                </p>
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
              <p><strong>How it works:</strong></p>
              <p>• Print and place QR code in the specific room</p>
              <p>• Guest scans → room is auto-filled</p>
              <p>• Order links directly to room bill</p>
            </div>
          </CardContent>
        </Card>

        {/* Café/Restaurant QR Code */}
        <Card data-testid="card-cafe-qr">
          <CardHeader>
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              <CardTitle>Café/Restaurant QR</CardTitle>
            </div>
            <CardDescription>
              Generic QR code for walk-in café customers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center bg-white p-4 rounded-lg border">
              <canvas ref={cafeQRRef} data-testid="canvas-cafe-qr" />
            </div>
            <Button
              className="w-full"
              onClick={() => downloadQRCode(cafeQRRef, 'cafe-restaurant-qr-code.png')}
              data-testid="button-download-cafe-qr"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Café QR
            </Button>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Place at café tables or counter</p>
              <p>• Guests enter their name and phone</p>
              <p>• For walk-in customers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Usage Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <h4 className="font-semibold mb-1">Room-Specific QR Codes:</h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Select property and room from dropdowns above</li>
              <li>Download the generated QR code</li>
              <li>Print and place it in that specific room</li>
              <li>When guests scan, room number is auto-filled</li>
              <li>Orders automatically link to their room bill</li>
            </ol>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Café QR Code:</h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Download the Café QR code</li>
              <li>Place on tables or at the ordering counter</li>
              <li>Walk-in guests enter their name and phone</li>
              <li>For in-house guests, staff can use Quick Order to link to room bill</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
