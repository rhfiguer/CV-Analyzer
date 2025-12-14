import React from 'react';
import { Rocket, Flag, Home, Satellite, LucideIcon, CheckCircle2, Circle } from 'lucide-react';
import { MissionConfig } from '../types';

interface MissionCardProps {
  mission: MissionConfig;
  selected: boolean;
  onClick: () => void;
}

const iconMap: Record<string, LucideIcon> = {
  Rocket,
  Flag,
  Home,
  Satellite
};

export const MissionCard: React.FC<MissionCardProps> = ({ mission, selected, onClick }) => {
  const Icon = iconMap[mission.iconName];

  return (
    <button
      onClick={onClick}
      className={`
        relative overflow-hidden p-3 sm:p-4 rounded-xl border text-left transition-all duration-200 group w-full
        flex items-center gap-4
        ${selected 
          ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)] translate-y-[-2px]' 
          : 'bg-slate-900/40 border-slate-700 hover:border-slate-500 hover:bg-slate-800/40'
        }
      `}
    >
      {/* Background Glow Effect */}
      <div className={`
        absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 transition-opacity duration-300
        ${selected ? 'opacity-100' : 'group-hover:opacity-50'}
      `} />
      
      {/* Icon Container */}
      <div className={`
        relative z-10 p-2.5 rounded-lg transition-colors flex-shrink-0
        ${selected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400 group-hover:text-cyan-400'}
      `}>
        <Icon size={20} />
      </div>
      
      {/* Text Content */}
      <div className="relative z-10 flex-grow min-w-0">
        <h3 className={`font-bold text-sm sm:text-base truncate ${selected ? 'text-white' : 'text-slate-200'}`}>
          {mission.title}
        </h3>
        <p className="text-xs text-slate-400 truncate">
          {mission.subtitle}
        </p>
      </div>

      {/* Selection Indicator (Radio Style) */}
      <div className={`relative z-10 transition-colors ${selected ? 'text-cyan-400' : 'text-slate-700'}`}>
        {selected ? <CheckCircle2 size={20} /> : <Circle size={20} />}
      </div>
    </button>
  );
};