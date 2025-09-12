import { useState } from "react";
import { Upload, Target } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useBuildingStore } from "@/stores/buildingStore";
import { Floor } from "@/types/building";

interface AddFloorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddFloorDialog = ({ open, onOpenChange }: AddFloorDialogProps) => {
  const { floors, addFloor, setActiveFloor } = useBuildingStore();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    orderIndex: floors.length + 1,
    planFile: null as File | null,
    planImageUrl: '',
  });

  const handleNext = () => {
    if (step === 1 && formData.name.trim()) {
      setStep(2);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, planFile: file }));
      // In a real app, you would upload the file and get a URL
      const mockUrl = `https://example.com/floorplans/${file.name}`;
      setFormData(prev => ({ ...prev, planImageUrl: mockUrl }));
    }
  };

  const handleCreate = () => {
    const newFloor: Floor = {
      id: `floor-${Date.now()}`,
      buildingId: 'building-1', // Mock building ID
      name: formData.name,
      orderIndex: formData.orderIndex,
      planImageUrl: formData.planImageUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addFloor(newFloor);
    setActiveFloor(newFloor.id);
    
    // Reset form
    setFormData({
      name: '',
      orderIndex: floors.length + 2,
      planFile: null,
      planImageUrl: '',
    });
    setStep(1);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setStep(1);
    setFormData({
      name: '',
      orderIndex: floors.length + 1,
      planFile: null,
      planImageUrl: '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Floor</DialogTitle>
          <DialogDescription>
            Create a new floor and upload its floor plan
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="floor-name">Floor Name</Label>
              <Input
                id="floor-name"
                placeholder="e.g., Ground Floor, Level 1, Basement"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="floor-order">Floor Order</Label>
              <Input
                id="floor-order"
                type="number"
                min="1"
                value={formData.orderIndex}
                onChange={(e) => setFormData(prev => ({ ...prev, orderIndex: parseInt(e.target.value) || 1 }))}
              />
              <p className="text-xs text-muted-foreground">
                Order determines the floor sequence (1 = lowest, higher numbers = upper floors)
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleNext} disabled={!formData.name.trim()}>
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Floor Plan Upload</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center relative">
                {formData.planFile ? (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">{formData.planFile.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {(formData.planFile.size / 1024 / 1024).toFixed(1)} MB
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, planFile: null, planImageUrl: '' }))}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <div className="text-sm">Upload floor plan (PDF or image)</div>
                    <div className="text-xs text-muted-foreground">
                      Supports PDF, PNG, JPG files up to 20MB
                    </div>
                  </div>
                )}
                
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <Label className="text-sm font-medium">Calibration (Optional)</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Calibration will be available after creating the floor. You can set the scale by clicking two points and entering the real-world distance.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleCreate}>
                Create Floor
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};