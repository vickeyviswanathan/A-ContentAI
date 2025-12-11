
import React, { useRef } from 'react';
import { StudioConfig, STUDIO_THEMES, STUDIO_LIGHTING, STUDIO_COMPOSITIONS, STUDIO_ELEMENTS, STUDIO_BACKGROUNDS } from '../types';

interface StudioControlsProps {
  config: StudioConfig;
  onChange: (newConfig: StudioConfig) => void;
}

const StudioControls: React.FC<StudioControlsProps> = ({ config, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRefImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onChange({ ...config, referenceImage: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleElement = (el: string) => {
    const newElements = config.elements.includes(el)
      ? config.elements.filter(e => e !== el)
      : [...config.elements, el];
    onChange({ ...config, elements: newElements });
  };

  return (
    <div className="space-y-6">
      
      {/* Theme Selector */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">1. Theme & Mood</h3>
        <div className="grid grid-cols-2 gap-2">
          {STUDIO_THEMES.map(theme => (
            <button
              key={theme.id}
              onClick={() => onChange({ ...config, theme: theme.label })}
              className={`p-3 rounded-lg text-xs font-medium transition-all border ${
                config.theme === theme.label
                  ? 'border-blue-500 ring-1 ring-blue-500 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300'
              } ${theme.color}`}
            >
              {theme.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lighting & Composition */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">2. Lighting & Atmosphere</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Lighting</label>
            <select
              value={config.lighting}
              onChange={(e) => onChange({ ...config, lighting: e.target.value })}
              className="w-full text-sm border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              {STUDIO_LIGHTING.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Composition</label>
            <select
              value={config.composition}
              onChange={(e) => onChange({ ...config, composition: e.target.value })}
              className="w-full text-sm border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              {STUDIO_COMPOSITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Elements & Props */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">3. Elements & Textures</h3>
        <div className="flex flex-wrap gap-2">
          {STUDIO_ELEMENTS.map(el => (
            <button
              key={el}
              onClick={() => toggleElement(el)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors border ${
                config.elements.includes(el)
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {config.elements.includes(el) ? '✓ ' : '+ '}{el}
            </button>
          ))}
        </div>
      </div>

      {/* Background */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">4. Background</h3>
        <select
            value={config.background}
            onChange={(e) => onChange({ ...config, background: e.target.value })}
            className="w-full text-sm border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        >
            {STUDIO_BACKGROUNDS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
        </select>
      </div>

      {/* Custom Instructions */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">5. Extra Details</h3>
        <textarea
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            placeholder="E.g., Place the bottle on a wooden table, add a lemon slice on the left..."
            value={config.customInstructions || ''}
            onChange={(e) => onChange({ ...config, customInstructions: e.target.value })}
        />
      </div>

      {/* Style Reference */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">6. Style Reference</h3>
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-50 transition-colors relative overflow-hidden group"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleRefImageUpload}
          />
          
          {config.referenceImage ? (
            <div className="relative aspect-video w-full">
              <img src={config.referenceImage} alt="Ref" className="w-full h-full object-cover rounded" />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs">
                Change Image
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <svg className="w-6 h-6 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-xs text-slate-500">Upload Reference Style</p>
            </div>
          )}
        </div>
        
        {/* Match Brand Vibe Toggle */}
        <div className="mt-3 flex items-center justify-between bg-purple-50 p-2.5 rounded-lg border border-purple-100">
           <div className="flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full ${config.matchBrandVibe ? 'bg-purple-500 animate-pulse' : 'bg-slate-300'}`}></div>
               <span className="text-xs font-bold text-slate-700">Match Brand Vibe</span>
           </div>
           <button
             onClick={(e) => {
                 e.stopPropagation();
                 onChange({ ...config, matchBrandVibe: !config.matchBrandVibe });
             }}
             className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${config.matchBrandVibe ? 'bg-purple-600' : 'bg-slate-300'}`}
           >
             <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${config.matchBrandVibe ? 'translate-x-5' : 'translate-x-1'}`} />
           </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
           When enabled, AI will extract colors from the reference image (or product) and apply them to the scene.
        </p>
      </div>

    </div>
  );
};

export default StudioControls;
