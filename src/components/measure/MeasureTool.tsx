import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ruler, X, Check } from 'lucide-react';
import { useBuildingStore } from '@/stores/buildingStore';
import { useMeasurements, type Measurement } from '@/hooks/useMeasurements';

interface MeasureToolProps {
  isActive: boolean;
  onToggle: () => void;
  onStartMeasure?: () => void;
  currentMeasurement?: {
    p1: { x: number; y: number };
    p2: { x: number; y: number };
    pxLength: number;
  } | null;
  onCompleteMeasure?: (name: string, unit: 'meters' | 'feet') => void;
  selectedRoomId?: string;
}

export const MeasureTool = ({ 
  isActive, 
  onToggle, 
  onStartMeasure,
  currentMeasurement,
  onCompleteMeasure,
  selectedRoomId 
}: MeasureToolProps) => {
  const [measureName, setMeasureName] = useState('');
  const [measureUnit, setMeasureUnit] = useState<'meters' | 'feet'>('meters');
  const { getActiveFloor } = useBuildingStore();
  const activeFloor = getActiveFloor();
  const { measurements, removeMeasurement } = useMeasurements(activeFloor?.id || '');

  const handleCompleteMeasure = () => {
    if (!currentMeasurement || !measureName.trim()) return;
    onCompleteMeasure?.(measureName.trim(), measureUnit);
    setMeasureName('');
  };

  const handleCancelMeasure = () => {
    onToggle();
    setMeasureName('');
  };

  // Get calibration for converting pixels to real units
  const calibration = activeFloor?.calibrationJson;
  const pixelsPerMeter = calibration?.pixelsPerMeter || 1;

  const formatMeasurement = (pxLength: number, unit: 'meters' | 'feet') => {
    const meters = pxLength / pixelsPerMeter;
    if (unit === 'feet') {
      const feet = meters * 3.28084;
      return `${feet.toFixed(2)} ft`;
    }
    return `${meters.toFixed(2)} m`;
  };

  const roomMeasurements = selectedRoomId ? 
    measurements.filter(m => m.roomId === selectedRoomId) : 
    measurements;

  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Ruler className="h-4 w-4" />
          Measure Tool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active measurement */}
        {currentMeasurement && (
          <div className="p-3 bg-primary/10 border border-primary rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-primary">Active Measurement</span>
              <Badge variant="secondary">
                {formatMeasurement(currentMeasurement.pxLength, measureUnit)}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <Input
                placeholder="Enter measurement name..."
                value={measureName}
                onChange={(e) => setMeasureName(e.target.value)}
                className="text-sm"
              />
              
              <Select value={measureUnit} onValueChange={(value: 'meters' | 'feet') => setMeasureUnit(value)}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meters">Meters (m)</SelectItem>
                  <SelectItem value="feet">Feet (ft)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleCompleteMeasure}
                disabled={!measureName.trim()}
                className="flex-1"
              >
                <Check className="h-3 w-3 mr-1" />
                Save
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleCancelMeasure}
                className="flex-1"
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Start measurement button */}
        {!currentMeasurement && (
          <Button
            onClick={onStartMeasure || onToggle}
            variant={isActive ? "default" : "outline"}
            className="w-full gap-2"
          >
            <Ruler className="h-4 w-4" />
            {isActive ? "Click two points to measure" : "Start Measuring"}
          </Button>
        )}

        {/* Existing measurements */}
        {roomMeasurements.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedRoomId ? "Room Measurements" : "All Measurements"}
              </span>
              <Badge variant="secondary">{roomMeasurements.length}</Badge>
            </div>
            
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {roomMeasurements.map((measurement) => (
                <div
                  key={measurement.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {measurement.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatMeasurement(measurement.pxLength, measurement.unit)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMeasurement(measurement.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
          <strong>Instructions:</strong>
          <br />• Click "Start Measuring" to begin
          <br />• Click two points on the floor plan
          <br />• Enter a name and select unit
          <br />• Save to create permanent measurement
        </div>
      </CardContent>
    </Card>
  );
};
