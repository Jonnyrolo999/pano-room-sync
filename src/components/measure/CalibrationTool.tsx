import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Check, X } from 'lucide-react';
import { useBuildingStore } from '@/stores/buildingStore';
import { toast } from 'sonner';

interface CalibrationToolProps {
  isActive: boolean;
  onToggle: () => void;
  currentCalibration?: {
    p1: { x: number; y: number };
    p2: { x: number; y: number };
    pxLength: number;
  } | null;
  onCompleteCalibration?: (distance: number, unit: 'meters' | 'feet') => void;
}

export const CalibrationTool = ({ 
  isActive, 
  onToggle, 
  currentCalibration,
  onCompleteCalibration 
}: CalibrationToolProps) => {
  const [realDistance, setRealDistance] = useState('');
  const [unit, setUnit] = useState<'meters' | 'feet'>('meters');
  const { getActiveFloor } = useBuildingStore();
  const activeFloor = getActiveFloor();

  const handleCompleteCalibration = () => {
    const distance = parseFloat(realDistance);
    if (!currentCalibration || !distance || distance <= 0) {
      toast.error('Please enter a valid distance');
      return;
    }
    onCompleteCalibration?.(distance, unit);
    setRealDistance('');
  };

  const handleCancelCalibration = () => {
    onToggle();
    setRealDistance('');
  };

  // Get current calibration info
  const calibration = activeFloor?.calibrationJson;
  const hasCalibration = calibration?.pixelsPerMeter && calibration.pixelsPerMeter > 0;

  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Scale Calibration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current calibration status */}
        {hasCalibration && (
          <div className="p-3 bg-vue-green/10 border border-vue-green rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-vue-green">Current Scale</span>
              <Badge variant="secondary">Calibrated</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {calibration.pixelsPerMeter.toFixed(2)} pixels per meter
            </div>
          </div>
        )}

        {/* Active calibration */}
        {currentCalibration && (
          <div className="p-3 bg-primary/10 border border-primary rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-primary">Measuring Reference</span>
              <Badge variant="secondary">
                {currentCalibration.pxLength.toFixed(1)} px
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Real-world distance</label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 3.5"
                  value={realDistance}
                  onChange={(e) => setRealDistance(e.target.value)}
                  className="text-sm"
                />
              </div>
              
              <Select value={unit} onValueChange={(value: 'meters' | 'feet') => setUnit(value)}>
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
                onClick={handleCompleteCalibration}
                disabled={!realDistance || parseFloat(realDistance) <= 0}
                className="flex-1"
              >
                <Check className="h-3 w-3 mr-1" />
                Set Scale
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleCancelCalibration}
                className="flex-1"
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Start calibration button */}
        {!currentCalibration && (
          <Button
            onClick={onToggle}
            variant={isActive ? "default" : "outline"}
            className="w-full gap-2"
          >
            <Settings className="h-4 w-4" />
            {isActive ? "Click two points on a known distance" : "Calibrate Scale"}
          </Button>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
          <strong>How to calibrate:</strong>
          <br />1. Click "Calibrate Scale"
          <br />2. Click two points with known distance
          <br />3. Enter the real-world distance
          <br />4. Click "Set Scale" to save
          <br /><br />
          <strong>Tip:</strong> Use doorways, tiles, or other features with standard dimensions.
        </div>
      </CardContent>
    </Card>
  );
};