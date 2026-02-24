import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Upload, X, Plus, Trash2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

interface GuestIdEntry {
  guestName: string;
  phone: string;
  email: string;
  idProofType: string;
  idProofNumber: string;
  idProofFront: string | null;
  idProofBack: string | null;
  isPrimary: boolean;
}

interface GuestIdUploadProps {
  guests: GuestIdEntry[];
  onChange: (guests: GuestIdEntry[]) => void;
  primaryGuestName?: string;
  primaryPhone?: string;
  primaryEmail?: string;
}

function ImageUploader({
  label,
  imageUrl,
  onUploadComplete,
  onClear,
  testIdPrefix,
}: {
  label: string;
  imageUrl: string | null;
  onUploadComplete: (objectKey: string) => void;
  onClear: () => void;
  testIdPrefix: string;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid file type", description: "Please upload an image file", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const uploadResponse = await fetch('/api/objects/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!uploadResponse.ok) throw new Error('Failed to get upload URL');
      const { uploadURL, isVPS, isMinIO, objectName } = await uploadResponse.json();

      let finalObjectPath: string;

      if (isMinIO && objectName) {
        const putResponse = await fetch(uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
        if (!putResponse.ok) throw new Error('Failed to upload file to MinIO');
        finalObjectPath = `/objects/${objectName}`;
      } else if (isVPS || uploadURL.startsWith('/api/vps-upload')) {
        const uploadRes = await fetch(uploadURL, { method: 'POST', body: file, headers: { 'Content-Type': file.type } });
        if (!uploadRes.ok) throw new Error('Failed to upload file');
        const { objectPath } = await uploadRes.json();
        finalObjectPath = objectPath;
      } else {
        const putResponse = await fetch(uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
        if (!putResponse.ok) throw new Error('Failed to upload file');
        const aclResponse = await fetch('/api/guest-id-proofs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idProofUrl: uploadURL }),
        });
        if (!aclResponse.ok) throw new Error('Failed to secure ID proof');
        const { objectPath } = await aclResponse.json();
        finalObjectPath = objectPath;
      }

      onUploadComplete(finalObjectPath);
      toast({ title: "Success", description: `${label} uploaded successfully` });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: "Upload failed", description: `Failed to upload ${label}. Please try again.`, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">{label}</Label>
      {imageUrl && (
        <div className="relative inline-block">
          <img src={imageUrl} alt={label} className="w-full h-28 object-contain border rounded-md bg-muted" />
          <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={onClear} data-testid={`button-clear-${testIdPrefix}`}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      <div className="flex gap-1.5">
        <Input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInputChange} disabled={uploading} className="hidden" data-testid={`input-file-${testIdPrefix}`} />
        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} data-testid={`button-upload-${testIdPrefix}`}>
          <Upload className="h-3 w-3 mr-1" />
          {uploading ? "..." : "Upload"}
        </Button>
        <Input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileInputChange} disabled={uploading} className="hidden" data-testid={`input-camera-${testIdPrefix}`} />
        <Button type="button" variant="outline" size="sm" onClick={() => cameraInputRef.current?.click()} disabled={uploading} data-testid={`button-camera-${testIdPrefix}`}>
          <Camera className="h-3 w-3 mr-1" />
          {uploading ? "..." : "Photo"}
        </Button>
      </div>
    </div>
  );
}

const ID_PROOF_TYPES = [
  { value: "aadhar", label: "Aadhar Card" },
  { value: "pan", label: "PAN Card" },
  { value: "passport", label: "Passport" },
  { value: "driving_license", label: "Driving License" },
  { value: "voter_id", label: "Voter ID" },
  { value: "other", label: "Other" },
];

export function GuestIdUpload({ guests, onChange, primaryGuestName, primaryPhone, primaryEmail }: GuestIdUploadProps) {
  const createEmptyGuest = (isPrimary: boolean = false): GuestIdEntry => ({
    guestName: isPrimary && primaryGuestName ? primaryGuestName : "",
    phone: isPrimary && primaryPhone ? primaryPhone : "",
    email: isPrimary && primaryEmail ? primaryEmail : "",
    idProofType: "",
    idProofNumber: "",
    idProofFront: null,
    idProofBack: null,
    isPrimary,
  });

  if (guests.length === 0) {
    const initial = [createEmptyGuest(true)];
    onChange(initial);
    return null;
  }

  const updateGuest = (index: number, updates: Partial<GuestIdEntry>) => {
    const updated = [...guests];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const addGuest = () => {
    onChange([...guests, createEmptyGuest(false)]);
  };

  const removeGuest = (index: number) => {
    if (guests.length <= 1) return;
    const updated = guests.filter((_, i) => i !== index);
    if (!updated.some(g => g.isPrimary)) {
      updated[0].isPrimary = true;
    }
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {guests.map((guest, index) => (
        <Card key={index} className="border">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {guest.isPrimary ? "Primary Guest" : `Guest ${index + 1}`}
                </span>
              </div>
              {!guest.isPrimary && guests.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeGuest(index)} className="text-destructive h-7" data-testid={`button-remove-guest-${index}`}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Remove
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Full Name *</Label>
                <Input
                  value={guest.guestName}
                  onChange={(e) => updateGuest(index, { guestName: e.target.value })}
                  placeholder="Guest name"
                  className="h-8 text-sm"
                  data-testid={`input-guest-name-${index}`}
                />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input
                  value={guest.phone}
                  onChange={(e) => updateGuest(index, { phone: e.target.value })}
                  placeholder="Phone number"
                  className="h-8 text-sm"
                  data-testid={`input-guest-phone-${index}`}
                />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  value={guest.email}
                  onChange={(e) => updateGuest(index, { email: e.target.value })}
                  placeholder="Email"
                  className="h-8 text-sm"
                  data-testid={`input-guest-email-${index}`}
                />
              </div>
              <div>
                <Label className="text-xs">ID Type</Label>
                <Select value={guest.idProofType} onValueChange={(val) => updateGuest(index, { idProofType: val })}>
                  <SelectTrigger className="h-8 text-sm" data-testid={`select-id-type-${index}`}>
                    <SelectValue placeholder="Select ID type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ID_PROOF_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">ID Number</Label>
              <Input
                value={guest.idProofNumber}
                onChange={(e) => updateGuest(index, { idProofNumber: e.target.value })}
                placeholder="ID number"
                className="h-8 text-sm"
                data-testid={`input-id-number-${index}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ImageUploader
                label="ID Front"
                imageUrl={guest.idProofFront}
                onUploadComplete={(key) => updateGuest(index, { idProofFront: key })}
                onClear={() => updateGuest(index, { idProofFront: null })}
                testIdPrefix={`id-front-${index}`}
              />
              <ImageUploader
                label="ID Back"
                imageUrl={guest.idProofBack}
                onUploadComplete={(key) => updateGuest(index, { idProofBack: key })}
                onClear={() => updateGuest(index, { idProofBack: null })}
                testIdPrefix={`id-back-${index}`}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addGuest} className="w-full" data-testid="button-add-guest">
        <Plus className="h-4 w-4 mr-2" />
        Add Another Guest
      </Button>
    </div>
  );
}
