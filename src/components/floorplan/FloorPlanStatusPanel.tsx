import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileImage, Upload, Settings, X } from "lucide-react";

interface FloorPlanStatusPanelProps {
  projectId: string;
  widthPx?: number;
  heightPx?: number;
  dpi?: number;
  onReplacePlan: () => void;
  onCalibrate: () => void;
}

export const FloorPlanStatusPanel = ({
  projectId,
  widthPx,
  heightPx,
  dpi,
  onReplacePlan,
  onCalibrate,
}: FloorPlanStatusPanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem(`ui:${projectId}:statusPanelOpen`);
    return saved ? saved === "1" : true;
  });
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    const saved = localStorage.getItem(`ui:${projectId}:statusPanelPos`);
    return saved ? JSON.parse(saved) : { x: 16, y: 16 };
  });
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Auto-hide after 6s unless hovered
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      if (!hovered) setOpen(false);
    }, 6000);
    return () => window.clearTimeout(t);
  }, [open, hovered]);

  // Persist state
  useEffect(() => {
    localStorage.setItem(`ui:${projectId}:statusPanelOpen`, open ? "1" : "0");
  }, [open, projectId]);

  useEffect(() => {
    localStorage.setItem(`ui:${projectId}:statusPanelPos`, JSON.stringify(pos));
  }, [pos, projectId]);

  // ESC closes, basic focus trap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  // Draggable
  const onPointerDown = (e: React.PointerEvent) => {
    if (!(e.target as HTMLElement).closest("[data-drag-handle]\"")) return;
  };

  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    dragStart.current = pos;
    pointerStart.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    const next = { x: Math.max(8, dragStart.current.x + dx), y: Math.max(8, dragStart.current.y + dy) };
    setPos(next);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="region"
      aria-live="polite"
      className="absolute z-20 select-none"
      style={{ left: pos.x, top: pos.y }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Card className="w-80 shadow-lg">
        <CardHeader className="pb-3 cursor-grab active:cursor-grabbing" data-drag-handle onPointerDown={handleHeaderPointerDown}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileImage className="h-4 w-4" />
              Floor Plan Status
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">Active</Badge>
              <Button variant="ghost" size="icon" aria-label="Close status panel" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">Dimensions</div>
              <div className="font-medium">{widthPx ?? "Auto"} × {heightPx ?? "Auto"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">DPI</div>
              <div className="font-medium">{dpi ?? "Default"}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onReplacePlan} className="gap-1">
              <Upload className="h-3 w-3" />
              Replace Plan
            </Button>
            <Button variant="outline" size="sm" onClick={onCalibrate} className="gap-1">
              <Settings className="h-3 w-3" />
              Calibrate
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
