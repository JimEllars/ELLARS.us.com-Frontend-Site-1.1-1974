import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { uploadMediaAsset } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';

const MediaUploads = () => {
  const { userToken, showToast } = useAppStore();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setUploadComplete(false);
      setErrorMsg('');
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadComplete(false);
      setErrorMsg('');
    }
  };

  const triggerUpload = async () => {
    if (!selectedFile) return;
    if (!userToken) {
       setErrorMsg('Active session required for transmission.');
       return;
    }

    setIsUploading(true);
    setErrorMsg('');

    try {
      const result = await uploadMediaAsset(selectedFile, userToken);

      if (result.success) {
        setUploadComplete(true);
        showToast('Payload securely transmitted to storage matrix.');
        setTimeout(() => {
          setSelectedFile(null);
          setUploadComplete(false);
        }, 3000);
      } else {
        setErrorMsg(result.error || 'Transmission failed.');
      }
    } catch (err) {
      setErrorMsg('Unexpected matrix interference.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="deco-frame p-8 bg-black/40 backdrop-blur-md w-full min-h-[600px] border border-white/10 rounded-sm flex flex-col">
      <div className="mb-8">
        <h2 className="font-editorial font-black text-3xl tracking-tighter text-white uppercase mb-2">
          Media <span className="text-yellow-electric">Uploads</span>
        </h2>
        <div className="h-px w-16 bg-yellow-electric/50 mb-4"></div>
        <p className="font-mono text-sm text-gray-400 uppercase tracking-widest text-xs">
          Securely transmit digital assets to the platform storage matrix.
        </p>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center relative">
         {errorMsg && (
           <div className="absolute top-0 left-0 w-full bg-red-900/20 border border-red-500/50 p-4 rounded-sm mb-6 text-center">
             <p className="text-red-400 font-mono text-xs uppercase tracking-widest">{errorMsg}</p>
           </div>
         )}

         <div
           className={`w-full max-w-xl h-64 border-2 border-dashed rounded-sm flex flex-col items-center justify-center transition-colors duration-300 relative overflow-hidden mt-12
            ${dragActive ? 'border-yellow-electric bg-yellow-electric/5' : 'border-white/20 bg-void/50'}
            ${uploadComplete ? 'border-green-500 bg-green-500/5' : ''}
           `}
           onDragEnter={handleDrag}
           onDragLeave={handleDrag}
           onDragOver={handleDrag}
           onDrop={handleDrop}
         >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleChange}
              accept="image/*,video/*,audio/*"
            />

            {isUploading ? (
              <div className="flex flex-col items-center z-10">
                <div className="w-12 h-12 mb-4 border-2 border-yellow-electric/20 border-t-yellow-electric rounded-full animate-spin"></div>
                <p className="font-mono text-xs text-yellow-electric tracking-widest uppercase animate-pulse">Transmitting Payload...</p>
              </div>
            ) : uploadComplete ? (
               <motion.div
                 initial={{ scale: 0.8, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 className="flex flex-col items-center z-10"
               >
                 <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                   <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                   </svg>
                 </div>
                 <p className="font-mono text-xs text-green-400 tracking-widest uppercase">Transmission Verified</p>
               </motion.div>
            ) : selectedFile ? (
               <div className="flex flex-col items-center z-10 p-6 text-center">
                  <svg className="w-12 h-12 text-yellow-electric mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="font-mono text-sm text-white tracking-widest uppercase mb-2 truncate max-w-[250px]">{selectedFile.name}</p>
                  <p className="font-mono text-[10px] text-gray-500 tracking-widest uppercase mb-6">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>

                  <div className="flex space-x-4">
                    <button
                      onClick={() => { setSelectedFile(null); setErrorMsg(''); }}
                      className="px-4 py-2 border border-white/20 text-gray-400 text-[10px] tracking-widest uppercase hover:text-white hover:border-white/50 transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      onClick={triggerUpload}
                      className="px-4 py-2 border border-yellow-electric/30 text-yellow-electric text-[10px] tracking-widest uppercase hover:bg-yellow-electric/10 transition-colors"
                    >
                      Execute Upload
                    </button>
                  </div>
               </div>
            ) : (
               <div className="flex flex-col items-center z-10 p-6 text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center mb-4 bg-black/20 group hover:border-yellow-electric/50 transition-colors">
                     <svg className="w-8 h-8 text-gray-400 group-hover:text-yellow-electric transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                     </svg>
                  </div>
                  <p className="font-mono text-xs text-white tracking-widest uppercase mb-2">Drag & Drop Media Matrix</p>
                  <p className="font-mono text-[10px] text-gray-500 tracking-widest uppercase">Or click to browse secure local files</p>
               </div>
            )}

            {dragActive && (
              <div className="absolute inset-0 z-0 bg-yellow-electric/5 pointer-events-none"></div>
            )}
         </div>
      </div>
    </div>
  );
};

export default MediaUploads;
