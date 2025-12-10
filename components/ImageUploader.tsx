import React, { useRef, useState } from 'react';

interface ImageUploaderProps {
  onImagesSelect: (base64s: string[]) => void;
  selectedImages: string[];
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesSelect, selectedImages }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFiles = (files: FileList | File[]) => {
    const newImages: string[] = [];
    const fileArray = Array.from(files);
    
    let processedCount = 0;

    fileArray.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        newImages.push(result); // Keep full data URL for preview
        processedCount++;
        
        if (processedCount === fileArray.length) {
           // Append to existing images
           onImagesSelect([...selectedImages, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeImage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = selectedImages.filter((_, i) => i !== index);
    onImagesSelect(updated);
  };

  return (
    <div className="w-full space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        accept="image/*"
        multiple
        className="hidden"
      />
      
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors min-h-[160px]
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}
        `}
      >
        <div className="p-3 bg-white rounded-full shadow-sm mb-3">
          {selectedImages.length > 0 ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <p className="text-sm font-medium text-slate-900">
            {selectedImages.length > 0 ? 'Add more products to bundle' : 'Click to upload product image(s)'}
        </p>
        <p className="text-xs text-slate-500 mt-1">or drag and drop multiple PNG, JPG files</p>
      </div>

      {/* Grid of selected images */}
      {selectedImages.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
            {selectedImages.map((img, idx) => (
                <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm">
                    <img 
                        src={img} 
                        alt={`Product ${idx + 1}`} 
                        className="w-full h-full object-contain p-2"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                            onClick={(e) => removeImage(idx, e)}
                            className="p-1.5 bg-white text-red-500 rounded-full hover:bg-red-50 shadow-sm"
                            title="Remove image"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    {/* Badge for multiple images */}
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-slate-900/10 backdrop-blur-md rounded text-[9px] font-bold text-slate-700">
                        #{idx + 1}
                    </div>
                </div>
            ))}
        </div>
      )}
      
      {selectedImages.length > 1 && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2">
              <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                  <p className="text-xs font-bold text-blue-800">Combo Mode Activated</p>
                  <p className="text-[10px] text-blue-600 leading-tight">We will generate group shots and content explaining how these products work together.</p>
              </div>
          </div>
      )}
    </div>
  );
};

export default ImageUploader;