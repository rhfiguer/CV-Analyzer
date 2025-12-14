import { MissionConfig, MissionId } from './types';

export const MISSIONS: MissionConfig[] = [
  {
    id: MissionId.GLOBAL,
    title: 'Misión Global',
    subtitle: 'Mercado Anglosajón / USA',
    iconName: 'Rocket'
  },
  {
    id: MissionId.EUROPE,
    title: 'Base Europa',
    subtitle: 'Mercado Europeo / Nórdico',
    iconName: 'Flag'
  },
  {
    id: MissionId.LOCAL,
    title: 'Órbita Local',
    subtitle: 'Mejora en Latam / País',
    iconName: 'Home'
  },
  {
    id: MissionId.EXPLORATION,
    title: 'Exploración',
    subtitle: 'Remoto / Nómada Digital',
    iconName: 'Satellite'
  }
];