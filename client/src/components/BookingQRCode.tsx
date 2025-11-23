import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Download, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BookingQRCodeProps {
  bookingId: number | string;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  propertyName: string;
}

export function BookingQRCode({ 
  bookingId, 
  guestName, 
  checkInDate, 
  checkOutDate,
  propertyName 
}: BookingQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (canvasRef.current) {
      // Generate QR code containing booking ID and check-in URL
      const checkInUrl = `${window.location.origin}/guest-self-checkin?bookingId=${bookingId}`;
      QRCode.toCanvas(canvasRef.current, checkInUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      }).catch((err) => {
        console.error("Failed to generate QR code:", err);
      });
    }
  }, [bookingId]);

  const downloadQR = () => {
    if (canvasRef.current) {
      const link = document.createElement("a");
      link.href = canvasRef.current.toDataURL("image/png");
      link.download = `booking-${bookingId}-qr.png`;
      link.click();
      toast({
        title: "QR Code Downloaded",
        description: `QR code for booking #${bookingId} has been downloaded`,
      });
    }
  };

  const copyQRLink = () => {
    const checkInUrl = `${window.location.origin}/guest-self-checkin?bookingId=${bookingId}`;
    navigator.clipboard.writeText(checkInUrl);
    toast({
      title: "Link Copied",
      description: "Check-in link copied to clipboard",
    });
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-card rounded-lg border" data-testid="component-booking-qr">
      <div className="text-center">
        <h3 className="font-semibold text-lg mb-2">Guest Check-in QR Code</h3>
        <p className="text-sm text-muted-foreground">
          Booking #{bookingId} - {guestName}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {checkInDate} to {checkOutDate} • {propertyName}
        </p>
      </div>

      <div className="bg-white p-4 rounded-lg border" data-testid="qr-code-canvas-container">
        <canvas ref={canvasRef} data-testid="qr-code-canvas" />
      </div>

      <div className="flex gap-2 w-full">
        <Button
          variant="outline"
          size="sm"
          onClick={downloadQR}
          className="flex-1"
          data-testid="button-download-qr"
        >
          <Download className="w-4 h-4 mr-2" />
          Download QR
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={copyQRLink}
          className="flex-1"
          data-testid="button-copy-qr-link"
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy Link
        </Button>
      </div>

      <div className="w-full p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm text-muted-foreground">
        <p className="font-medium mb-1">How to use:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Download the QR code and send to guest</li>
          <li>Guest can scan it on check-in day</li>
          <li>Or guest can use the direct link below</li>
          <li>At property, guest scans to self check-in</li>
        </ul>
      </div>

      <div className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-lg break-all text-xs font-mono">
        {`${window.location.origin}/guest-self-checkin?bookingId=${bookingId}`}
      </div>
    </div>
  );
}
