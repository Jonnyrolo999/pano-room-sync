import { useState, useRef } from "react";
import { Upload, FileImage, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useBuildingStore } from "@/stores/buildingStore";
import { renderPdfToDataUrl, loadImageFile } from "@/utils/pdfLoader";

export const FloorPlanUploader = () => {
  const { getActiveFloor, updateFloor } = useBuildingStore();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const activeFloor = getActiveFloor();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeFloor) return;

    setIsUploading(true);
    
    try {
      const isPdf = file.type === 'application/pdf';
      const isImage = file.type.startsWith('image/');
      
      if (!isPdf && !isImage) {
        throw new Error('Please select a PDF or image file');
      }

      toast.loading(`Processing ${isPdf ? 'PDF' : 'image'}...`, { id: 'floor-upload' });

      let result;
      if (isPdf) {
        result = await renderPdfToDataUrl(file, 2);
      } else {
        result = await loadImageFile(file);
      }

      // In a real app, you would upload the dataUrl to your storage service
      // For now, we'll store it directly (not recommended for production)
      const planImageUrl = result.dataUrl;

      // Update floor with new plan data
      await updateFloor(activeFloor.id, {
        planImageUrl,
        widthPx: result.width,
        heightPx: result.height,
        // Calculate DPI if we have original dimensions
        dpi: isPdf ? 72 : undefined, // PDF default DPI
        calibrationJson: {
          pixelsPerMeter: 1, // Default, can be calibrated later
          rotation: 0,
          originX: 0,
          originY: 0
        },
        updatedAt: new Date()
      });

      toast.success(`Floor plan ${isPdf ? 'PDF' : 'image'} uploaded successfully`, { id: 'floor-upload' });
      
    } catch (error) {
      console.error('Floor plan upload failed:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to upload floor plan',
        { id: 'floor-upload' }
      );
    } finally {
      setIsUploading(false);
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  if (!activeFloor) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Floor Plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!activeFloor.planImageUrl ? (
          <div className="text-center py-6">
            <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-3">
              <FileImage className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              No floor plan uploaded yet
            </p>
            <Button 
              onClick={handleUploadClick} 
              disabled={isUploading}
              size="sm"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-3 w-3 mr-1" />
                  Upload Floor Plan
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="aspect-video bg-muted rounded border overflow-hidden">
              <img 
                src={activeFloor.planImageUrl} 
                alt={`Floor plan for ${activeFloor.name}`}
                className="w-full h-full object-contain"
              />
            </div>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {activeFloor.widthPx}×{activeFloor.heightPx}px
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleUploadClick}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Replace"
                )}
              </Button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          onChange={handleFileUpload}
          className="hidden"
          aria-label="Upload floor plan"
        />
        
        <p className="text-xs text-muted-foreground">
          Supports PDF, PNG, JPG, JPEG, WEBP files up to 20MB
        </p>
      </CardContent>
    </Card>
  );
};