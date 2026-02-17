
import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DredgeMap from './components/DredgeMap';
import DredgeForm from './components/DredgeForm';
import TrendsView from './components/TrendsView';
import { DredgePoint, AuditLog, AuditAction, Project, LatLng } from './types';
import { INITIAL_POINTS } from './constants';
import { 
  Plus, Search, FileDown, Sparkles, X, History, 
  Settings, ShieldCheck, Trash2, Edit3, Clock, User, Camera, AlertTriangle, DatabaseZap, FolderPlus, Building2, MapPin as MapPinIcon, ChevronRight
} from 'lucide-react';
import { analyzeDredgingData } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('projects');
  
  // Projects Management
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('dredge_projects_list');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    return localStorage.getItem('active_project_id');
  });

  // Persistence Loading
  const [points, setPoints] = useState<DredgePoint[]>(() => {
    const saved = localStorage.getItem('dredge_points');
    return saved ? JSON.parse(saved) : INITIAL_POINTS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('dredge_audit_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [showForm, setShowForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingPoint, setEditingPoint] = useState<DredgePoint | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Filtering States
  const [searchTerm, setSearchTerm] = useState('');

  // Project Form State
  const [newProject, setNewProject] = useState({ name: '', client: '', location: '', description: '' });

  // Persistence Saving
  useEffect(() => {
    localStorage.setItem('dredge_projects_list', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('dredge_points', JSON.stringify(points));
  }, [points]);

  useEffect(() => {
    localStorage.setItem('dredge_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    if (activeProjectId) {
      localStorage.setItem('active_project_id', activeProjectId);
    } else {
      localStorage.removeItem('active_project_id');
    }
  }, [activeProjectId]);

  const activeProject = useMemo(() => 
    projects.find(p => p.id === activeProjectId), 
  [projects, activeProjectId]);

  // Data filtered by project
  const projectPoints = useMemo(() => 
    points.filter(p => p.projectId === activeProjectId),
  [points, activeProjectId]);

  const projectAuditLogs = useMemo(() => 
    auditLogs.filter(l => l.projectId === activeProjectId),
  [auditLogs, activeProjectId]);

  // Helper for logging actions
  const addAuditLog = (action: AuditAction, point: DredgePoint, details: string) => {
    const log: AuditLog = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      projectId: activeProjectId || undefined,
      timestamp: new Date().toISOString(),
      action,
      targetId: point.id,
      vesselName: point.vesselName,
      user: 'Eng. Supervisor', 
      details
    };
    setAuditLogs(prev => [log, ...prev]);
  };

  const filteredPoints = useMemo(() => {
    return projectPoints.filter(point => {
      const matchesSearch = 
        point.vesselName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        point.material.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (point.notes && point.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  }, [projectPoints, searchTerm]);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const project: Project = {
      id: Math.random().toString(36).substr(2, 9),
      ...newProject,
      status: 'Ativo',
      createdAt: new Date().toISOString()
    };
    setProjects([...projects, project]);
    setNewProject({ name: '', client: '', location: '', description: '' });
    setShowProjectForm(false);
    setActiveProjectId(project.id);
    setActiveTab('dashboard');
  };

  const handleDeleteProject = (id: string) => {
    if (window.confirm('Excluir este projeto apagará todos os seus pontos de dragagem e logs. Continuar?')) {
      setProjects(projects.filter(p => p.id !== id));
      setPoints(points.filter(p => p.projectId !== id));
      setAuditLogs(auditLogs.filter(l => l.projectId !== id));
      if (activeProjectId === id) setActiveProjectId(null);
    }
  };

  const handleSaveProjectBoundary = (boundary: LatLng[] | undefined) => {
    if (!activeProjectId) return;
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId ? { ...p, boundary } : p
    ));
  };

  const handleSavePoint = (pointData: Omit<DredgePoint, 'id' | 'projectId'>) => {
    if (!activeProjectId) return;

    if (editingPoint) {
      const updatedPoint = { ...pointData, id: editingPoint.id, projectId: activeProjectId } as DredgePoint;
      setPoints(points.map(p => p.id === editingPoint.id ? updatedPoint : p));
      addAuditLog('UPDATE', updatedPoint, `Alteração de registro: ${editingPoint.material} -> ${updatedPoint.material}, Vol: ${editingPoint.volume} -> ${updatedPoint.volume}m³`);
      setEditingPoint(null);
    } else {
      const newPoint: DredgePoint = {
        ...pointData,
        id: Math.random().toString(36).substr(2, 9),
        projectId: activeProjectId
      };
      setPoints([newPoint, ...points]);
      addAuditLog('CREATE', newPoint, `Inclusão de novo registro: ${newPoint.material} (${newPoint.volume}m³) em ${newPoint.vesselName}`);
    }
    setShowForm(false);
  };

  const handleDeletePoint = (id: string) => {
    const pointToDelete = points.find(p => p.id === id);
    if (pointToDelete && window.confirm('Confirmar exclusão auditada?')) {
      setPoints(points.filter(p => p.id !== id));
      addAuditLog('DELETE', pointToDelete, `Exclusão de registro: ${pointToDelete.vesselName}`);
    }
  };

  const handleResetSystem = () => {
    if (window.confirm('⚠️ AVISO CRÍTICO: Reinicializar sistema apagará TODOS os projetos e dados?')) {
      localStorage.clear();
      setProjects([]);
      setPoints([]);
      setAuditLogs([]);
      setActiveProjectId(null);
      setActiveTab('projects');
      alert('Sistema reinicializado.');
    }
  };

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeDredgingData(filteredPoints);
    setAiAnalysis(result);
    setIsAnalyzing(false);
    setActiveTab('ai');
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        projectName={activeProject?.name}
      />
      
      <main className="flex-1 ml-64 p-8 relative">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight capitalize">
              {activeTab === 'projects' ? 'Meus Projetos' : 
               activeTab === 'dashboard' ? 'Painel de Controle' : 
               activeTab === 'map' ? 'Mapa de Operações' : 
               activeTab === 'points' ? 'Atividades' : 
               activeTab === 'trends' ? 'Tendências' : 
               activeTab === 'ai' ? 'IA' : 
               activeTab === 'settings' ? 'Ajustes' : 'Auditoria'}
            </h2>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
              {activeProject ? `Monitoramento: ${activeProject.name}` : 'Gerencie seus contratos e operações'}
              {activeProject && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
            </p>
          </div>

          <div className="flex gap-3">
            {activeTab === 'projects' ? (
              <button 
                onClick={() => setShowProjectForm(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 text-white rounded-xl font-semibold hover:bg-sky-700 shadow-lg shadow-sky-200 transition-all active:scale-95"
              >
                <FolderPlus size={20} />
                Novo Projeto
              </button>
            ) : activeProject && (
              <>
                <button 
                  onClick={handleAiAnalysis}
                  disabled={isAnalyzing || filteredPoints.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
                >
                  {isAnalyzing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Sparkles size={18} />}
                  Análise IA
                </button>
                <button 
                  onClick={() => { setEditingPoint(null); setShowForm(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 text-white rounded-xl font-semibold hover:bg-sky-700 shadow-lg shadow-sky-200 transition-all active:scale-95"
                >
                  <Plus size={20} />
                  Novo Ponto
                </button>
              </>
            )}
          </div>
        </header>

        <div className="min-h-[calc(100vh-12rem)]">
          {activeTab === 'projects' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.length === 0 ? (
                <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                  <div className="p-4 bg-slate-50 rounded-full text-slate-300 mb-4">
                    <FolderPlus size={48} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Nenhum projeto cadastrado</h3>
                  <p className="text-slate-500 mt-2 max-w-xs">Comece criando um novo projeto para gerenciar seus dados de dragagem.</p>
                  <button onClick={() => setShowProjectForm(true)} className="mt-6 px-6 py-2 bg-sky-600 text-white rounded-lg font-bold">Criar Primeiro Projeto</button>
                </div>
              ) : projects.map(project => (
                <div key={project.id} className={`bg-white rounded-3xl border p-6 transition-all hover:shadow-xl group relative ${activeProjectId === project.id ? 'border-sky-500 ring-4 ring-sky-50' : 'border-slate-100'}`}>
                   <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-2xl ${activeProjectId === project.id ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <Building2 size={24} />
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => handleDeleteProject(project.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                           <Trash2 size={18} />
                         </button>
                      </div>
                   </div>
                   <h3 className="text-lg font-bold text-slate-900 truncate">{project.name}</h3>
                   <p className="text-slate-500 text-xs font-medium flex items-center gap-1 mt-1">
                     <Building2 size={12} /> {project.client}
                   </p>
                   {project.boundary && (
                     <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                        <MapPinIcon size={10} /> ÁREA DEMARCADA
                     </div>
                   )}
                   <p className="text-slate-400 text-[11px] mt-4 line-clamp-2 h-8">{project.description || 'Sem descrição.'}</p>
                   
                   <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase">
                        <MapPinIcon size={12} /> {project.location}
                      </div>
                      <button 
                        onClick={() => { setActiveProjectId(project.id); setActiveTab('dashboard'); }}
                        className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${activeProjectId === project.id ? 'bg-sky-500 text-white' : 'text-sky-600 hover:bg-sky-50'}`}
                      >
                        {activeProjectId === project.id ? 'Visualizando' : 'Selecionar'}
                        <ChevronRight size={14} />
                      </button>
                   </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'dashboard' && <Dashboard points={filteredPoints} />}
          
          {activeTab === 'map' && (
            <div className="h-[calc(100vh-16rem)] min-h-[500px]">
              <DredgeMap 
                points={filteredPoints} 
                initialBoundary={activeProject?.boundary}
                onSaveBoundary={handleSaveProjectBoundary}
              />
            </div>
          )}

          {activeTab === 'trends' && <TrendsView points={projectPoints} />}

          {activeTab === 'points' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
               <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">Registros de Campo ({filteredPoints.length})</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar..." className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                  </div>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                      <tr>
                        <th className="px-6 py-4">Data/Hora</th>
                        <th className="px-6 py-4">Embarcação</th>
                        <th className="px-6 py-4">Material</th>
                        <th className="px-6 py-4 text-right">Prof. (m)</th>
                        <th className="px-6 py-4 text-right">Vol. (m³)</th>
                        <th className="px-6 py-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredPoints.length > 0 ? filteredPoints.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-slate-500">{new Date(p.timestamp).toLocaleString('pt-BR')}</td>
                          <td className="px-6 py-4 font-medium text-slate-700">{p.vesselName}</td>
                          <td className="px-6 py-4"><span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700">{p.material}</span></td>
                          <td className="px-6 py-4 text-right font-semibold text-sky-700">{p.depth.toFixed(1)}</td>
                          <td className="px-6 py-4 text-right font-semibold">{p.volume.toLocaleString()}</td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center gap-1">
                              <button onClick={() => { setEditingPoint(p); setShowForm(true); }} className="p-2 text-slate-400 hover:text-sky-600"><Edit3 size={18} /></button>
                              <button onClick={() => handleDeletePoint(p.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18} /></button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">Nenhum registro para este projeto.</td></tr>
                      )}
                    </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
               <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-800 uppercase text-sm tracking-tight flex items-center gap-2"><History size={18} /> Auditoria do Projeto</h3>
                    <button disabled={projectAuditLogs.length === 0} onClick={() => {}} className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Exportar Logs</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-100 text-slate-400 text-[10px] font-black uppercase">
                        <tr><th className="px-6 py-4">Data</th><th className="px-6 py-4">Ação</th><th className="px-6 py-4">Usuário</th><th className="px-6 py-4">Detalhes</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {projectAuditLogs.map(log => (
                          <tr key={log.id}>
                            <td className="px-6 py-4 font-mono text-xs">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                            <td className="px-6 py-4">
                               <span className={`px-2 py-0.5 rounded text-[10px] font-black ${log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' : log.action === 'UPDATE' ? 'bg-sky-100 text-sky-700' : 'bg-red-100 text-red-700'}`}>{log.action}</span>
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-600">{log.user}</td>
                            <td className="px-6 py-4 text-xs text-slate-500 italic">{log.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-indigo-900 rounded-3xl p-8 text-white relative overflow-hidden">
                <Sparkles size={120} className="absolute top-0 right-0 p-8 opacity-10" />
                <h3 className="text-2xl font-bold mb-2">Relatório Estratégico IA</h3>
                <p className="text-indigo-200">Insights baseados exclusivamente no projeto {activeProject?.name}.</p>
              </div>
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm min-h-[400px]">
                {aiAnalysis ? (
                  <div className="prose prose-slate max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\n/g, '<br/>') }} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20">
                    <Sparkles size={40} className="text-slate-200 mb-4" />
                    <h4 className="text-xl font-bold text-slate-800">Pronto para Analisar</h4>
                    <p className="text-slate-500 mt-2">Clique em "Análise IA" para processar os {filteredPoints.length} registros atuais.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-white p-8 rounded-3xl border border-slate-200">
                <h3 className="text-xl font-bold text-slate-800 mb-6">Manutenção Global</h3>
                <div className="p-6 bg-red-50 rounded-2xl border border-red-100 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-red-800">Apagar Todo o Sistema</p>
                    <p className="text-sm text-red-600 opacity-70">Remove permanentemente todos os projetos e logs.</p>
                  </div>
                  <button onClick={handleResetSystem} className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors">
                    Reset Total
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal Projeto */}
      {showProjectForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold">Novo Projeto de Dragagem</h3>
              <button onClick={() => setShowProjectForm(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleCreateProject} className="p-8 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 mb-1 block tracking-widest">Nome do Projeto</label>
                <input required value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} type="text" className="w-full px-4 py-2 bg-slate-50 border rounded-xl" placeholder="ex: Dragagem Porto Sul 2024" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 mb-1 block tracking-widest">Cliente</label>
                <input required value={newProject.client} onChange={e => setNewProject({...newProject, client: e.target.value})} type="text" className="w-full px-4 py-2 bg-slate-50 border rounded-xl" placeholder="ex: Autoridade Portuária" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 mb-1 block tracking-widest">Localização</label>
                <input required value={newProject.location} onChange={e => setNewProject({...newProject, location: e.target.value})} type="text" className="w-full px-4 py-2 bg-slate-50 border rounded-xl" placeholder="ex: Terminal 2 - Berço 4" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 mb-1 block tracking-widest">Breve Descrição</label>
                <textarea value={newProject.description} onChange={e => setNewProject({...newProject, description: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border rounded-xl h-24 resize-none" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowProjectForm(false)} className="flex-1 px-6 py-3 rounded-xl border font-bold text-slate-600">Cancelar</button>
                <button type="submit" className="flex-1 px-6 py-3 rounded-xl bg-sky-600 text-white font-bold hover:bg-sky-700 shadow-lg shadow-sky-200">Criar Projeto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ponto */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="bg-slate-900 px-8 py-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">{editingPoint ? 'Editar Registro' : 'Novo Registro Técnico'}</h3>
                <p className="text-slate-400 text-xs">Projeto: {activeProject?.name}</p>
              </div>
              <button onClick={() => { setShowForm(false); setEditingPoint(null); }} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><X size={24} /></button>
            </div>
            <div className="p-8 max-h-[80vh] overflow-y-auto">
              <DredgeForm 
                onAddPoint={handleSavePoint} 
                onCancel={() => { setShowForm(false); setEditingPoint(null); }}
                initialData={editingPoint || undefined}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
