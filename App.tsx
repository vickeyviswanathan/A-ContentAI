import React, { useState } from 'react';
import ImageUploader from './components/ImageUploader';
import Button from './components/Button';
import GeneratedAssetCard from './components/GeneratedAssetCard';
import ImagePreviewModal from './components/ImagePreviewModal';
import { analyzeAndPlanAssets, generateMarketingAsset, researchCategoryTrends } from './services/geminiService';
import { GeneratedImage, GenerationStatus, PromptItem, BrandVibe } from './types';

const App: React.FC = () => {
  // Now managing an array of images
  const [productImages, setProductImages] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [brandVibe, setBrandVibe] = useState<BrandVibe>('Clean & Clinical');
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 7 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [marketInsights, setMarketInsights] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
    setGeneratedImages([]);
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
      
      const prompts: PromptItem[] = await analyzeAndPlanAssets(base64Images, category, trends, additionalContext, brandVibe);

      // 3. Generate
      setStatus(GenerationStatus.GENERATING);
      const newImages: GeneratedImage[] = [];

      for (let i = 0; i < prompts.length; i++) {
        setProgress({ current: i + 1, total: prompts.length });
        try {
          const item = prompts[i];
          // Pass ALL source images to the generator
          const imageBase64 = await generateMarketingAsset(base64Images, item.visualPrompt);
          const newImage: GeneratedImage = {
            id: `img-${Date.now()}-${i}`,
            url: `data:image/png;base64,${imageBase64}`,
            prompt: item.visualPrompt,
            category: item.category,
            layoutType: item.layoutType
          };
          newImages.push(newImage);
          setGeneratedImages(prev => [...prev, newImage]);
        } catch (err) {
          console.error(`Failed to generate image ${i + 1}`, err);
        }
      }
      setStatus(GenerationStatus.COMPLETE);
    } catch (err) {
      console.error(err);
      setStatus(GenerationStatus.ERROR);
      setErrorMsg("Error generating content. Please try again.");
    }
  };

  const handleRegenerate = async (id: string, newPrompt: string) => {
    if (productImages.length === 0) return;
    const base64Images = productImages.map(img => img.split(',')[1]);

    // Mark specific image as regenerating
    setGeneratedImages(prev => prev.map(img => 
        img.id === id ? { ...img, isRegenerating: true, prompt: newPrompt } : img
    ));

    try {
        const newImageBase64 = await generateMarketingAsset(base64Images, newPrompt);
        
        setGeneratedImages(prev => prev.map(img => 
            img.id === id ? { 
                ...img, 
                url: `data:image/png;base64,${newImageBase64}`,
                isRegenerating: false 
            } : img
        ));
    } catch (err) {
        console.error("Regeneration failed", err);
        setErrorMsg("Failed to regenerate image.");
        setGeneratedImages(prev => prev.map(img => 
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
      default: return 'bg-slate-100 text-slate-700';
    }
  };

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
          <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Market Research Active
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
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
                    <p className="text-xs text-slate-500 mt-1">We will use this to research your competitors' A+ content strategies.</p>
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
                    placeholder="Specific ingredients or slogans you want to ensure are included..."
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
                             <p className="text-xs text-blue-600">
                                 {status === GenerationStatus.RESEARCHING 
                                    ? `Searching Google for top performing "${category}" content...` 
                                    : "Parsing ingredients and planning infographics..."}
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
                 <p className="text-xs text-slate-400 mt-2 text-center">
                   Generating image {progress.current} of {progress.total}
                 </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Generated A+ Content</h2>
            </div>
            
            {marketInsights && (
                <div className="mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-100">
                    <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-1 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
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
                
                {status === GenerationStatus.GENERATING && Array.from({ length: Math.max(0, 7 - generatedImages.length) }).map((_, idx) => (
                  <div key={`placeholder-${idx}`} className="bg-white rounded-2xl border border-slate-200 aspect-square flex flex-col items-center justify-center animate-pulse">
                    <div className="w-12 h-12 bg-slate-200 rounded-full mb-3"></div>
                    <div className="h-2 w-24 bg-slate-200 rounded"></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Full Screen Preview Modal */}
      <ImagePreviewModal 
        imageUrl={previewImage} 
        onClose={() => setPreviewImage(null)} 
      />
    </div>
  );
};

export default App;