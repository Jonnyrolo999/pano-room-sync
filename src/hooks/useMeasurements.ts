import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface Measurement {
  id: string;
  name: string;
  floorId: string;
  roomId?: string;
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  pxLength: number;
  meters: number;
  unit: 'meters' | 'feet';
  createdAt: Date;
}

export const useMeasurements = (floorId: string) => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);

  const addMeasurement = useCallback((measurement: Omit<Measurement, 'id' | 'createdAt'>) => {
    const newMeasurement: Measurement = {
      ...measurement,
      id: `measure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };
    setMeasurements(prev => [...prev, newMeasurement]);
    toast.success(`Measurement "${measurement.name}" added`);
    return newMeasurement;
  }, []);

  const updateMeasurement = useCallback((id: string, updates: Partial<Measurement>) => {
    setMeasurements(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    toast.success('Measurement updated');
  }, []);

  const removeMeasurement = useCallback((id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
    toast.success('Measurement removed');
  }, []);

  const getMeasurementsByRoom = useCallback((roomId: string) => {
    return measurements.filter(m => m.roomId === roomId);
  }, [measurements]);

  return {
    measurements,
    addMeasurement,
    updateMeasurement,
    removeMeasurement,
    getMeasurementsByRoom,
  };
};