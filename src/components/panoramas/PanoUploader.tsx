import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Camera, CheckCircle } from 'lucide-react';
import { useFloorplanStore } from '@/stores/floorplanStore';
import { useBuildingStore } from '@/stores/buildingStore';
import { toast } from 'sonner';

interface UploadingPano {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  thumbnail?: string;
  error?: string;
}

export const PanoUploader = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPanos, setUploadingPanos] = useState<UploadingPano[]>([]);
  const { addPano } = useFloorplanStore();
  const { getActiveFloor } = useBuildingStore();
  const activeFloor = getActiveFloor();

  const generateThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        // Create thumbnail - equirectangular preview
        canvas.width = 200;
        canvas.height = 100;
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const simulateUpload = async (pano: UploadingPano): Promise<void> => {
    return new Promise((resolve, reject) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        
        setUploadingPanos(prev => prev.map(p => 
          p.id === pano.id 
            ? { ...p, progress: Math.min(progress, 100) }
            : p
        ));

        if (progress >= 100) {
          clearInterval(interval);
          // Simulate processing time
          setTimeout(() => {
            setUploadingPanos(prev => prev.map(p => 
              p.id === pano.id 
                ? { ...p, status: 'complete', progress: 100 }
                : p
            ));
            resolve();
          }, 500);
        }
      }, 200);
    });
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || !activeFloor) return;

    const validFiles = Array.from(files).filter(file => {
      const isValidType = file.type.startsWith('image/') && 
        ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type);
      
      if (!isValidType) {
        toast.error(`${file.name}: Only JPEG/PNG images are supported`);
        return false;
      }

      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast.error(`${file.name}: File too large (max 50MB)`);
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    // Create uploading pano entries
    const newPanos: UploadingPano[] = await Promise.all(
      validFiles.map(async (file) => {
        const id = `pano_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
          const thumbnail = await generateThumbnail(file);
          return {
            id,
            file,
            progress: 0,
            status: 'uploading' as const,
            thumbnail
          };
        } catch (error) {
          return {
            id,
            file,
            progress: 0,
            status: 'error' as const,
            error: 'Failed to generate thumbnail'
          };
        }
      })
    );

    setUploadingPanos(prev => [...prev, ...newPanos]);

    // Process uploads
    for (const pano of newPanos) {
      if (pano.status === 'error') continue;

      try {
        await simulateUpload(pano);
        
        // Add to store
        const nodeId = pano.file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        const imageUrl = URL.createObjectURL(pano.file);
        
        addPano({
          id: pano.id,
          buildingId: activeFloor.buildingId || 'building-1', // Get from active floor
          floorId: activeFloor.id,
          roomId: undefined, // Will be assigned later
          nodeId,
          title: nodeId,
          fileName: pano.file.name,
          fileUrl: imageUrl, // Use object URL for now
          imageUrl,
          capturedAt: new Date(),
          metadataJson: {
            originalSize: pano.file.size,
            type: pano.file.type,
            canvasX: 0.5, // Default center position
            canvasY: 0.5
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });

        toast.success(`${pano.file.name} uploaded successfully`);
        
        // Remove from uploading list after delay
        setTimeout(() => {
          setUploadingPanos(prev => prev.filter(p => p.id !== pano.id));
        }, 2000);
        
      } catch (error) {
        setUploadingPanos(prev => prev.map(p => 
          p.id === pano.id 
            ? { ...p, status: 'error', error: 'Upload failed' }
            : p
        ));
        toast.error(`Failed to upload ${pano.file.name}`);
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const removeUploadingPano = (id: string) => {
    setUploadingPanos(prev => prev.filter(p => p.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Camera className="h-4 w-4" />
          Upload Panoramas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Button */}
        <Button
          onClick={handleUploadClick}
          className="w-full gap-2"
          disabled={!activeFloor}
        >
          <Upload className="h-4 w-4" />
          Select JPEG Panoramas
        </Button>
        
        {!activeFloor && (
          <p className="text-xs text-muted-foreground text-center">
            Please select a floor first
          </p>
        )}

        {/* Upload Progress */}
        {uploadingPanos.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium">
              Uploading {uploadingPanos.length} panorama{uploadingPanos.length > 1 ? 's' : ''}
            </div>
            
            {uploadingPanos.map((pano) => (
              <div key={pano.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  {pano.thumbnail && (
                    <img 
                      src={pano.thumbnail} 
                      alt="Thumbnail" 
                      className="w-12 h-6 object-cover rounded border"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {pano.file.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(pano.file.size / (1024 * 1024)).toFixed(1)} MB
                    </div>
                  </div>
                  
                  {pano.status === 'complete' ? (
                    <CheckCircle className="h-4 w-4 text-vue-green" />
                  ) : pano.status === 'error' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUploadingPano(pano.id)}
                      className="h-8 w-8 p-0 text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      {pano.progress.toFixed(0)}%
                    </Badge>
                  )}
                </div>
                
                {pano.status !== 'complete' && pano.status !== 'error' && (
                  <Progress value={pano.progress} className="h-1" />
                )}
                
                {pano.status === 'error' && pano.error && (
                  <p className="text-xs text-destructive">{pano.error}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
          <strong>Supported formats:</strong> JPEG, JPG, PNG
          <br />
          <strong>Max file size:</strong> 50MB per file
          <br />
          <strong>Tip:</strong> Use equirectangular 360° images for best results
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </CardContent>
    </Card>
  );
};