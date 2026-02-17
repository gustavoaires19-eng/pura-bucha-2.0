
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { DredgePoint, LatLng } from '../types';
import { MATERIAL_COLORS } from '../constants';
import { Layers, Maximize, Trash2, X, Settings2, FileJson, Filter, Save, Target, Eraser, MousePointer2, CheckCircle2, AlertCircle, Download, ListOrdered, Plus, MapPin, MousePointerClick, Undo2, Eye, EyeOff } from 'lucide-react';

declare const L: any;

interface DredgeMapProps {
  points: DredgePoint[];
  initialBoundary?: LatLng[];
  onSaveBoundary?: (boundary: LatLng[] | undefined) => void;
  onPointSelect?: (point: DredgePoint) => void;
}

interface SelectionStats {
  volume: number;
  count: number;
  avgDepth: number;
  materialDistribution: { name: string; value: number }[];
  isProjectBoundary?: boolean;
}

const DredgeMap: React.FC<DredgeMapProps> = ({ points, initialBoundary, onSaveBoundary, onPointSelect }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markersLayer = useRef<any>(null);
  const drawLayer = useRef<any>(null);
  const boundaryLayer = useRef<any>(null);
  
  const [stats, setStats] = useState<SelectionStats | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [isClickSelectionActive, setIsClickSelectionActive] = useState(false);
  const [showOfficialBoundary, setShowOfficialBoundary] = useState(true);

  const [depthThreshold, setDepthThreshold] = useState<number>(12);
  const [minDepthFilter, setMinDepthFilter] = useState<number>(0);
  const [maxDepthFilter, setMaxDepthFilter] = useState<number>(30);
  const [showFilters, setShowFilters] = useState(false);
  const [showBoundaryList, setShowBoundaryList] = useState(false);

  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  const { dataMinDepth, dataMaxDepth } = useMemo(() => {
    if (points.length === 0) return { dataMinDepth: 0, dataMaxDepth: 30 };
    const depths = points.map(p => p.depth);
    return {
      dataMinDepth: Math.floor(Math.min(...depths)),
      dataMaxDepth: Math.ceil(Math.max(...depths))
    };
  }, [points]);

  useEffect(() => {
    if (points.length > 0) {
      if (minDepthFilter < dataMinDepth) setMinDepthFilter(dataMinDepth);
      if (maxDepthFilter > dataMaxDepth) setMaxDepthFilter(dataMaxDepth);
    }
  }, [dataMinDepth, dataMaxDepth, points]);

  const isPointInPolygon = (lat: number, lng: number, polygonCoords: any[]) => {
    let res = false;
    for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
      if (((polygonCoords[i].lng > lng) !== (polygonCoords[j].lng > lng)) &&
        (lat < (polygonCoords[j].lat - polygonCoords[i].lat) * (lng - polygonCoords[i].lng) / (polygonCoords[j].lng - polygonCoords[i].lng) + polygonCoords[i].lat)) {
        res = !res;
      }
    }
    return res;
  };

  const calculateStats = () => {
    if ((!drawLayer.current && !boundaryLayer.current) || !points.length) return;
    
    let totalVolume = 0;
    let count = 0;
    let totalDepth = 0;
    const materialMap: Record<string, number> = {};

    const drawLayers = drawLayer.current?.getLayers() || [];
    const boundLayers = showOfficialBoundary ? (boundaryLayer.current?.getLayers() || []) : [];
    const allActivePolygons = [...drawLayers, ...boundLayers];

    if (allActivePolygons.length === 0) {
      setStats(null);
      return;
    }

    const filteredPoints = points.filter(p => p.depth >= minDepthFilter && p.depth <= maxDepthFilter);

    filteredPoints.forEach(point => {
      let isInsideAny = false;
      allActivePolygons.forEach((layer: any) => {
        if (layer instanceof L.Polygon) {
          const latlngs = layer.getLatLngs()[0];
          const actualCoords = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
          if (isPointInPolygon(point.latitude, point.longitude, actualCoords)) {
            isInsideAny = true;
          }
        }
      });

      if (isInsideAny) {
        totalVolume += point.volume;
        totalDepth += point.depth;
        count++;
        materialMap[point.material] = (materialMap[point.material] || 0) + point.volume;
      }
    });

    const materialDistribution = Object.entries(materialMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    setStats({
      volume: totalVolume,
      count: count,
      avgDepth: count > 0 ? totalDepth / count : 0,
      materialDistribution,
      isProjectBoundary: boundLayers.length > 0 && drawLayers.length === 0
    });
  };

  const handleRemoveBoundaryPoint = (index: number) => {
    if (!initialBoundary) return;
    const newBoundary = initialBoundary.filter((_, i) => i !== index);
    onSaveBoundary?.(newBoundary.length > 0 ? newBoundary : undefined);
  };

  const exportSelectionGeoJSON = () => {
    if (!stats) return;

    const drawLayers = drawLayer.current?.getLayers() || [];
    const boundLayers = showOfficialBoundary ? (boundaryLayer.current?.getLayers() || []) : [];
    const allActivePolygons = [...drawLayers, ...boundLayers];

    const features: any[] = [];
    allActivePolygons.forEach((layer: any) => {
      if (typeof layer.toGeoJSON === 'function') {
        const geojson = layer.toGeoJSON();
        geojson.properties = { 
          type: stats.isProjectBoundary ? "Área Oficial" : "Seleção Manual",
          calc_volume: stats.volume,
          avg_depth: stats.avgDepth.toFixed(2)
        };
        features.push(geojson);
      }
    });

    const visiblePoints = points.filter(p => p.depth >= minDepthFilter && p.depth <= maxDepthFilter);
    visiblePoints.forEach(p => {
      let inside = false;
      allActivePolygons.forEach((layer: any) => {
        if (layer instanceof L.Polygon) {
          const latlngs = layer.getLatLngs()[0];
          const actualCoords = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
          if (isPointInPolygon(p.latitude, p.longitude, actualCoords)) inside = true;
        }
      });
      if (inside) {
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
          properties: { ...p }
        });
      }
    });

    const blob = new Blob([JSON.stringify({ type: "FeatureCollection", features }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dredge_selection_${new Date().getTime()}.geojson`;
    link.click();
  };

  useEffect(() => {
    if (mapRef.current && !leafletMap.current) {
      leafletMap.current = L.map(mapRef.current, { zoomControl: false }).setView([-23.9618, -46.3322], 14);
      L.control.zoom({ position: 'bottomright' }).addTo(leafletMap.current);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(leafletMap.current);

      markersLayer.current = L.layerGroup().addTo(leafletMap.current);
      drawLayer.current = new L.FeatureGroup().addTo(leafletMap.current);
      boundaryLayer.current = new L.FeatureGroup().addTo(leafletMap.current);

      const drawControl = new L.Control.Draw({
        edit: { featureGroup: drawLayer.current },
        draw: {
          polygon: { shapeOptions: { color: '#fbbf24', fillOpacity: 0.2 } },
          rectangle: { shapeOptions: { color: '#fbbf24', fillOpacity: 0.2 } },
          polyline: false, circle: false, marker: false, circlemarker: false,
        }
      });
      leafletMap.current.addControl(drawControl);

      leafletMap.current.on(L.Draw.Event.CREATED, (e: any) => {
        drawLayer.current.clearLayers();
        drawLayer.current.addLayer(e.layer);
        calculateStats();
      });

      leafletMap.current.on('mousemove', (e: any) => setMousePos({ x: e.containerPoint.x, y: e.containerPoint.y }));
      leafletMap.current.on(L.Draw.Event.EDITED, calculateStats);
      leafletMap.current.on(L.Draw.Event.DELETED, calculateStats);
    }
  }, []);

  useEffect(() => {
    if (!leafletMap.current) return;
    const handleMapClick = (e: any) => {
      if (isClickSelectionActive) {
        const { lat, lng } = e.latlng;
        onSaveBoundary?.([...(initialBoundary || []), { lat, lng }]);
      }
    };
    leafletMap.current.on('click', handleMapClick);
    return () => { leafletMap.current?.off('click', handleMapClick); };
  }, [isClickSelectionActive, initialBoundary, onSaveBoundary]);

  useEffect(() => {
    if (boundaryLayer.current && leafletMap.current) {
      boundaryLayer.current.clearLayers();
      if (initialBoundary && initialBoundary.length > 0 && showOfficialBoundary) {
        const poly = L.polygon(initialBoundary, { 
          color: '#0ea5e9', 
          fillColor: '#0ea5e9',
          fillOpacity: 0.15, 
          dashArray: isClickSelectionActive ? 'none' : '8, 12',
          weight: 3
        }).addTo(boundaryLayer.current);
        
        poly.bindTooltip("ÁREA OFICIAL DO PROJETO", { permanent: true, direction: 'center', className: 'boundary-tooltip' });

        initialBoundary.forEach((pt, idx) => {
          const vertexMarker = L.divIcon({
            className: 'vertex-marker-icon',
            html: `<div class="w-6 h-6 bg-sky-600 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg">${idx + 1}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
          L.marker([pt.lat, pt.lng], { icon: vertexMarker }).addTo(boundaryLayer.current);
        });

        if (!isClickSelectionActive && initialBoundary.length > 2) {
          leafletMap.current.fitBounds(poly.getBounds(), { padding: [100, 100] });
        }
      }
      calculateStats();
    }
  }, [initialBoundary, isClickSelectionActive, showOfficialBoundary]);

  useEffect(() => {
    if (markersLayer.current) {
      markersLayer.current.clearLayers();
      const visiblePoints = points.filter(p => p.depth >= minDepthFilter && p.depth <= maxDepthFilter);
      visiblePoints.forEach((point) => {
        const isShallow = point.depth < depthThreshold;
        L.circleMarker([point.latitude, point.longitude], {
          radius: isShallow ? 12 : 8,
          fillColor: MATERIAL_COLORS[point.material] || '#0ea5e9',
          color: isShallow ? '#ef4444' : '#fff',
          weight: isShallow ? 5 : 2,
          opacity: 1,
          fillOpacity: 0.9,
          className: isShallow ? 'critical-pulse' : ''
        }).addTo(markersLayer.current).bindPopup(`<b class="text-slate-800">${point.vesselName}</b><br/><span class="text-xs text-slate-500">${point.depth}m | ${point.volume}m³</span>`);
      });
    }
    calculateStats();
  }, [points, depthThreshold, minDepthFilter, maxDepthFilter]);

  const hasTemporarySelection = useMemo(() => {
    return drawLayer.current?.getLayers().length > 0;
  }, [drawLayer.current, isInteracting, stats]);

  return (
    <div className={`h-full w-full bg-slate-200 rounded-2xl overflow-hidden shadow-inner border border-slate-200 relative transition-all ${isClickSelectionActive ? 'ring-4 ring-sky-500/20' : ''}`}>
      <div ref={mapRef} className={`h-full w-full z-0 ${isClickSelectionActive ? 'cursor-crosshair' : 'cursor-default'}`} />
      
      {/* Click Selection Overlay */}
      {isClickSelectionActive && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-sky-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 animate-bounce">
          <MousePointerClick size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">Modo de Seleção Ativo</span>
        </div>
      )}

      {/* Main Controls Panel (Right) */}
      <div className="absolute top-4 right-4 flex flex-col gap-3 z-[1000] w-72 max-h-[90%] overflow-y-auto no-scrollbar">
        
        {/* Interactive Delimitation Module */}
        <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-slate-200">
           <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-[10px] uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Target size={14} /> Perímetro do Projeto
              </h4>
              <button 
                onClick={() => setShowOfficialBoundary(!showOfficialBoundary)}
                className={`p-1.5 rounded-lg transition-all ${showOfficialBoundary ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-400'}`}
                title={showOfficialBoundary ? "Ocultar Área Oficial" : "Mostrar Área Oficial"}
              >
                {showOfficialBoundary ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
           </div>

           <div className="space-y-3">
              <button 
                onClick={() => setIsClickSelectionActive(!isClickSelectionActive)}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase transition-all shadow-md ${
                  isClickSelectionActive ? 'bg-red-500 text-white animate-pulse' : 'bg-sky-600 text-white hover:bg-sky-700'
                }`}
              >
                {isClickSelectionActive ? <X size={16} /> : <MousePointerClick size={16} />}
                {isClickSelectionActive ? 'Encerrar Captura' : 'Delimitar por Pontos'}
              </button>

              {isClickSelectionActive && initialBoundary && initialBoundary.length > 0 && (
                <div className="flex gap-2">
                  <button onClick={() => handleRemoveBoundaryPoint(initialBoundary.length - 1)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase hover:bg-slate-200"><Undo2 size={14} /> Desfazer</button>
                  <button onClick={() => onSaveBoundary?.(undefined)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold uppercase hover:bg-red-100"><Trash2 size={14} /> Limpar</button>
                </div>
              )}

              {initialBoundary && initialBoundary.length > 0 && (
                <div className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${showOfficialBoundary ? 'bg-sky-50 border-sky-100' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                  <div className={`p-2 rounded-lg shadow-sm ${showOfficialBoundary ? 'bg-white text-sky-600' : 'bg-slate-100 text-slate-400'}`}>
                    <ListOrdered size={16} />
                  </div>
                  <div>
                    <p className={`text-[11px] font-bold ${showOfficialBoundary ? 'text-sky-900' : 'text-slate-600'}`}>
                      {initialBoundary.length} Vértices Oficiais
                    </p>
                    <button onClick={() => setShowBoundaryList(!showBoundaryList)} className="text-[10px] text-sky-600 font-bold hover:underline mt-1">Ver Coordenadas</button>
                  </div>
                </div>
              )}

              {showBoundaryList && initialBoundary && (
                <div className="max-h-40 overflow-y-auto border-t border-slate-100 pt-2 mt-2 space-y-1 animate-in slide-in-from-top-2">
                  {initialBoundary.map((pt, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[9px] bg-slate-50 p-1.5 rounded border border-slate-100">
                      <span className="font-mono text-slate-500"><b className="text-sky-600">P{idx+1}:</b> {pt.lat.toFixed(5)}, {pt.lng.toFixed(5)}</span>
                      <button onClick={() => handleRemoveBoundaryPoint(idx)} className="text-red-400 hover:text-red-600"><X size={10} /></button>
                    </div>
                  ))}
                </div>
              )}
           </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-slate-200">
           <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-[10px] uppercase tracking-widest text-slate-400 flex items-center gap-2"><Filter size={14} /> Filtros de Cota</h4>
              <button onClick={() => setShowFilters(!showFilters)} className={`p-1 rounded ${showFilters ? 'bg-sky-50 text-sky-600' : 'text-slate-400'}`}><Settings2 size={14} /></button>
           </div>
           <div className="space-y-4">
              <div>
                <div className="flex justify-between items-end mb-1"><span className="text-[10px] text-slate-500 font-bold uppercase">Cota Alvo:</span><span className="text-xs font-black text-red-600">{depthThreshold}m</span></div>
                <input type="range" min="0" max="30" step="0.5" value={depthThreshold} onChange={(e) => setDepthThreshold(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg accent-red-500 appearance-none cursor-pointer" />
              </div>
           </div>
        </div>
      </div>

      {/* Summary Footer */}
      {stats && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white p-5 rounded-3xl shadow-2xl z-[1000] flex items-center gap-8 min-w-[700px] border border-white/10 animate-in slide-in-from-bottom-4">
           <div className="flex items-center gap-4 border-r border-white/10 pr-6">
              <div className="p-3 bg-sky-500/20 text-sky-400 rounded-2xl"><Target size={24} /></div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{stats.isProjectBoundary ? 'Área Oficial' : 'Seleção Ativa'}</p>
                <p className="text-xl font-black text-sky-400">{stats.volume.toLocaleString()} m³</p>
              </div>
           </div>
           <div className="flex flex-col justify-center border-r border-white/10 pr-6 space-y-1">
              <div className="flex justify-between gap-4 text-[11px]"><span className="text-slate-400 font-bold uppercase">Prof. Média:</span><span className="font-black">{stats.avgDepth.toFixed(2)}m</span></div>
              <div className="flex justify-between gap-4 text-[11px]"><span className="text-slate-400 font-bold uppercase">Amostras:</span><span className="font-black">{stats.count}</span></div>
           </div>
           <button onClick={exportSelectionGeoJSON} className="flex items-center gap-2 px-6 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold uppercase hover:bg-sky-50 transition-all"><Download size={16} /> Exportar GeoJSON</button>
        </div>
      )}

      <style>{`
        .boundary-tooltip { background-color: rgba(14, 165, 233, 0.95); border: 2px solid white; color: white; font-weight: 900; font-size: 10px; letter-spacing: 0.1em; padding: 6px 12px; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); pointer-events: none; }
        @keyframes pulse-critical { 0% { stroke-width: 5; stroke-opacity: 0.9; transform: scale(1); } 50% { stroke-width: 12; stroke-opacity: 0.3; transform: scale(1.1); } 100% { stroke-width: 5; stroke-opacity: 0.9; transform: scale(1); } }
        .critical-pulse { animation: pulse-critical 2s infinite ease-in-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default DredgeMap;
