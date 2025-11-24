import React, { useState, useRef } from 'react';
import { CameraCapture } from './components/CameraCapture';
import { SplitViewer } from './components/SplitViewer';
import { translateImageContent } from './services/geminiService';
import { AppState, TranslationItem } from './types';
import { 
  CameraIcon, 
  ArrowUpTrayIcon, 
  LanguageIcon,
  PhotoIcon 
} from '@heroicons/react/24/solid';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [imageData, setImageData] = useState<string | null>(null);
  const [translations, setTranslations] = useState<TranslationItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = async (imageSrc: string) => {
    setImageData(imageSrc);
    setAppState(AppState.PROCESSING);
    setErrorMsg(null);

    try {
      const result = await translateImageContent(imageSrc);
      setTranslations(result);
      setAppState(AppState.VIEWING);
    } catch (error) {
      console.error("Translation failed", error);
      setErrorMsg("Failed to translate image. Please try again.");
      setAppState(AppState.ERROR);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        processImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const resetApp = () => {
    setAppState(AppState.IDLE);
    setImageData(null);
    setTranslations([]);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      {/* Main Layout */}
      {appState === AppState.IDLE && (
        <div className="flex flex-col h-screen max-w-md mx-auto bg-gray-900 shadow-2xl relative overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
             <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-blue-600/20 rounded-full blur-3xl"></div>
             <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-purple-600/20 rounded-full blur-3xl"></div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg mb-6">
              <LanguageIcon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2 text-center">TwinLens Translator</h1>
            <p className="text-gray-400 text-center mb-12 max-w-xs">
              Instantly translate text in photos to Traditional Chinese. View side-by-side comparisons.
            </p>

            <div className="w-full space-y-4">
              <button 
                onClick={() => setAppState(AppState.CAMERA)}
                className="w-full bg-white text-gray-900 font-bold text-lg py-4 rounded-xl shadow-lg hover:bg-gray-100 transition-transform active:scale-95 flex items-center justify-center gap-3"
              >
                <CameraIcon className="w-6 h-6 text-blue-600" />
                Take Photo
              </button>

              <button 
                onClick={triggerFileUpload}
                className="w-full bg-gray-800 border border-gray-700 text-white font-semibold text-lg py-4 rounded-xl hover:bg-gray-750 transition-transform active:scale-95 flex items-center justify-center gap-3"
              >
                <ArrowUpTrayIcon className="w-6 h-6 text-gray-400" />
                Upload Image
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          </div>

          <div className="p-6 text-center text-gray-500 text-xs relative z-10">
            Powered by Gemini 2.5 • Traditional Chinese (zh-TW)
          </div>
        </div>
      )}

      {/* Camera View */}
      {appState === AppState.CAMERA && (
        <CameraCapture 
          onCapture={processImage} 
          onCancel={() => setAppState(AppState.IDLE)} 
        />
      )}

      {/* Processing State */}
      {appState === AppState.PROCESSING && (
        <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center z-50">
          <div className="relative">
             <div className="w-24 h-24 border-4 border-gray-800 rounded-full"></div>
             <div className="w-24 h-24 border-4 border-t-blue-500 animate-spin rounded-full absolute top-0 left-0"></div>
          </div>
          <h3 className="mt-8 text-xl font-semibold text-white animate-pulse">Analyzing Text...</h3>
          <p className="mt-2 text-gray-400">Detecting & Translating to zh-TW</p>
        </div>
      )}

      {/* Error State */}
      {appState === AppState.ERROR && (
        <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-6">
          <div className="bg-gray-800 p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-gray-700">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
               <PhotoIcon className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Oops!</h3>
            <p className="text-gray-400 mb-6">{errorMsg}</p>
            <button 
              onClick={resetApp}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Main Viewer */}
      {appState === AppState.VIEWING && imageData && (
        <SplitViewer 
          imageData={imageData} 
          translations={translations} 
          onClose={resetApp} 
        />
      )}
    </div>
  );
};

export default App;
