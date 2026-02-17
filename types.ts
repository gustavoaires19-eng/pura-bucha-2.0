
export enum MaterialType {
  AREIA = 'Areia',
  ARGILA = 'Argila',
  SILTE = 'Silte',
  ROCHA = 'Rocha',
  OUTRO = 'Outro'
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  location: string;
  description?: string;
  status: 'Ativo' | 'Concluído' | 'Suspenso';
  createdAt: string;
  boundary?: LatLng[]; // Coordenadas do polígono da área de dragagem
}

export interface DredgePoint {
  id: string;
  projectId: string; // Vínculo com o projeto
  timestamp: string;
  latitude: number;
  longitude: number;
  depth: number; // in meters
  volume: number; // in cubic meters
  material: MaterialType;
  vesselName: string;
  notes?: string;
  photo?: string; // base64 string or URL
}

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface AuditLog {
  id: string;
  projectId?: string; // Vínculo opcional (ações globais podem não ter)
  timestamp: string;
  action: AuditAction;
  targetId: string;
  vesselName: string;
  user: string;
  details: string;
}

export interface ProjectStats {
  totalVolume: number;
  avgDepth: number;
  pointCount: number;
  materialDistribution: { name: string; value: number }[];
}
