
import React, { useState, useEffect, useRef } from 'react';
import Button from './Button';

interface BrandGuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGuidelines: string;
  onSave: (guidelines: string) => void;
}

const BrandGuidelinesModal: React.FC<BrandGuidelinesModalProps> = ({ 
  isOpen, 
  onClose, 
  currentGuidelines, 
  onSave 
}) => {
  const [text, setText] = useState(currentGuidelines);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens or prop changes
  useEffect(() => {
    setText(currentGuidelines);
  }, [currentGuidelines, isOpen]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      // Append or replace? Let's append for safety, user can edit.
      setText(prev => prev ? `${prev}\n\n${content}` : content);
    };
    reader.readAsText(file);
  };

  const handleSave = () => {
    onSave(text);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Brand Guidelines</h2>
            <p className="text-sm text-slate-500">Define strict rules for the AI to follow (Colors, Tone, Do's & Don'ts).</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-grow overflow-y-auto">
          
          <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
             <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
             <div className="text-sm text-blue-800">
                <p className="font-bold mb-1">How this works:</p>
                <p>These guidelines will override default AI behaviors. Use this for:</p>
                <ul className="list-disc pl-4 mt-1 space-y-1 opacity-80">
                    <li><strong>Hex Codes:</strong> "Use brand color #FF5733 for backgrounds."</li>
                    <li><strong>Forbidden Words:</strong> "Never use the word 'Cheap'."</li>
                    <li><strong>Tone of Voice:</strong> "Always sound clinical and professional."</li>
                </ul>
             </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700">Guidelines Text</label>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Upload .txt / .md
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".txt,.md" 
                    onChange={handleFileUpload}
                />
            </div>
            <textarea
              className="w-full h-64 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono leading-relaxed"
              placeholder="e.g. 
- Primary Brand Color: #0047AB
- Typography: Clean Sans-Serif
- Do NOT show human faces in the hero shot.
- Always mention 'Sulfate-Free' in infographics."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save Guidelines</Button>
        </div>
      </div>
    </div>
  );
};

export default BrandGuidelinesModal;
