
import React, { useState, useEffect } from 'react';
import ImageUploader from './components/ImageUploader';
import Button from './components/Button';
import GeneratedAssetCard from './components/GeneratedAssetCard';
import ImagePreviewModal from './components/ImagePreviewModal';
import StudioControls from './components/StudioControls';
import BrandGuidelinesModal from './components/BrandGuidelinesModal';
import { analyzeAndPlanAssets, generateMarketingAsset, researchCategoryTrends, generateStudioShot } from './services/geminiService';
import { GeneratedImage, GenerationStatus, PromptItem, BrandVibe, StudioConfig, StudioShotType, SCIENTIFIC_TRUST_OPTIONS } from './types';

const App: React.FC = () => {
  // Tabs
  const [activeTab, setActiveTab] = useState<'EXPRESS' | 'STUDIO' | 'HISTORY'>('EXPRESS');

  // Common State
  const [productImages, setProductImages] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Brand Guidelines State
  const [brandGuidelines, setBrandGuidelines] = useState<string>('');
  const [showBrandModal, setShowBrandModal] = useState(false);

  // Load guidelines and history from localStorage on mount
  useEffect(() => {
    const savedGuidelines = localStorage.getItem('A_PLUS_BRAND_GUIDELINES');
    if (savedGuidelines) setBrandGuidelines(savedGuidelines);

    try {
        const savedHistory = localStorage.getItem('A_PLUS_HISTORY');
        if (savedHistory) {
            setHistory(JSON.parse(savedHistory));
        }
    } catch (e) {
        console.warn("Failed to load history", e);
    }
  }, []);

  // Save history to local storage whenever it changes
  useEffect(() => {
      try {
        localStorage.setItem('A_PLUS_HISTORY', JSON.stringify(history));
      } catch (e) {
          console.warn("Failed to save history - likely quota exceeded", e);
          // If quota exceeded, maybe trim history?
          if (history.length > 20) {
              const trimmed = history.slice(0, 20);
              setHistory(trimmed); // Triggers re-render and re-save attempt
          }
      }
  }, [history]);

  const handleSaveGuidelines = (text: string) => {
    setBrandGuidelines(text);
    localStorage.setItem('A_PLUS_BRAND_GUIDELINES', text);
  };

  const addToHistory = (image: GeneratedImage) => {
      setHistory(prev => {
          // Add to top, keep max 20 items to avoid LocalStorage quota issues
          const updated = [image, ...prev];
          return updated.slice(0, 20);
      });
  };

  const clearHistory = () => {
      if (confirm("Are you sure you want to clear your generation history? This cannot be undone.")) {
        setHistory([]);
        localStorage.removeItem('A_PLUS_HISTORY');
      }
  };

  // Express Mode State
  const [category, setCategory] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [brandVibe, setBrandVibe] = useState<BrandVibe>('Clean & Clinical');
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [progress, setProgress] = useState({ current: 0, total: 7 });
  const [marketInsights, setMarketInsights] = useState<string>('');

  // Studio Mode State
  const [studioConfig, setStudioConfig] = useState<StudioConfig>({
      theme: 'Minimalist',
      lighting: 'Soft Daylight',
      composition: 'Centered',
      elements: [],
      background: 'Solid Color',
      matchBrandVibe: false
  });
  
  // Specific Text Inputs for Studio Shots
  const [studioTexts, setStudioTexts] = useState<Record<StudioShotType, string>>({
      HERO: '',
      TEXTURE: '',
      INGREDIENTS: 'AHA, BHA, PHA',
      HOW_TO: 'Apply 2 Pumps',
      SIZE: '150ml',
      RANGE: '',
      BEFORE_AFTER: '',
      SCIENTIFIC: 'CLINICALLY TESTED'
  });

  const [generatingShot, setGeneratingShot] = useState<string | null>(null);

  const handleGenerate = async () => {
    try {
      // @ts-ignore
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          // @ts-ignore
          await window.aistudio.openSelectKey();
        }
      }
    } catch (e) {
      console.warn("API Key check failed", e);
    }

    if (productImages.length === 0 || !category.trim()) return;

    setStatus(GenerationStatus.RESEARCHING);
    setErrorMsg(null);
    setGeneratedImages([]); // Clear previous express images
    setMarketInsights('');
    setProgress({ current: 0, total: 7 });

    try {
      // 1. Research Market Trends (Live Google Search)
      const trends = await researchCategoryTrends(category);
      setMarketInsights(trends);

      // 2. Analyze & Plan
      setStatus(GenerationStatus.ANALYZING);
      
      // Extract base64 strings (remove data:image/png;base64 prefix)
      const base64Images = productImages.map(img => img.split(',')[1]);
      
      const prompts: PromptItem[] = await analyzeAndPlanAssets(
          base64Images, 
          category, 
          trends, 
          additionalContext, 
          brandVibe,
          brandGuidelines // Pass guidelines
      );

      // 3. Generate
      setStatus(GenerationStatus.GENERATING);
      
      let successCount = 0;
      for (let i = 0; i < prompts.length; i++) {
        setProgress({ current: i + 1, total: prompts.length });
        
        // Add a small delay to prevent rate limits
        if (i > 0) await new Promise(resolve => setTimeout(resolve, 1500));

        try {
          const item = prompts[i];
          // Pass ALL source images to the generator
          const imageBase64 = await generateMarketingAsset(base64Images, item.visualPrompt);
          const newImage: GeneratedImage = {
            id: `img-${Date.now()}-${i}`,
            url: `data:image/png;base64,${imageBase64}`,
            prompt: item.visualPrompt,
            category: item.category,
            layoutType: item.layoutType,
            timestamp: Date.now()
          };
          
          setGeneratedImages(prev => [...prev, newImage]);
          addToHistory(newImage); // Save to history
          successCount++;
        } catch (err) {
          console.error(`Failed to generate image ${i + 1}`, err);
        }
      }
      
      if (successCount === 0) {
          throw new Error("All image generations failed. Your API key may have insufficient quota for image generation.");
      }

      setStatus(GenerationStatus.COMPLETE);
    } catch (err) {
      console.error(err);
      setStatus(GenerationStatus.ERROR);
      // @ts-ignore
      setErrorMsg(err.message || "Error generating content. Please try again.");
    }
  };

  const handleStudioGenerate = async (shotType: StudioShotType) => {
    if (productImages.length === 0) {
        setErrorMsg("Please upload a product image first.");
        return;
    }

    setGeneratingShot(shotType);
    setErrorMsg(null);

    try {
        const base64Images = productImages.map(img => img.split(',')[1]);
        const customText = studioTexts[shotType] || "";

        // Generate
        const imageBase64 = await generateStudioShot(
            base64Images, 
            studioConfig, 
            shotType, 
            customText,
            brandGuidelines // Pass guidelines
        );
        
        const newImage: GeneratedImage = {
            id: `studio-${shotType}-${Date.now()}`,
            url: `data:image/png;base64,${imageBase64}`,
            prompt: `Studio Shot: ${shotType} | Theme: ${studioConfig.theme}`,
            category: shotType.replace('_', ' '),
            layoutType: 'STUDIO_CUSTOM',
            timestamp: Date.now()
        };

        setGeneratedImages(prev => [newImage, ...prev]);
        addToHistory(newImage); // Save to history

    } catch (err: any) {
        console.error(err);
        setErrorMsg(`Failed to generate ${shotType}: ${err.message}`);
    } finally {
        setGeneratingShot(null);
    }
  };

  const handleRegenerate = async (id: string, newPrompt: string) => {
    if (productImages.length === 0) {
        setErrorMsg("Cannot regenerate without source product images. Please upload them again.");
        return;
    }
    const base64Images = productImages.map(img => img.split(',')[1]);

    // Update in generatedImages view
    setGeneratedImages(prev => prev.map(img => 
        img.id === id ? { ...img, isRegenerating: true, prompt: newPrompt } : img
    ));
    
    // Update in history view
    setHistory(prev => prev.map(img =>
        img.id === id ? { ...img, isRegenerating: true, prompt: newPrompt } : img
    ));

    try {
        const newImageBase64 = await generateMarketingAsset(base64Images, newPrompt);
        
        const updateImage = (img: GeneratedImage) => ({
             ...img,
             url: `data:image/png;base64,${newImageBase64}`,
             isRegenerating: false,
             timestamp: Date.now() // Update timestamp to move to top if sorting
        });

        setGeneratedImages(prev => prev.map(img => img.id === id ? updateImage(img) : img));
        setHistory(prev => prev.map(img => img.id === id ? updateImage(img) : img));
        
    } catch (err) {
        console.error("Regeneration failed", err);
        setErrorMsg("Failed to regenerate image.");
        
        // Reset loading state
        setGeneratedImages(prev => prev.map(img => 
            img.id === id ? { ...img, isRegenerating: false } : img
        ));
        setHistory(prev => prev.map(img =>
            img.id === id ? { ...img, isRegenerating: false } : img
        ));
    }
  };

  const handleDownload = (imageUrl: string, id: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `aplus-content-${id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const vibes: { id: BrandVibe; label: string; desc: string }[] = [
    { id: 'Clean & Clinical', label: 'Clean & Clinical', desc: 'Dermatological, white space.' },
    { id: 'Natural & Organic', label: 'Natural & Organic', desc: 'Botanicals, soft light.' },
    { id: 'Luxury & Minimal', label: 'Luxury & Minimal', desc: 'High end, moody.' },
    { id: 'Bold & High Contrast', label: 'Bold & Pop', desc: 'Gen-Z, vibrant colors.' },
  ];

  const getBadgeColor = (type?: string) => {
    switch(type) {
      case 'SPLASH': return 'bg-blue-100 text-blue-700';
      case 'FLATLAY': return 'bg-green-100 text-green-700';
      case 'INFOGRAPHIC': return 'bg-purple-100 text-purple-700';
      case 'BENEFIT_MAP': return 'bg-indigo-100 text-indigo-700';
      case 'INGREDIENT_LIST': return 'bg-teal-100 text-teal-700';
      case 'NEGATIVE_SPACE': return 'bg-gray-100 text-gray-700';
      case 'STUDIO_CUSTOM': return 'bg-pink-100 text-pink-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const STUDIO_SHOTS_LIST: { type: StudioShotType; label: string; desc: string; inputLabel?: string }[] = [
      { type: 'HERO', label: '1. Market Hero Image', desc: 'High-impact main listing image.' },
      { type: 'TEXTURE', label: '2. Formula & Texture', desc: 'Macro shot of product consistency.' },
      { type: 'INGREDIENTS', label: '3. Hero Ingredients', desc: 'Product with key floating ingredients.', inputLabel: 'Key Ingredients (e.g. AHA, Vit C)' },
      { type: 'HOW_TO', label: '4. How to Use', desc: 'Instructional action shot.', inputLabel: 'Instruction Text' },
      { type: 'SIZE', label: '5. Product Size', desc: 'Size variant comparison.', inputLabel: 'Size Label (e.g. 150ml)' },
      { type: 'RANGE', label: '6. Whole Product Range', desc: 'Group shot of all items (Bundle).' },
      { type: 'BEFORE_AFTER', label: '7. Before - After', desc: 'Visual transformation result.' },
      { type: 'SCIENTIFIC', label: '8. Scientific Trust', desc: 'Lab/Medical credibility shot.', inputLabel: 'Claim (e.g. Clinically Proven)' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
              A+
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">
              A+ContentAI
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Brand Guidelines Button */}
             <button
                onClick={() => setShowBrandModal(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    brandGuidelines 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100' 
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
             >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {brandGuidelines ? 'Guidelines Active' : 'Brand Guidelines'}
             </button>

             {/* Tab Navigation */}
             <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTab('EXPRESS')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'EXPRESS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Express Generator
                </button>
                <button 
                    onClick={() => setActiveTab('STUDIO')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'STUDIO' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    A+ Studio
                </button>
                <button 
                    onClick={() => setActiveTab('HISTORY')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'HISTORY' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    History
                </button>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Error Message Global */}
        {errorMsg && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm flex items-center justify-between">
                <span>{errorMsg}</span>
                <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-700">✕</button>
            </div>
        )}

        {/* EXPRESS MODE */}
        {activeTab === 'EXPRESS' && (
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Express Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">1</span>
                        Product Source
                    </h2>
                    <ImageUploader 
                        onImagesSelect={setProductImages} 
                        selectedImages={productImages} 
                    />
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">2</span>
                        Strategy Settings
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Product Category (Required)</label>
                            <input 
                                type="text" 
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                placeholder="e.g. Vitamin C Serum, Dog Treats, Running Shoes"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>

                        <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Brand Vibe</label>
                        <div className="grid grid-cols-2 gap-2">
                            {vibes.map((v) => (
                            <button
                                key={v.id}
                                onClick={() => setBrandVibe(v.id)}
                                className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                                brandVibe === v.id 
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500' 
                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600'
                                }`}
                            >
                                <div className="font-medium">{v.label}</div>
                            </button>
                            ))}
                        </div>
                        </div>

                        <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Extra Details (Optional)</label>
                        <textarea
                            rows={3}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder="Specific ingredients or slogans..."
                            value={additionalContext}
                            onChange={(e) => setAdditionalContext(e.target.value)}
                        />
                        </div>
                    </div>
                    </div>

                    <Button 
                    onClick={handleGenerate}
                    disabled={productImages.length === 0 || !category || (status !== GenerationStatus.IDLE && status !== GenerationStatus.COMPLETE && status !== GenerationStatus.ERROR)}
                    className="w-full py-4 text-lg shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 border-none"
                    variant="primary"
                    >
                    {status === GenerationStatus.IDLE || status === GenerationStatus.COMPLETE || status === GenerationStatus.ERROR ? 'Research & Generate' : 'Working...'}
                    </Button>
                    
                    {(status === GenerationStatus.RESEARCHING || status === GenerationStatus.ANALYZING) && (
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm animate-pulse">
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <div>
                                    <p className="text-sm font-bold text-blue-800">
                                        {status === GenerationStatus.RESEARCHING ? "Scanning Market Trends..." : "Designing Asset Strategy..."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {status === GenerationStatus.GENERATING && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        <span>Rendering Assets...</span>
                        <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out" 
                            style={{ width: `${(progress.current / progress.total) * 100}%`}}
                        ></div>
                        </div>
                    </div>
                    )}
                </div>

                {/* Express Gallery */}
                <div className="lg:col-span-8">
                    <div className="flex items-center justify-between mb-6">
                         <h2 className="text-2xl font-bold text-slate-800">Generated A+ Content</h2>
                    </div>
                    
                    {marketInsights && (
                        <div className="mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-100">
                            <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-1 flex items-center gap-2">
                                Market Strategy Insight
                            </h3>
                            <p className="text-sm text-indigo-800 leading-relaxed">{marketInsights}</p>
                        </div>
                    )}

                    {generatedImages.length === 0 && status !== GenerationStatus.GENERATING ? (
                    <div className="h-[500px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                        <p className="font-medium text-slate-500">Upload product(s) & set category to start.</p>
                    </div>
                    ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                        {generatedImages.map((img) => (
                        <GeneratedAssetCard 
                            key={img.id}
                            image={img}
                            onDownload={handleDownload}
                            onRegenerate={handleRegenerate}
                            onPreview={setPreviewImage}
                            getBadgeColor={getBadgeColor}
                        />
                        ))}
                    </div>
                    )}
                </div>
             </div>
        )}

        {/* STUDIO MODE */}
        {activeTab === 'STUDIO' && (
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                 {/* Left Panel: The Creative Director */}
                 <div className="lg:col-span-4 space-y-6">
                     <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                         <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                             Product Source
                         </h2>
                         <ImageUploader 
                             onImagesSelect={setProductImages} 
                             selectedImages={productImages} 
                         />
                     </div>
                     
                     <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                         <h2 className="text-sm font-bold uppercase tracking-wider text-purple-600 mb-4 flex items-center gap-2">
                             Studio Controls
                         </h2>
                         <StudioControls 
                            config={studioConfig}
                            onChange={setStudioConfig}
                         />
                     </div>
                 </div>

                 {/* Right Panel: The Custom Shot List */}
                 <div className="lg:col-span-8">
                     <div className="flex items-center justify-between mb-6">
                         <h2 className="text-2xl font-bold text-slate-800">A+ Shot List</h2>
                         <p className="text-sm text-slate-500">Generate specific high-conversion modules.</p>
                     </div>

                     <div className="grid grid-cols-1 gap-6">
                         {STUDIO_SHOTS_LIST.map((shot) => {
                             // Find if this shot has been generated in current session
                             const generated = generatedImages.find(img => img.category === shot.type.replace('_', ' '));
                             const isLoading = generatingShot === shot.type;

                             return (
                                 <div key={shot.type} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row">
                                     {/* Controls Side */}
                                     <div className="p-6 flex-1 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100">
                                         <div>
                                             <div className="flex items-center gap-2 mb-1">
                                                 <h3 className="font-bold text-slate-800">{shot.label}</h3>
                                                 <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">{shot.type}</span>
                                             </div>
                                             <p className="text-xs text-slate-500 mb-4">{shot.desc}</p>
                                             
                                             {/* Specific Inputs */}
                                             {shot.inputLabel && (
                                                 <div className="mb-4">
                                                     <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">{shot.inputLabel}</label>
                                                     {shot.type === 'SCIENTIFIC' ? (
                                                         <select 
                                                            className="w-full text-sm border-slate-200 rounded-lg"
                                                            value={studioTexts[shot.type]}
                                                            onChange={(e) => setStudioTexts(prev => ({...prev, [shot.type]: e.target.value}))}
                                                         >
                                                             {SCIENTIFIC_TRUST_OPTIONS.map(opt => (
                                                                 <option key={opt.id} value={opt.label}>{opt.label}</option>
                                                             ))}
                                                         </select>
                                                     ) : (
                                                         <input 
                                                            type="text"
                                                            className="w-full text-sm border-slate-200 rounded-lg px-3 py-2"
                                                            placeholder={`Enter ${shot.inputLabel}...`}
                                                            value={studioTexts[shot.type] || ''}
                                                            onChange={(e) => setStudioTexts(prev => ({...prev, [shot.type]: e.target.value}))}
                                                         />
                                                     )}
                                                 </div>
                                             )}
                                         </div>
                                         
                                         <Button 
                                            variant="secondary" 
                                            onClick={() => handleStudioGenerate(shot.type)}
                                            isLoading={isLoading}
                                            disabled={!!generatingShot || productImages.length === 0}
                                            className="w-full bg-slate-900 text-white hover:bg-slate-800"
                                         >
                                             {generated ? 'Regenerate Shot' : 'Generate Shot'}
                                         </Button>
                                     </div>

                                     {/* Result Side */}
                                     <div className="w-full md:w-80 h-80 bg-slate-50 flex-shrink-0 relative">
                                         {generated ? (
                                             <GeneratedAssetCard 
                                                image={generated}
                                                onDownload={handleDownload}
                                                onRegenerate={handleRegenerate}
                                                onPreview={setPreviewImage}
                                                getBadgeColor={getBadgeColor}
                                             />
                                         ) : (
                                             <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 p-8 text-center">
                                                 {isLoading ? (
                                                     <div className="w-10 h-10 border-4 border-slate-200 border-t-purple-600 rounded-full animate-spin"></div>
                                                 ) : (
                                                     <>
                                                        <svg className="w-12 h-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                        <span className="text-xs font-medium">Ready to Generate</span>
                                                     </>
                                                 )}
                                             </div>
                                         )}
                                     </div>
                                 </div>
                             );
                         })}
                     </div>
                 </div>
             </div>
        )}

        {/* HISTORY MODE */}
        {activeTab === 'HISTORY' && (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Generation History</h2>
                        <p className="text-sm text-slate-500">View and manage your past created assets (Stored locally).</p>
                    </div>
                    <Button variant="outline" onClick={clearHistory} disabled={history.length === 0}>
                        Clear History
                    </Button>
                </div>

                {history.length === 0 ? (
                    <div className="h-[400px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                        <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="font-medium text-slate-500">No history yet. Generate some assets!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {history.map((img) => (
                            <GeneratedAssetCard 
                                key={img.id}
                                image={img}
                                onDownload={handleDownload}
                                onRegenerate={handleRegenerate}
                                onPreview={setPreviewImage}
                                getBadgeColor={getBadgeColor}
                            />
                        ))}
                    </div>
                )}
            </div>
        )}

      </main>
      
      {/* Full Screen Preview Modal */}
      <ImagePreviewModal 
        imageUrl={previewImage} 
        onClose={() => setPreviewImage(null)} 
      />

      {/* Brand Guidelines Modal */}
      <BrandGuidelinesModal 
        isOpen={showBrandModal} 
        onClose={() => setShowBrandModal(false)}
        currentGuidelines={brandGuidelines}
        onSave={handleSaveGuidelines}
      />
    </div>
  );
};

export default App;
