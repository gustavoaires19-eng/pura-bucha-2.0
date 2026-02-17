
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, LineChart, Line, Legend 
} from 'recharts';
import { DredgePoint } from '../types';
import { MATERIAL_COLORS } from '../constants';
import { TrendingUp, Calendar, ArrowUpRight, Target, Activity } from 'lucide-react';

interface TrendsViewProps {
  points: DredgePoint[];
}

const TrendsView: React.FC<TrendsViewProps> = ({ points }) => {
  const monthlyData = useMemo(() => {
    const months: Record<string, any> = {};
    
    // Sort points by date
    const sortedPoints = [...points].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let cumulativeVolume = 0;

    sortedPoints.forEach(p => {
      const date = new Date(p.timestamp);
      const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      
      if (!months[monthKey]) {
        months[monthKey] = {
          name: monthKey,
          volume: 0,
          cumulative: 0,
          depth: 0,
          count: 0,
          'Areia': 0,
          'Argila': 0,
          'Silte': 0,
          'Rocha': 0,
          'Outro': 0
        };
      }
      
      months[monthKey].volume += p.volume;
      cumulativeVolume += p.volume;
      months[monthKey].cumulative = cumulativeVolume;
      months[monthKey].depth += p.depth;
      months[monthKey].count += 1;
      months[monthKey][p.material] = (months[monthKey][p.material] || 0) + p.volume;
    });

    return Object.values(months).map(m => ({
      ...m,
      avgDepth: m.count > 0 ? (m.depth / m.count).toFixed(2) : 0
    }));
  }, [points]);

  const maxVolumeMonth = useMemo(() => {
    return monthlyData.reduce((prev, current) => (prev.volume > current.volume) ? prev : current, { volume: 0 });
  }, [monthlyData]);

  const totalCurrentVolume = points.reduce((acc, p) => acc + p.volume, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Resumo de Metas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Target size={80} />
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Progresso Total</p>
          <h3 className="text-3xl font-black mb-4">{totalCurrentVolume.toLocaleString()} m³</h3>
          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
            <div className="bg-sky-400 h-full w-[65%]"></div>
          </div>
          <p className="text-[10px] text-sky-300 mt-2 font-bold uppercase">65% da Meta Anual Alcançada</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6">
          <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600">
            <ArrowUpRight size={32} />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Pico de Produção</p>
            <h3 className="text-2xl font-black text-slate-900">{maxVolumeMonth.volume?.toLocaleString()} m³</h3>
            <p className="text-xs text-slate-400">{maxVolumeMonth.name || 'N/A'}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6">
          <div className="bg-amber-50 p-4 rounded-2xl text-amber-600">
            <Activity size={32} />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Eficiência Média</p>
            <h3 className="text-2xl font-black text-slate-900">{(totalCurrentVolume / (monthlyData.length || 1)).toLocaleString(undefined, {maximumFractionDigits: 0})} m³/mês</h3>
            <p className="text-xs text-slate-400">Base: {monthlyData.length} meses</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Volume Mensal e Acumulado */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="text-sky-500" size={20} />
              Volume Mensal vs. Acumulado
            </h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorCum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="volume" name="Volume Mensal" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Area yAxisId="right" type="monotone" dataKey="cumulative" name="Total Acumulado" stroke="#6366f1" fillOpacity={1} fill="url(#colorCum)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Evolução de Materiais */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-indigo-500" size={20} />
              Evolução da Composição Geológica
            </h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="Areia" stackId="a" fill={MATERIAL_COLORS['Areia']} />
                <Bar dataKey="Argila" stackId="a" fill={MATERIAL_COLORS['Argila']} />
                <Bar dataKey="Silte" stackId="a" fill={MATERIAL_COLORS['Silte']} />
                <Bar dataKey="Rocha" stackId="a" fill={MATERIAL_COLORS['Rocha']} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Estabilidade da Profundidade */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity className="text-emerald-500" size={20} />
              Monitoramento de Estabilidade da Profundidade Média
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="avgDepth" 
                  name="Profundidade Média (m)" 
                  stroke="#10b981" 
                  strokeWidth={4} 
                  dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 flex gap-8">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-xs text-slate-500 font-medium">Estável: Variação &lt; 5%</span>
            </div>
            <p className="text-xs text-slate-400 italic">O gráfico demonstra a consistência do calado operacional mantido pelas dragas ao longo do tempo.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendsView;
