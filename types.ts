export enum MissionId {
  GLOBAL = 'GLOBAL',
  EUROPE = 'EUROPE',
  LOCAL = 'LOCAL',
  EXPLORATION = 'EXPLORATION'
}

export interface MissionConfig {
  id: MissionId;
  title: string;
  subtitle: string;
  iconName: 'Rocket' | 'Flag' | 'Home' | 'Satellite';
}

export interface AnalysisResult {
  nivel_actual: string;
  probabilidad_exito: number;
  analisis_mision: string;
  puntos_fuertes: string[];
  brechas_criticas: string[];
  plan_de_vuelo: string[];
}

export interface FormDataState {
  name: string;
  email: string;
  mission: MissionId | null;
  file: File | null;
  marketingConsent: boolean;
}