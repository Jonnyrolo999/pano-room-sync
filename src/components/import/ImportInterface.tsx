import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface ImportStats {
  totalRows: number;
  createdRooms: number;
  updatedRooms: number;
  errors: string[];
}

interface ImportInterfaceProps {
  onImportComplete: (data: any[], headers: { row1: string[]; row2: string[] }) => void;
}

export const ImportInterface = ({ onImportComplete }: ImportInterfaceProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const processFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setImportStats(null);

    try {
      let data: any[][] = [];
      
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const result = Papa.parse(text, { header: false });
        data = result.data as any[][];
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      } else {
        throw new Error('Unsupported file format. Please upload CSV or Excel files.');
      }

      if (data.length < 3) {
        throw new Error('File must have at least 3 rows (2 header rows + data).');
      }

      const headers = {
        row1: data[0] || [],
        row2: data[1] || [],
      };
      
      const roomData = data.slice(2).filter(row => row.some(cell => cell !== ''));
      
      const stats: ImportStats = {
        totalRows: roomData.length,
        createdRooms: roomData.length,
        updatedRooms: 0,
        errors: [],
      };

      setImportStats(stats);
      onImportComplete(roomData, headers);

    } catch (error) {
      setImportStats({
        totalRows: 0,
        createdRooms: 0,
        updatedRooms: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      });
    } finally {
      setIsUploading(false);
    }
  }, [onImportComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Import Room Data</h2>
        <p className="text-muted-foreground">
          Upload your Excel or CSV file with room data (2 header rows required)
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileSpreadsheet className="h-5 w-5" />
            <span>File Upload</span>
          </CardTitle>
          <CardDescription>
            Expected format: Row 1 = human-readable names, Row 2 = internal codes, Rows 3+ = data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-smooth ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              
              <div>
                <p className="text-sm font-medium">
                  Drag and drop your file here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports .xlsx, .xls, and .csv files
                </p>
              </div>

              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              
              <Button disabled={isUploading} className="pointer-events-none">
                {isUploading ? 'Processing...' : 'Select File'}
              </Button>
            </div>
          </div>

          {importStats && (
            <div className="mt-6 space-y-4">
              {importStats.errors.length > 0 ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {importStats.errors.map((error, index) => (
                      <div key={index}>{error}</div>
                    ))}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-vue-green/20 bg-vue-green/5">
                  <CheckCircle className="h-4 w-4 text-vue-green" />
                  <AlertDescription className="text-vue-green">
                    Import successful! Ready to process room data.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  Total Rows: {importStats.totalRows}
                </Badge>
                <Badge variant="default" className="bg-vue-green">
                  Created: {importStats.createdRooms}
                </Badge>
                {importStats.updatedRooms > 0 && (
                  <Badge variant="default" className="bg-sync-blue">
                    Updated: {importStats.updatedRooms}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};