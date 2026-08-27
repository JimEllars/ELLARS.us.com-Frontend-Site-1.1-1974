import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchUploadedMedia, deleteUploadedMedia, uploadMediaAsset } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';
import { useSearchParams } from 'react-router-dom';

const MediaUploads = () => {
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [inspectedAsset, setInspectedAsset] = useState(null);
  const showToast = useAppStore(state => state.showToast);
  const [, setSearchParams] = useSearchParams();

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file) => {
    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      showToast('// SYSTEM ERROR: FILE EXCEEDS 5MB LIMIT');
      return;
    }

    setIsUploading(true);
    const result = await uploadMediaAsset(file);
    setIsUploading(false);

    if (result.isError) {
      showToast('// SYSTEM ERROR: UPLOAD FAILED');
    } else {
      showToast('// ASSET UPLOADED SUCCESSFULLY');
      loadMedia();
    }

    // reset input
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };


  const loadMedia = async () => {
    setLoading(true);
    const result = await fetchUploadedMedia();
    if (!result.isError) {
      setMediaList(result.data || []);
    } else {
      showToast('// SYSTEM ERROR: UNABLE TO FETCH ASSETS');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMedia();
  }, []);

  const copyToClipboard = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      showToast("Asset URL copied to clipboard.");
    } catch (err) {
      showToast('// SYSTEM ERROR: FAILED TO COPY');
    }
  };


  const handleUseInDraft = (url) => {
    sessionStorage.setItem('ellars_draft_cover_image', url);
    showToast('Cover image assigned to draft');
    setSearchParams({ tab: 'tools', tool: 'publisher' });
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    const success = await deleteUploadedMedia(itemToDelete.name);
    if (success) {
      showToast('// ASSET PURGED FROM SYSTEM');
      setMediaList(prev => prev.filter(item => item.name !== itemToDelete.name));
    } else {
      showToast('// SYSTEM ERROR: FAILED TO PURGE ASSET');
    }
    setItemToDelete(null);
  };

  return (
    <div className="deco-frame p-6 mt-8">
      <h3 className="font-editorial font-black text-2xl tracking-tighter text-white uppercase mb-4">
        Asset <span className="text-yellow-electric">Gallery</span>
      </h3>
      <div className="h-px w-16 bg-yellow-electric/50 mb-6"></div>

      <div
        className={`mb-6 p-8 border border-dashed flex flex-col items-center justify-center rounded-sm transition-colors cursor-pointer ${isDragging ? 'border-yellow-electric bg-yellow-electric/10' : 'border-white/20 bg-black/20 hover:border-yellow-electric/50'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileSelect}
        />
        {isUploading ? (
            <div className="w-full flex flex-col items-center">
              <div className="w-6 h-6 border-2 border-yellow-electric/30 border-t-yellow-electric rounded-full animate-spin mb-3"></div>
              <p className="font-mono text-xs uppercase tracking-widest text-yellow-electric">Uploading Asset...</p>
              <div className="w-full h-1 bg-white/10 mt-2 rounded-full overflow-hidden">
                 <div className="h-full bg-yellow-electric w-1/2 animate-pulse"></div>
              </div>
            </div>
        ) : (
            <>
                <svg className={`w-8 h-8 mb-3 ${isDragging ? 'text-yellow-electric' : 'text-yellow-electric opacity-50'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="font-mono text-xs uppercase tracking-widest text-gray-400">
                  {isDragging ? 'Release to upload' : 'Drag & Drop Asset Here (Max 5MB)'}
                </p>
            </>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="w-6 h-6 border-2 border-yellow-electric/30 border-t-yellow-electric rounded-full animate-spin"></div>
        </div>
      ) : mediaList.length === 0 ? (
        <div className="text-center p-8 border border-white/5 bg-black/40 backdrop-blur-sm">
          <p className="font-mono text-xs uppercase tracking-widest text-gray-500">No media assets detected in current storage block.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {mediaList.map((asset, index) => (
            <motion.div
              key={asset.id || index}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="relative group border border-white/10 bg-black/60 rounded-sm overflow-hidden flex flex-col h-48 deco-brackets cursor-pointer"
              onClick={() => setInspectedAsset(asset)}

            >
              <div className="h-32 w-full overflow-hidden bg-black/40 flex items-center justify-center relative">
                {asset.url && asset.url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) ? (
                  <img src={asset.url} alt={asset.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" />
                ) : (
                  <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <span className="bg-gray-800 text-gray-400 text-[10px] px-2 py-0.5 rounded-sm font-mono tracking-widest uppercase border border-white/10">
                    {(asset.metadata?.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>

              <div className="p-3 flex-grow flex flex-col justify-between">
                <p className="text-xs text-white/80 font-mono truncate">{asset.name}</p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleUseInDraft(asset.url); }}
                    className="flex-1 py-1 px-2 border border-yellow-electric/30 text-yellow-electric text-[10px] tracking-widest uppercase hover:bg-yellow-electric/10 transition-colors text-center font-mono"
                  >
                    Use in Draft
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); copyToClipboard(asset.url); }}
                    className="flex-1 py-1 px-2 border border-yellow-electric/30 text-yellow-electric text-[10px] tracking-widest uppercase hover:bg-yellow-electric/10 transition-colors text-center font-mono"
                  >
                    Copy URL
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setItemToDelete(asset); }}
                    className="p-1 px-2 border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-center"
                    title="Delete Asset"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}


      {/* Asset Inspection Lightbox */}
      <AnimatePresence>
        {inspectedAsset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
            onClick={() => setInspectedAsset(null)}
            onKeyDown={(e) => e.key === 'Escape' && setInspectedAsset(null)}
            tabIndex={-1}
            ref={(el) => { if(el) el.focus(); }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="lightbox-dialog-title"
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="deco-frame bg-zinc-950 border border-white/20 p-6 max-w-4xl w-full flex flex-col md:flex-row gap-6 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setInspectedAsset(null)}
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex-1 bg-black/60 border border-white/10 flex items-center justify-center min-h-[300px] overflow-hidden">
                {inspectedAsset.url && inspectedAsset.url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) ? (
                  <img src={inspectedAsset.url} alt={inspectedAsset.name} className="max-w-full max-h-[60vh] object-contain" />
                ) : (
                  <div className="text-center">
                    <svg className="w-16 h-16 text-white/20 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="font-mono text-xs uppercase tracking-widest text-gray-500">Preview Not Available</p>
                  </div>
                )}
              </div>

              <div className="w-full md:w-80 flex flex-col gap-6">
                <div>
                  <h4 id="lightbox-dialog-title" className="font-editorial font-bold text-xl text-yellow-electric mb-1 truncate" title={inspectedAsset.name}>
                    Asset Details
                  </h4>
                  <div className="h-px w-12 bg-yellow-electric/30 mb-4"></div>

                  <div className="space-y-3 font-mono text-xs">
                    <div>
                      <p className="text-gray-500 uppercase tracking-widest mb-1">Filename</p>
                      <p className="text-white break-all">{inspectedAsset.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 uppercase tracking-widest mb-1">Size</p>
                      <p className="text-white">{(inspectedAsset.metadata?.size / 1024).toFixed(2)} KB</p>
                    </div>
                    <div>
                      <p className="text-gray-500 uppercase tracking-widest mb-1">MIME Type</p>
                      <p className="text-white">{inspectedAsset.metadata?.mimetype || 'Unknown'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-auto">
                   <div className="p-3 bg-black/40 border border-white/10 rounded-sm">
                      <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-1">CDN Reference URL</p>
                      <p className="text-white font-mono text-[10px] truncate">{inspectedAsset.url}</p>
                   </div>
                  <button
                    onClick={() => { copyToClipboard(inspectedAsset.url); setInspectedAsset(null); }}
                    className="w-full py-3 border border-white/20 text-white font-mono text-xs uppercase tracking-widest hover:bg-white/5 transition-colors"
                  >
                    Copy URL
                  </button>
                  <button
                    onClick={() => { handleUseInDraft(inspectedAsset.url); setInspectedAsset(null); }}
                    className="w-full py-3 border border-yellow-electric/30 text-yellow-electric font-mono text-xs uppercase tracking-widest hover:bg-yellow-electric/10 transition-colors"
                  >
                    Use in Draft
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {{/* Delete Confirmation Modal */}}
      <AnimatePresence>
        {itemToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-dialog-title"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="deco-frame bg-black/90 p-8 max-w-md w-full border border-red-500/30"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full border border-red-500/30 flex items-center justify-center bg-red-500/10">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h4 id="delete-dialog-title" className="font-editorial font-bold text-xl text-white">Confirm Purge</h4>
              </div>
              <p className="font-mono text-sm text-gray-400 mb-6">
                Are you certain you wish to execute the deletion of <span className="text-white">{itemToDelete.name}</span>? This action will permanently remove the asset from the core CDN.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 py-3 border border-white/20 text-white/70 font-mono text-xs uppercase tracking-widest hover:bg-white/5 transition-colors"
                >
                  Abort
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 border border-red-500/50 text-red-500 font-mono text-xs uppercase tracking-widest hover:bg-red-500/10 transition-colors"
                >
                  Execute Purge
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MediaUploads;
