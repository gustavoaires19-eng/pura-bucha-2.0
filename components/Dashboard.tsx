
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DredgePoint } from '../types';
import { MATERIAL_COLORS } from '../constants';
import { Activity, Waves, Database, Ship } from 'lucide-react';

interface DashboardProps {
  points: DredgePoint[];
}

const Dashboard: React.FC<DashboardProps> = ({ points }) => {
  const totalVolume = points.reduce((acc, p) => acc + p.volume, 0);
  const avgDepth = points.length ? points.reduce((acc, p) => acc + p.depth, 0) / points.length : 0;
  
  const materialStats = Object.values(points.reduce((acc: any, p) => {
    if (!acc[p.material]) acc[p.material] = { name: p.material, value: 0 };
    acc[p.material].value += p.volume;
    return acc;
  }, {}));

  const timeSeriesData = points
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(p => ({
      date: new Date(p.timestamp).toLocaleDateString('pt-BR'),
      volume: p.volume
    }));

  const cards = [
    { label: 'Volume Total', value: `${totalVolume.toLocaleString()} m³`, icon: Database, color: 'text-sky-500', bg: 'bg-sky-50' },
    { label: 'Prof. Média', value: `${avgDepth.toFixed(2)} m`, icon: Waves, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { label: 'Pontos Registrados', value: points.length, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Embarcações Ativas', value: new Set(points.map(p => p.vesselName)).size, icon: Ship, color: 'text-amber-500', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">{card.label}</p>
              <h3 className="text-2xl font-bold text-slate-900">{card.value}</h3>
            </div>
            <div className={`${card.bg} ${card.color} p-3 rounded-xl`}>
              <card.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Distribuição de Materiais (m³)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={materialStats}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {materialStats.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={MATERIAL_COLORS[entry.name] || '#eee'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {materialStats.map((entry: any) => (
              <div key={entry.name} className="flex flex-col items-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold">{entry.name}</span>
                <span className="text-sm font-semibold">{entry.value}m³</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Histórico de Volume por Operação</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="volume" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
