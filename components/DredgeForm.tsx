
import React, { useState, useRef, useEffect } from 'react';
import { MaterialType, DredgePoint } from '../types';
import { MapPin, Navigation, Anchor, Info, Waves, Ruler, Camera, X, RefreshCw, UploadCloud, Map as MapIcon, AlertCircle } from 'lucide-react';

declare const L: any;

interface DredgeFormProps {
  onAddPoint: (point: Omit<DredgePoint, 'id'>) => void;
  onCancel: () => void;
  initialData?: DredgePoint;
}

const DredgeForm: React.FC<DredgeFormProps> = ({ onAddPoint, onCancel, initialData }) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const pickerMapRef = useRef<HTMLDivElement>(null);
  const leafletPickerMap = useRef<any>(null);
  const pickerMarker = useRef<any>(null);

  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    latitude: initialData?.latitude.toString() || '',
    longitude: initialData?.longitude.toString() || '',
    depth: initialData?.depth.toString() || '',
    volume: initialData?.volume.toString() || '',
    material: initialData?.material || MaterialType.AREIA,
    vesselName: initialData?.vesselName || '',
    notes: initialData?.notes || '',
    photo: initialData?.photo || ''
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);

    if (formData.latitude === '' || isNaN(lat)) {
      newErrors.latitude = 'Informe uma latitude válida.';
    } else if (lat < -90 || lat > 90) {
      newErrors.latitude = 'A latitude deve estar entre -90 e 90.';
    }

    if (formData.longitude === '' || isNaN(lng)) {
      newErrors.longitude = 'Informe uma longitude válida.';
    } else if (lng < -180 || lng > 180) {
      newErrors.longitude = 'A longitude deve estar entre -180 e 180.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }));
        setErrors(prev => ({ ...prev, latitude: '', longitude: '' }));
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setFormData(prev => ({ ...prev, photo: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    onAddPoint({
      timestamp: initialData?.timestamp || new Date().toISOString(),
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      depth: parseFloat(formData.depth),
      volume: parseFloat(formData.volume),
      material: formData.material,
      vesselName: formData.vesselName,
      notes: formData.notes,
      photo: formData.photo
    });
  };

  useEffect(() => {
    if (showLocationPicker && pickerMapRef.current && !leafletPickerMap.current) {
      const initialLat = parseFloat(formData.latitude) || -23.9618;
      const initialLng = parseFloat(formData.longitude) || -46.3322;

      leafletPickerMap.current = L.map(pickerMapRef.current).setView([initialLat, initialLng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(leafletPickerMap.current);
      pickerMarker.current = L.marker([initialLat, initialLng]).addTo(leafletPickerMap.current);

      leafletPickerMap.current.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        setFormData(prev => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
        setErrors(prev => ({ ...prev, latitude: '', longitude: '' }));
        pickerMarker.current.setLatLng(e.latlng);
      });
    }
    return () => { if (!showLocationPicker && leafletPickerMap.current) { leafletPickerMap.current.remove(); leafletPickerMap.current = null; } };
  }, [showLocationPicker]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
            <Navigation size={14} className="text-sky-500" /> Latitude
          </label>
          <div className="flex gap-2">
            <input 
              required 
              type="number" 
              step="any" 
              value={formData.latitude} 
              onChange={(e) => {
                setFormData({ ...formData, latitude: e.target.value });
                if (errors.latitude) setErrors({ ...errors, latitude: '' });
              }} 
              className={`flex-1 px-4 py-2 rounded-lg border outline-none transition-colors ${errors.latitude ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-sky-500'}`} 
              placeholder="-23.96..." 
            />
            <div className="flex gap-1">
              <button type="button" onClick={getCurrentLocation} title="Minha localização" className="p-2 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors"><MapPin size={20} /></button>
              <button type="button" onClick={() => setShowLocationPicker(true)} title="Escolher no mapa" className="p-2 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors"><MapIcon size={20} /></button>
            </div>
          </div>
          {errors.latitude && (
            <p className="text-red-500 text-[10px] font-bold flex items-center gap-1 mt-1">
              <AlertCircle size={12} /> {errors.latitude}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
            <Navigation size={14} className="text-sky-500" /> Longitude
          </label>
          <input 
            required 
            type="number" 
            step="any" 
            value={formData.longitude} 
            onChange={(e) => {
              setFormData({ ...formData, longitude: e.target.value });
              if (errors.longitude) setErrors({ ...errors, longitude: '' });
            }} 
            className={`w-full px-4 py-2 rounded-lg border outline-none transition-colors ${errors.longitude ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-sky-500'}`} 
            placeholder="-46.33..." 
          />
          {errors.longitude && (
            <p className="text-red-500 text-[10px] font-bold flex items-center gap-1 mt-1">
              <AlertCircle size={12} /> {errors.longitude}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
            <Waves size={14} className="text-sky-500" /> Profundidade (m)
          </label>
          <input required type="number" min="0" step="0.01" value={formData.depth} onChange={(e) => setFormData({ ...formData, depth: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-sky-500" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
            <Ruler size={14} className="text-sky-500" /> Volume (m³)
          </label>
          <input required type="number" min="0" value={formData.volume} onChange={(e) => setFormData({ ...formData, volume: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-sky-500" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Material</label>
          <select value={formData.material} onChange={(e) => setFormData({ ...formData, material: e.target.value as MaterialType })} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none bg-white focus:border-sky-500">
            {Object.values(MaterialType).map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
            <Anchor size={14} className="text-sky-500" /> Embarcação
          </label>
          <input required type="text" value={formData.vesselName} onChange={(e) => setFormData({ ...formData, vesselName: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-sky-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Evidência Fotográfica</label>
          {!formData.photo ? (
            <button type="button" onClick={() => galleryInputRef.current?.click()} className="w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 hover:border-sky-300 transition-all">
              <UploadCloud size={24} /> <span className="text-xs mt-1">Carregar Foto</span>
            </button>
          ) : (
            <div className="relative h-32 rounded-2xl overflow-hidden group">
              <img src={formData.photo} alt="Preview" className="w-full h-full object-cover" />
              <button type="button" onClick={removePhoto} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                <X size={16} />
              </button>
            </div>
          )}
          <input type="file" ref={galleryInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Observações Técnicas</label>
          <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none h-32 resize-none text-sm focus:border-sky-500" placeholder="Ex: Presença de detritos, variação de maré..." />
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button type="button" onClick={onCancel} className="flex-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors">Cancelar</button>
        <button type="submit" className="flex-1 px-6 py-3 rounded-xl bg-sky-600 text-white font-semibold hover:bg-sky-700 shadow-lg shadow-sky-600/30 transition-all">{initialData ? 'Atualizar Registro' : 'Salvar Registro'}</button>
      </div>

      {showLocationPicker && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><MapIcon size={18} /> Selecionar Coordenadas</h3>
              <button type="button" onClick={() => setShowLocationPicker(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="h-[400px] w-full"><div ref={pickerMapRef} className="h-full w-full" /></div>
            <div className="p-4 bg-slate-50 flex justify-between items-center">
              <p className="text-xs text-slate-500 font-medium">Clique no mapa para posicionar o marcador.</p>
              <button type="button" onClick={() => setShowLocationPicker(false)} className="px-6 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default DredgeForm;
