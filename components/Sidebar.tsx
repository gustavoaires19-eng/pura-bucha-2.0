
import React from 'react';
import { LayoutDashboard, MapPin, Map as MapIcon, BrainCircuit, History, Settings, TrendingUp, FolderKanban } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  projectName?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, projectName }) => {
  const menuItems = [
    { id: 'projects', label: 'Meus Projetos', icon: FolderKanban },
    { id: 'dashboard', label: 'Painel de Controle', icon: LayoutDashboard, requiresProject: true },
    { id: 'map', label: 'Mapa de Operações', icon: MapIcon, requiresProject: true },
    { id: 'points', label: 'Registro de Atividades', icon: MapPin, requiresProject: true },
    { id: 'trends', label: 'Análise de Tendências', icon: TrendingUp, requiresProject: true },
    { id: 'history', label: 'Histórico e Auditoria', icon: History, requiresProject: true },
    { id: 'ai', label: 'Analista de IA', icon: BrainCircuit, requiresProject: true },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col z-50">
      <div className="p-6">
        <h1 className="text-xl font-bold flex items-center gap-2 text-sky-400">
          <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center text-white font-black">D</div>
          DredgeMonitor
        </h1>
        {projectName && (
          <div className="mt-4 px-3 py-2 bg-slate-800 rounded-lg border border-slate-700">
            <p className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Projeto Ativo</p>
            <p className="text-xs font-semibold text-sky-400 truncate">{projectName}</p>
          </div>
        )}
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            disabled={item.requiresProject && !projectName}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeTab === item.id 
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/50' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            } ${item.requiresProject && !projectName ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-800 text-center">
        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
          Versão 2.4.0-PRO
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
