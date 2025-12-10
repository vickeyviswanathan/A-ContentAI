import React, { useState, useEffect } from 'react';
import Button from './Button';
import { GeneratedImage } from '../types';

interface GeneratedAssetCardProps {
  image: GeneratedImage;
  onDownload: (url: string, id: string) => void;
  onRegenerate: (id: string, newPrompt: string) => void;
  onPreview: (url: string) => void;
  getBadgeColor: (type?: string) => string;
}

const GeneratedAssetCard: React.FC<GeneratedAssetCardProps> = ({ 
  image, 
  onDownload, 
  onRegenerate, 
  onPreview,
  getBadgeColor 
}) => {
  const [editedPrompt, setEditedPrompt] = useState(image.prompt);
  const [isEditing, setIsEditing] = useState(false);
  
  // Text Editing State
  const [detectedTexts, setDetectedTexts] = useState<string[]>([]);
  const [activeTextIndex, setActiveTextIndex] = useState<number | null>(null);
  
  // Global regex to find ALL text rendering commands
  const textRegexGlobal = /Render the text:\s*"([^"]+)"/gi;

  // Sync state if prop updates
  useEffect(() => {
    setEditedPrompt(image.prompt);
  }, [image.prompt]);

  // Sync detected texts from the current editedPrompt
  useEffect(() => {
    // Use matchAll to find all occurrences
    const matches = [...editedPrompt.matchAll(textRegexGlobal)];
    const texts = matches.map(m => m[1]);
    
    // Only update if the length or content has actually changed to avoid cycles
    // Simple JSON comparison is enough here
    if (JSON.stringify(texts) !== JSON.stringify(detectedTexts)) {
        setDetectedTexts(texts);
    }
  }, [editedPrompt]);

  const handleSmartTextChange = (index: number, newValue: string) => {
      // We need to replace the N-th occurrence of the pattern in the string
      let matchCount = 0;
      
      const newPrompt = editedPrompt.replace(textRegexGlobal, (match, capturedGroup) => {
          if (matchCount === index) {
              matchCount++;
              // Replace with new value
              return `Render the text: "${newValue}"`;
          }
          matchCount++;
          return match; // Keep original
      });

      setEditedPrompt(newPrompt);
      setIsEditing(true); 
  };

  return (
    <div className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 transition-all hover:shadow-md flex flex-col h-full">
      <div className="aspect-square w-full bg-gray-50 relative overflow-hidden">
        {image.isRegenerating ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                 <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                 <span className="text-xs font-bold text-blue-600">Regenerating...</span>
             </div>
        ) : (
            <img 
              src={image.url} 
              alt={image.category} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
            />
        )}

        {/* Live Text Preview Overlay (Only when editing specific text) */}
        {activeTextIndex !== null && detectedTexts[activeTextIndex] !== undefined && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="bg-black/40 backdrop-blur-sm absolute inset-0 transition-opacity duration-300"></div>
                <div className="relative text-center px-6 py-3 bg-white/90 backdrop-blur-md rounded-xl shadow-2xl border border-white/50 transform scale-110 transition-all max-w-[90%]">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Preview Text Change</p>
                    <p className="text-3xl font-bold text-slate-800 tracking-tight whitespace-pre-wrap leading-tight break-words">
                        {detectedTexts[activeTextIndex]}
                    </p>
                </div>
            </div>
        )}
        
        {/* Hover Overlay for Actions (Hidden if regenerating or editing text preview) */}
        {activeTextIndex === null && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button 
              onClick={() => onPreview(image.url)}
              className="p-3 bg-white text-slate-800 rounded-full shadow-lg hover:bg-slate-50 hover:scale-105 transition-all"
              title="Preview Full Size"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
               </svg>
            </button>
  
            <button 
              onClick={() => onDownload(image.url, image.id)}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-full font-semibold text-sm shadow-lg flex items-center gap-2 hover:bg-blue-700 hover:scale-105 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
          <span className="px-3 py-1 bg-white/95 backdrop-blur-md text-slate-800 text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm border border-slate-100/50">
            {image.category}
          </span>
        </div>
        
        {image.layoutType && (
            <div className="absolute bottom-4 left-4 pointer-events-none">
              <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded shadow-sm border border-white/20 ${getBadgeColor(image.layoutType)}`}>
                  {image.layoutType.replace('_', ' ')}
              </span>
            </div>
        )}
      </div>

      {/* Editor Section */}
      <div className="p-4 border-t border-slate-100 bg-slate-50 flex-grow flex flex-col gap-3">
        
        {/* Smart Text Editor - List all detected text fields */}
        {detectedTexts.length > 0 && (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Edit Image Text ({detectedTexts.length})
                    </label>
                    <span className="text-[9px] text-blue-400 font-medium bg-white px-1.5 py-0.5 rounded border border-blue-100">Auto-Detect</span>
                </div>
                
                <div className="max-h-32 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                    {detectedTexts.map((text, idx) => (
                        <div 
                            key={idx}
                            className={`bg-white border rounded-lg p-2 transition-all ${activeTextIndex === idx ? 'ring-2 ring-blue-100 border-blue-300' : 'border-slate-200 focus-within:border-blue-300'}`}
                        >
                            <input 
                                type="text"
                                value={text}
                                onChange={(e) => handleSmartTextChange(idx, e.target.value)}
                                onFocus={() => setActiveTextIndex(idx)}
                                onBlur={() => setActiveTextIndex(null)}
                                className="w-full text-xs font-semibold text-slate-800 bg-transparent border-none p-0 focus:ring-0 placeholder-slate-300"
                                placeholder="Enter text..."
                            />
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Collapsible/Secondary Prompt Editor */}
        <div className="flex-grow mt-2">
            <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Raw Prompt</label>
            </div>
            <textarea 
                className="w-full text-xs p-3 border border-slate-200 rounded-lg text-slate-700 bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all resize-none h-16"
                value={editedPrompt}
                onChange={(e) => {
                    setEditedPrompt(e.target.value);
                    setIsEditing(true);
                }}
                placeholder="Edit the prompt here to refine the image..."
            />
        </div>
        
        <div className="mt-auto pt-2">
             <Button 
                onClick={() => onRegenerate(image.id, editedPrompt)}
                disabled={image.isRegenerating}
                className={`w-full text-xs py-2.5 ${isEditing ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                variant={isEditing ? 'primary' : 'outline'}
             >
                {image.isRegenerating ? 'Generating...' : (isEditing ? 'Regenerate Image' : 'Regenerate')}
             </Button>
        </div>
      </div>
    </div>
  );
};

export default GeneratedAssetCard;