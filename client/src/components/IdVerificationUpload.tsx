import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface IdVerificationUploadProps {
  onUploadComplete: (objectKey: string) => void;
  existingImageUrl?: string;
}

export function IdVerificationUpload({ onUploadComplete, existingImageUrl }: IdVerificationUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Step 1: Get upload URL
      const uploadResponse = await fetch('/api/objects/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadURL } = await uploadResponse.json();

      // Step 2: Upload file to object storage
      const putResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!putResponse.ok) {
        throw new Error('Failed to upload file');
      }

      // Step 3: Set private ACL for ID proof
      const aclResponse = await fetch('/api/guest-id-proofs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idProofUrl: uploadURL,
        }),
      });

      if (!aclResponse.ok) {
        throw new Error('Failed to secure ID proof');
      }

      const { objectPath } = await aclResponse.json();

      setPreviewUrl(URL.createObjectURL(file));
      onUploadComplete(objectPath);

      toast({
        title: "Success",
        description: "ID proof uploaded successfully",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload ID proof. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const clearPreview = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <Label>ID Proof</Label>
      
      {previewUrl && (
        <div className="relative inline-block">
          <img 
            src={previewUrl} 
            alt="ID Preview" 
            className="max-w-full h-48 object-contain border rounded-md"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={clearPreview}
            data-testid="button-clear-id"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          disabled={uploading}
          className="hidden"
          id="file-upload"
          data-testid="input-file-upload"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          data-testid="button-upload-file"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Uploading..." : "Upload File"}
        </Button>

        <Input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileInputChange}
          disabled={uploading}
          className="hidden"
          id="camera-capture"
          data-testid="input-camera-capture"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading}
          data-testid="button-capture-camera"
        >
          <Camera className="h-4 w-4 mr-2" />
          {uploading ? "Uploading..." : "Take Photo"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Upload a photo of guest's ID proof (Aadhar, PAN, Passport, etc.)
      </p>
    </div>
  );
}
