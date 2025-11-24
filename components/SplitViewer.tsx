import React, { useRef, useState, useCallback, useEffect } from 'react';
import { TranslationItem, ViewState } from '../types';

interface SplitViewerProps {
  imageData: string;
  translations: TranslationItem[];
  onClose: () => void;
}

export const SplitViewer: React.FC<SplitViewerProps> = ({ imageData, translations, onClose }) => {
  const [viewState, setViewState] = useState<ViewState>({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [imageDims, setImageDims] = useState<{ w: number; h: number; ratio: number } | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.8);
  
  const lastPosition = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Load image dimensions to calculate perfect aspect ratio wrapper
  useEffect(() => {
    const img = new Image();
    img.src = imageData;
    img.onload = () => {
      setImageDims({
        w: img.naturalWidth,
        h: img.naturalHeight,
        ratio: img.naturalWidth / img.naturalHeight
      });
    };
  }, [imageData]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const scaleChange = -e.deltaY * 0.002;
    const newScale = Math.min(Math.max(0.5, viewState.scale + scaleChange), 8);
    
    setViewState(prev => ({
      ...prev,
      scale: newScale
    }));
  }, [viewState.scale]);

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    lastPosition.current = { x: clientX, y: clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const dx = clientX - lastPosition.current.x;
    const dy = clientY - lastPosition.current.y;

    lastPosition.current = { x: clientX, y: clientY };

    setViewState(prev => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy
    }));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetView = () => setViewState({ x: 0, y: 0, scale: 1 });

  // Helper to render the Content for a pane
  // mode: 'original' | 'translated'
  const renderImageContent = (mode: 'original' | 'translated') => {
    if (!imageDims) return null;

    // We use a wrapper that enforces the aspect ratio.
    // This ensures that coordinate systems (0-100%) match the image exactly.
    
    return (
      <div 
        className="relative flex items-center justify-center w-full h-full"
        style={{
          transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})`,
          transformOrigin: 'center',
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          cursor: isDragging ? 'grabbing' : 'grab',
          willChange: 'transform'
        }}
      >
        {/* Aspect Ratio Wrapper - Critical for alignment */}
        <div 
          style={{
            aspectRatio: `${imageDims.ratio}`,
            height: imageDims.ratio > 1 ? 'auto' : '100%',
            width: imageDims.ratio > 1 ? '100%' : 'auto',
            maxHeight: '100%',
            maxWidth: '100%',
            position: 'relative',
            boxShadow: '0 0 20px rgba(0,0,0,0.5)'
          }}
        >
          <img 
            src={imageData} 
            alt="Content" 
            className="w-full h-full block select-none pointer-events-none"
            draggable={false}
          />

          {/* Overlay Layer - Only for translated mode */}
          {mode === 'translated' && (
            <div className="absolute inset-0 z-10">
              {translations.map((item, idx) => {
                const [ymin, xmin, ymax, xmax] = item.box_2d;
                
                const top = ymin / 10;
                const left = xmin / 10;
                const width = (xmax - xmin) / 10;
                const height = (ymax - ymin) / 10;

                // Detect vertical text based on aspect ratio
                const isVertical = (ymax - ymin) > (xmax - xmin) * 1.3;
                const textLen = item.translatedText.length || 1;

                return (
                  <div
                    key={idx}
                    className="absolute flex items-center justify-center overflow-hidden backdrop-blur-[1px]"
                    style={{
                      top: `${top}%`,
                      left: `${left}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                      backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})`,
                      borderRadius: '2px',
                      containerType: 'size', // Enables cqw/cqh units
                      writingMode: isVertical ? 'vertical-rl' : 'horizontal-tb',
                      textOrientation: isVertical ? 'upright' : undefined,
                    }}
                  >
                    <span 
                      className="font-bold text-white text-center leading-none break-all"
                      style={{
                         // Dynamic Font Sizing Logic
                         // For Horizontal: fit to height (cqh) or width (cqw) depending on text length
                         // For Vertical: fit to width (cqw) or height (cqh) depending on text length
                         fontSize: isVertical 
                            ? `min(85cqw, ${95 / textLen}cqh)` 
                            : `min(85cqh, ${95 / textLen}cqw)`,
                         
                         // Adjust line height slightly based on orientation for better reading
                         lineHeight: isVertical ? '1.1' : '1',
                      }}
                    >
                      {item.translatedText}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-40 bg-gray-900 flex flex-col h-screen select-none">
      {/* Header */}
      <div className="bg-gray-800 p-4 shadow-md flex flex-wrap gap-4 justify-between items-center z-50 shrink-0">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          <span className="text-blue-400">Twin</span>Lens View
        </h2>
        
        {/* Controls */}
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-4 text-sm text-gray-400 border-r border-gray-600 pr-6">
            <span>Scroll/Pinch to Zoom</span>
            <span>Drag to Pan</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-300">
             <span>Overlay Opacity:</span>
             <input 
                type="range" 
                min="20" 
                max="100" 
                value={overlayOpacity * 100}
                onChange={(e) => setOverlayOpacity(Number(e.target.value) / 100)}
                className="w-20 accent-blue-500 cursor-pointer"
             />
             <span className="w-8 text-right">{Math.round(overlayOpacity * 100)}%</span>
          </div>

          <button 
            onClick={onClose}
            className="text-gray-300 hover:text-white px-3 py-1 border border-gray-600 rounded-md hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Dual Viewport */}
      <div 
        className="flex-1 relative flex flex-col md:flex-row overflow-hidden bg-gray-950 touch-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        ref={containerRef}
      >
        {/* Original Image Pane */}
        <div className="flex-1 relative border-b-2 md:border-b-0 md:border-r-2 border-gray-800 overflow-hidden">
          <div className="absolute top-3 left-3 z-30 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md border border-white/10 pointer-events-none">
            ORIGINAL
          </div>
          {renderImageContent('original')}
        </div>

        {/* Translated Image Pane */}
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute top-3 left-3 z-30 bg-blue-600/90 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md shadow-lg border border-blue-400/30 pointer-events-none">
            TRANSLATED (ZH-TW)
          </div>
          {renderImageContent('translated')}
        </div>
      </div>
      
      {/* Zoom Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50 bg-gray-800/90 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl border border-gray-700">
        <button 
           className="text-white text-2xl font-bold w-8 h-8 flex items-center justify-center hover:text-blue-400 active:scale-90 transition-transform"
           onClick={() => setViewState(s => ({ ...s, scale: Math.max(0.5, s.scale - 0.25) }))}
        >
          -
        </button>
        <span className="text-gray-300 w-14 text-center font-mono text-sm">
          {Math.round(viewState.scale * 100)}%
        </span>
        <button 
           className="text-white text-2xl font-bold w-8 h-8 flex items-center justify-center hover:text-blue-400 active:scale-90 transition-transform"
           onClick={() => setViewState(s => ({ ...s, scale: Math.min(8, s.scale + 0.25) }))}
        >
          +
        </button>
        <div className="w-px h-6 bg-gray-600 mx-2"></div>
        <button 
          className="text-xs text-blue-300 uppercase font-bold tracking-wider hover:text-white"
          onClick={resetView}
        >
          Reset
        </button>
      </div>
    </div>
  );
};