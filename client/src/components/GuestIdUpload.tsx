import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Upload, X, Plus, Trash2, User, Images } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

export interface GuestIdEntry {
  guestName: string;
  phone: string;
  email: string;
  idProofType: string;
  idProofNumber: string;
  idProofFront: string | null;
  idProofBack: string | null;
  additionalIdImages: string[];
  isPrimary: boolean;
}

interface GuestIdUploadProps {
  guests: GuestIdEntry[];
  onChange: (guests: GuestIdEntry[]) => void;
  primaryGuestName?: string;
  primaryPhone?: string;
  primaryEmail?: string;
}

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const MAX_SIDE = 1200;
    const QUALITY = 0.75;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= MAX_SIDE && height <= MAX_SIDE && file.size < 300 * 1024) {
        resolve(file);
        return;
      }
      if (width > height) {
        if (width > MAX_SIDE) { height = Math.round((height * MAX_SIDE) / width); width = MAX_SIDE; }
      } else {
        if (height > MAX_SIDE) { width = Math.round((width * MAX_SIDE) / height); height = MAX_SIDE; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) { resolve(file); return; }
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
      }, 'image/jpeg', QUALITY);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

async function uploadSingleFile(file: File, toast: ReturnType<typeof useToast>["toast"]): Promise<string | null> {
  if (!file.type.startsWith('image/')) {
    toast({ title: "Invalid file type", description: "Please upload an image file", variant: "destructive" });
    return null;
  }
  try {
    const compressed = await compressImage(file);
    const uploadResponse = await fetch('/api/objects/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!uploadResponse.ok) throw new Error('Failed to get upload URL');
    const { uploadURL, isVPS, isMinIO, objectName } = await uploadResponse.json();

    if (isMinIO && objectName) {
      const putResponse = await fetch(uploadURL, { method: 'PUT', body: compressed, headers: { 'Content-Type': 'image/jpeg' } });
      if (!putResponse.ok) throw new Error('Failed to upload file to MinIO');
      return `/objects/${objectName}`;
    } else if (isVPS || uploadURL.startsWith('/api/vps-upload')) {
      const uploadRes = await fetch(uploadURL, { method: 'POST', body: compressed, headers: { 'Content-Type': 'image/jpeg' } });
      if (!uploadRes.ok) throw new Error('Failed to upload file');
      const { objectPath } = await uploadRes.json();
      return objectPath;
    } else {
      const putResponse = await fetch(uploadURL, { method: 'PUT', body: compressed, headers: { 'Content-Type': 'image/jpeg' } });
      if (!putResponse.ok) throw new Error('Failed to upload file');
      const aclResponse = await fetch('/api/guest-id-proofs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idProofUrl: uploadURL }),
      });
      if (!aclResponse.ok) throw new Error('Failed to secure ID proof');
      const { objectPath } = await aclResponse.json();
      return objectPath;
    }
  } catch (error) {
    console.error('Upload error:', error);
    toast({ title: "Upload failed", description: "Failed to upload image. Please try again.", variant: "destructive" });
    return null;
  }
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

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = await uploadSingleFile(file, toast);
    setUploading(false);
    if (path) {
      onUploadComplete(path);
      toast({ title: "Success", description: `${label} uploaded successfully` });
    }
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
          {uploading ? "Uploading..." : "Upload"}
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

function AdditionalImagesUploader({
  images,
  onAdd,
  onRemove,
  guestIndex,
}: {
  images: string[];
  onAdd: (paths: string[]) => void;
  onRemove: (idx: number) => void;
  guestIndex: number;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const path = await uploadSingleFile(files[i], toast);
      if (path) uploaded.push(path);
    }
    setUploading(false);
    if (uploaded.length > 0) {
      onAdd(uploaded);
      toast({ title: "Uploaded", description: `${uploaded.length} image${uploaded.length > 1 ? "s" : ""} added` });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Images className="h-3 w-3" />
          Additional ID Documents {images.length > 0 && <span className="ml-1 text-xs bg-muted rounded-full px-1.5 py-0.5">{images.length}</span>}
        </Label>
        <div className="flex gap-1">
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
            data-testid={`input-additional-${guestIndex}`}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            data-testid={`button-add-additional-${guestIndex}`}
          >
            <Upload className="h-3 w-3 mr-1" />
            {uploading ? "Uploading..." : "Add More IDs"}
          </Button>
          <Input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
            data-testid={`input-camera-additional-${guestIndex}`}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            data-testid={`button-camera-additional-${guestIndex}`}
          >
            <Camera className="h-3 w-3 mr-1" />
            Scan
          </Button>
        </div>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((url, idx) => (
            <div key={idx} className="relative group">
              <img
                src={url}
                alt={`ID ${idx + 1}`}
                className="w-full h-20 object-contain border rounded-md bg-muted"
                data-testid={`img-additional-${guestIndex}-${idx}`}
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-0.5 right-0.5 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onRemove(idx)}
                data-testid={`button-remove-additional-${guestIndex}-${idx}`}
              >
                <X className="h-2.5 w-2.5" />
              </Button>
              <span className="absolute bottom-0.5 left-0.5 text-[10px] bg-black/50 text-white rounded px-1">
                #{idx + 1}
              </span>
            </div>
          ))}
        </div>
      )}
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
    additionalIdImages: [],
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

  const addAdditionalImages = (guestIndex: number, newPaths: string[]) => {
    const guest = guests[guestIndex];
    updateGuest(guestIndex, {
      additionalIdImages: [...(guest.additionalIdImages || []), ...newPaths],
    });
  };

  const removeAdditionalImage = (guestIndex: number, imgIdx: number) => {
    const guest = guests[guestIndex];
    const updated = (guest.additionalIdImages || []).filter((_, i) => i !== imgIdx);
    updateGuest(guestIndex, { additionalIdImages: updated });
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

            <div className="pt-1 border-t">
              <AdditionalImagesUploader
                images={guest.additionalIdImages || []}
                onAdd={(paths) => addAdditionalImages(index, paths)}
                onRemove={(imgIdx) => removeAdditionalImage(index, imgIdx)}
                guestIndex={index}
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
