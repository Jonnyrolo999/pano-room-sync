import { useState, useCallback } from "react";
import { Upload, Image as ImageIcon, Trash2, FileJson, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Papa from "papaparse";

export interface PanoramaItem {
  nodeId: string;
  title: string;
  floor?: string;
}

interface PanoramasManagerProps {
  panoramas: PanoramaItem[];
  onChange: (items: PanoramaItem[]) => void;
}

export const PanoramasManager = ({ panoramas, onChange }: PanoramasManagerProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const upsertPanoramas = (items: PanoramaItem[]) => {
    const map = new Map<string, PanoramaItem>();
    // keep existing first
    panoramas.forEach(p => map.set(p.nodeId, p));
    // upsert new ones
    items.forEach(p => {
      if (!p.nodeId || !p.title) return;
      map.set(p.nodeId, { nodeId: String(p.nodeId), title: String(p.title), floor: p.floor ? String(p.floor) : undefined });
    });
    onChange(Array.from(map.values()));
  };

  const parseCSV = (text: string) => {
    const res = Papa.parse(text, { header: true, skipEmptyLines: true });
    const rows = (res.data as any[]).map(r => ({ nodeId: r.nodeId || r.id, title: r.title || r.name, floor: r.floor }));
    return rows.filter(r => r.nodeId && r.title) as PanoramaItem[];
  };

  const parseJSON = (text: string) => {
    const json = JSON.parse(text);
    if (Array.isArray(json)) {
      return json
        .map((r: any) => ({ nodeId: r.nodeId || r.id, title: r.title || r.name, floor: r.floor }))
        .filter((r: any) => r.nodeId && r.title) as PanoramaItem[];
    }
    if (json.nodes && Array.isArray(json.nodes)) {
      return json.nodes
        .map((n: any) => ({ nodeId: n.nodeId || n.id, title: n.title || n.name, floor: n.floor }))
        .filter((r: any) => r.nodeId && r.title) as PanoramaItem[];
    }
    return [] as PanoramaItem[];
  };

  const processFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setMessage(null);
    try {
      const text = await file.text();
      let items: PanoramaItem[] = [];
      if (file.name.toLowerCase().endsWith(".csv")) {
        items = parseCSV(text);
      } else if (file.name.toLowerCase().endsWith(".json")) {
        items = parseJSON(text);
      } else {
        throw new Error("Unsupported format. Please upload CSV or JSON.");
      }

      if (items.length === 0) throw new Error("No panoramas found in the file.");
      upsertPanoramas(items);
      setMessage({ type: "success", text: `Imported ${items.length} panoramas` });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to import" });
    } finally {
      setIsUploading(false);
    }
  }, [panoramas]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Panoramas</h2>
        <p className="text-muted-foreground">Upload Pano2VR JSON or CSV (nodeId,title[,floor])</p>
      </div>

      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ImageIcon className="h-5 w-5" />
            <span>Upload Panoramas</span>
          </CardTitle>
          <CardDescription>Supported: .json (with nodes[]) or .csv (headers: nodeId,title,floor)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative border-2 border-dashed rounded-lg p-8 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Drag and drop a file here, or click to browse</p>
              <p className="text-xs text-muted-foreground">.json or .csv</p>
            </div>
            <Input
              type="file"
              accept=".json,.csv"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) processFile(f);
              }}
            />
            <div className="mt-4 flex items-center justify-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <FileJson className="h-3 w-3" /> JSON
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <FileSpreadsheet className="h-3 w-3" /> CSV
              </Badge>
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
              <span>Library</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{panoramas.length} items</Badge>
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
                    <th className="text-left p-2 font-medium">Node ID</th>
                    <th className="text-left p-2 font-medium">Title</th>
                    <th className="text-left p-2 font-medium">Floor</th>
                  </tr>
                </thead>
                <tbody>
                  {panoramas.map((p) => (
                    <tr key={p.nodeId} className="border-b">
                      <td className="p-2 font-mono text-sm">{p.nodeId}</td>
                      <td className="p-2">{p.title}</td>
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

