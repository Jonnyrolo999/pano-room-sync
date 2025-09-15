import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCw, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PanoramaItem } from "../panoramas/PanoramasManager";

interface PanoramaViewerProps {
  panoramas: PanoramaItem[];
  currentNodeId: string;
  onPanoramaChange: (nodeId: string) => void;
}

export const PanoramaViewer = ({ panoramas, currentNodeId, onPanoramaChange }: PanoramaViewerProps) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(0);

  const currentPano = panoramas.find(p => p.nodeId === currentNodeId);
  const currentIndex = panoramas.findIndex(p => p.nodeId === currentNodeId);

  // Initialize Pannellum viewer
  useEffect(() => {
    if (!viewerRef.current || !currentPano?.imageUrl) return;

    const initViewer = async () => {
      setLoading(true);
      setError(null);

      try {
        // Clean up existing viewer
        if (viewer) {
          try {
            viewer.destroy();
          } catch (e) {
            console.warn("Error destroying previous viewer:", e);
          }
        }

        // Validate image dimensions (should be 2:1 for equirectangular)
        const img = new Image();
        img.crossOrigin = "anonymous";
        
        await new Promise((resolve, reject) => {
          img.onload = () => {
            const aspectRatio = img.width / img.height;
            if (Math.abs(aspectRatio - 2) > 0.1) {
              reject(new Error(`Invalid aspect ratio: ${aspectRatio.toFixed(2)}. Expected ~2:1 for equirectangular panoramas.`));
              return;
            }
            resolve(img);
          };
          img.onerror = () => reject(new Error("Failed to load panorama image. Check network connection and CORS settings."));
          img.src = currentPano.imageUrl!;
        });

        // Load pannellum from global script
        if (typeof window !== 'undefined' && !(window as any).pannellum) {
          // Create and load pannellum script
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
          document.head.appendChild(script);
          
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
          });

          // Load CSS
          const css = document.createElement('link');
          css.rel = 'stylesheet';
          css.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
          document.head.appendChild(css);
        }

        // Create viewer instance with proper configuration
        const pannellum = (window as any).pannellum;
        const viewerInstance = pannellum.viewer(viewerRef.current, {
          type: "equirectangular",
          panorama: currentPano.imageUrl,
          autoLoad: true,
          showZoomCtrl: false,
          showFullscreenCtrl: false,
          mouseZoom: true,
          doubleClickZoom: true,
          keyboardZoom: false,
          hfov: 90,
          pitch: currentPano.pitchOffset || 0,
          yaw: currentPano.yawOffset || 0,
          minHfov: 30,
          maxHfov: 120,
        });

        // Attach events
        try {
          viewerInstance.on('load', () => {
            console.log('Panorama loaded successfully');
            setLoading(false);
          });
          viewerInstance.on('error', (err: any) => {
            console.error('Pannellum error:', err);
            setError(typeof err === 'string' ? `Viewer error: ${err}` : 'Viewer error');
            setLoading(false);
          });
        } catch (e) {
          // Some builds of pannellum may not support .on
          setLoading(false);
        }

        setViewer(viewerInstance);

      } catch (err) {
        console.error("Failed to initialize panorama viewer:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize panorama viewer");
        setLoading(false);
      }
    };

    initViewer();

    return () => {
      if (viewer) {
        try {
          viewer.destroy();
        } catch (e) {
          console.warn("Error destroying viewer:", e);
        }
      }
    };
  }, [currentPano?.imageUrl]);

  const navigatePanorama = (direction: 'prev' | 'next') => {
    if (panoramas.length === 0) return;
    
    let newIndex;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : panoramas.length - 1;
    } else {
      newIndex = currentIndex < panoramas.length - 1 ? currentIndex + 1 : 0;
    }
    
    onPanoramaChange(panoramas[newIndex].nodeId);
  };

  const resetView = () => {
    if (viewer) {
      try {
        viewer.setPitch(0);
        viewer.setYaw(0);
        viewer.setHfov(90);
      } catch {}
    }
    setYaw(0);
    setPitch(0);
  };

  const retryLoad = () => {
    setError(null);
    // Trigger reload by reinitializing viewer
    if (currentPano?.imageUrl && viewerRef.current) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // will trigger useEffect via same image url? Force re-render by setting state
        setLoading(false);
        setError(null);
      };
      img.onerror = () => setError('Failed to load image. Check CORS and URL.');
      img.src = currentPano.imageUrl;
    }
  };
  if (!currentPano) {
    return (
      <Card className="h-full">
        <CardContent className="p-6 h-full flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h4 className="font-medium">No Panorama Selected</h4>
              <p className="text-sm text-muted-foreground">
                Select a node to view its panorama
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col">
        {/* Header Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="font-mono">
              {currentPano.nodeId}
            </Badge>
            <span className="text-sm font-medium">{currentPano.title}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigatePanorama('prev')}
              disabled={panoramas.length <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Badge variant="secondary" className="text-xs">
              {currentIndex + 1} / {panoramas.length}
            </Badge>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigatePanorama('next')}
              disabled={panoramas.length <= 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={resetView}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="mb-4 border-destructive/20 bg-destructive/5">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-sm">
              {error}
              <Button
                variant="outline"
                size="sm"
                className="ml-2"
                onClick={retryLoad}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Panorama Viewer Container */}
        <div className="flex-1 relative rounded-lg overflow-hidden border bg-black">
          {loading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <div className="text-white text-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                <p className="text-sm">Loading panorama...</p>
              </div>
            </div>
          )}
          
          <div 
            ref={viewerRef} 
            className="w-full h-full"
            style={{ minHeight: "400px" }}
          />
        </div>

        {/* Thumbnail Navigation */}
        {panoramas.length > 1 && (
          <div className="mt-4 flex space-x-2 overflow-x-auto pb-2">
            {panoramas.map((pano) => (
              <button
                key={pano.nodeId}
                className={`flex-shrink-0 w-20 h-12 rounded border-2 overflow-hidden ${
                  pano.nodeId === currentNodeId 
                    ? 'border-primary' 
                    : 'border-transparent hover:border-muted-foreground'
                }`}
                onClick={() => onPanoramaChange(pano.nodeId)}
              >
                {pano.imageUrl ? (
                  <img 
                    src={pano.imageUrl} 
                    alt={pano.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">{pano.nodeId}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};