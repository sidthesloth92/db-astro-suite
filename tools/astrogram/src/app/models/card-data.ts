/**
 * AstroGram Data Models
 */

export interface FilterExposure {
  name: string;
  color: string;
  frames: number;
  seconds: number;
  enabled: boolean;
}

export interface EquipmentItem {
  icon: string;
  label: string;
  value: string;
}

export interface SoftwareItem {
  icon: string;
  label: string;
  name: string;
}

export interface CardData {
  // Header
  title: string;
  description?: string;
  date: string;
  location: string;
  author: string;

  // Integration
  filters: FilterExposure[];

  // Equipment
  equipment: EquipmentItem[];

  // Software
  software: SoftwareItem[];

  // Settings
  bortleScale: number;

  // Appearance
  accentColor: string;
  accentColorRgb?: string; // e.g. "255, 45, 149"
  cardOpacity: number; // 0 to 1
  backgroundImage: string | null;
  aspectRatio: '3:4' | '4:5';
}

// Default filter configurations
export const DEFAULT_FILTERS: FilterExposure[] = [
  { name: 'L', color: '#ffffff', frames: 54, seconds: 180, enabled: false },
  { name: 'Ha', color: '#ff4444', frames: 72, seconds: 300, enabled: true },
  { name: 'OIII', color: '#00ffff', frames: 32, seconds:300, enabled: true },
  { name: 'SII', color: '#ff6600', frames: 20, seconds: 300, enabled: true },
  { name: 'R', color: '#ff0000', frames: 14, seconds: 120, enabled: false },
  { name: 'G', color: '#00ff00', frames: 15, seconds: 120, enabled: false },
  { name: 'B', color: '#0066ff', frames: 15, seconds: 120, enabled: false },
];

// Dimensions for export
export const ASPECT_RATIOS = {
  '3:4': { width: 1080, height: 1440 },
  '4:5': { width: 1080, height: 1350 },
};

// Helper functions
export function calculateTotalSeconds(filter: FilterExposure): number {
  return filter.frames * filter.seconds;
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function calculateTotalIntegration(filters: FilterExposure[]): number {
  return filters
    .filter(f => f.enabled)
    .reduce((total, f) => total + calculateTotalSeconds(f), 0);
}
