import { useState, useCallback } from "react";
import { Upload, Image as ImageIcon, Trash2, CheckCircle2, AlertCircle, Edit3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface PanoramaItem {
  nodeId: string;
  title: string;
  floor?: string;
  fileName?: string;
  imageUrl?: string;
}

interface PanoramasManagerProps {
  panoramas: PanoramaItem[];
  onChange: (items: PanoramaItem[]) => void;
}

export const PanoramasManager = ({ panoramas, onChange }: PanoramasManagerProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const generateNodeIdFromFileName = (fileName: string): string => {
    // Remove file extension and clean up
    const nameWithoutExt = fileName.replace(/\.(jpg|jpeg|png|webp)$/i, '');
    // Convert to a clean nodeId format
    return nameWithoutExt.replace(/[^a-zA-Z0-9-_]/g, '_');
  };

  const generateTitleFromFileName = (fileName: string): string => {
    // Remove file extension and replace underscores/hyphens with spaces
    return fileName
      .replace(/\.(jpg|jpeg|png|webp)$/i, '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const upsertPanoramas = (items: PanoramaItem[]) => {
    const map = new Map<string, PanoramaItem>();
    // keep existing first
    panoramas.forEach(p => map.set(p.nodeId, p));
    // upsert new ones
    items.forEach(p => {
      if (!p.nodeId || !p.title) return;
      map.set(p.nodeId, { 
        nodeId: String(p.nodeId), 
        title: String(p.title), 
        floor: p.floor ? String(p.floor) : undefined,
        fileName: p.fileName,
        imageUrl: p.imageUrl
      });
    });
    onChange(Array.from(map.values()));
  };

  const processFiles = useCallback(async (files: FileList) => {
    setIsUploading(true);
    setMessage(null);
    try {
      const items: PanoramaItem[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const nodeId = generateNodeIdFromFileName(file.name);
          const title = generateTitleFromFileName(file.name);
          const imageUrl = URL.createObjectURL(file);
          
          items.push({
            nodeId,
            title,
            fileName: file.name,
            imageUrl
          });
        }
      }

      if (items.length === 0) {
        throw new Error("No valid image files found.");
      }
      
      upsertPanoramas(items);
      setMessage({ type: "success", text: `Added ${items.length} panorama${items.length > 1 ? 's' : ''}` });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to process files" });
    } finally {
      setIsUploading(false);
    }
  }, [panoramas]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Panoramas</h2>
        <p className="text-muted-foreground">Upload JPEG panorama files</p>
      </div>

      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ImageIcon className="h-5 w-5" />
            <span>Upload Panorama Images</span>
          </CardTitle>
          <CardDescription>Supported formats: .jpg, .jpeg, .png, .webp (multiple files allowed)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative border-2 border-dashed rounded-lg p-8 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Drag and drop panorama images here, or click to browse</p>
              <p className="text-xs text-muted-foreground">JPEG, PNG, WebP formats supported</p>
            </div>
            <Input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) processFiles(files);
              }}
            />
            <div className="mt-4 flex items-center justify-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <ImageIcon className="h-3 w-3" /> Images
              </Badge>
              {isUploading && (
                <Badge variant="outline">Uploading...</Badge>
              )}
            </div>
          </div>

          {message && (
            <Alert className={`mt-4 ${message.type === 'success' ? 'border-vue-green/20 bg-vue-green/5' : 'border-destructive/20 bg-destructive/5'}`}>
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-vue-green" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {panoramas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Panorama Library</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{panoramas.length} panorama{panoramas.length > 1 ? 's' : ''}</Badge>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onChange([])}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Clear All
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Preview</th>
                    <th className="text-left p-2 font-medium">Node ID</th>
                    <th className="text-left p-2 font-medium">Title</th>
                    <th className="text-left p-2 font-medium">File Name</th>
                    <th className="text-left p-2 font-medium">Floor</th>
                  </tr>
                </thead>
                <tbody>
                  {panoramas.map((p) => (
                    <tr key={p.nodeId} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        {p.imageUrl ? (
                          <img 
                            src={p.imageUrl} 
                            alt={p.title}
                            className="w-16 h-12 object-cover rounded border"
                          />
                        ) : (
                          <div className="w-16 h-12 bg-muted rounded border flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </td>
                      <td className="p-2 font-mono text-sm">{p.nodeId}</td>
                      <td className="p-2">{p.title}</td>
                      <td className="p-2 text-sm text-muted-foreground">{p.fileName || '-'}</td>
                      <td className="p-2 text-sm text-muted-foreground">{p.floor || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

