import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import SafeIcon from '@/common/SafeIcon';
import DOMPurify from 'dompurify';
import { v4 as uuidv4 } from 'uuid';
import { publishVaultItem, updateVaultItem } from '@/lib/api';

const DispatchPublisher = ({ editingItem, onCancel, onSuccess }) => {
  const showToast = useAppStore(state => state.showToast);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(uuidv4());

  const [formData, setFormData] = useState({
    title: '',
    category: 'Dispatch',
    readTime: '',
    excerpt: '',
    content: '',
    coverImage: ''
  });

  useEffect(() => {
    if (editingItem) {
      setFormData({
        title: editingItem.title?.rendered || '',
        category: editingItem.acf?.category_label || 'Dispatch',
        readTime: editingItem.acf?.read_time?.replace(' Min Read', '') || '',
        excerpt: editingItem.excerpt?.rendered || '',
        content: editingItem.content?.rendered || '',
        coverImage: editingItem._embedded?.['wp:featuredmedia']?.[0]?.source_url || ''
      });
      return;
    }

    // 1. Populate cover image from sessionStorage
    const savedCoverImage = sessionStorage.getItem('ellars_draft_cover_image');
    if (savedCoverImage) {
      setFormData(prev => ({ ...prev, coverImage: savedCoverImage }));
    }

    // Load draft if exists
    const savedDraft = localStorage.getItem('ellars_draft_dispatch');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        setFormData(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.warn('Failed to parse saved draft dispatch:', e);
      }
    }
  }, [editingItem]);


  useEffect(() => {
    const checkCoverImage = () => {
      const savedCoverImage = sessionStorage.getItem('ellars_draft_cover_image');
      if (savedCoverImage && savedCoverImage !== formData.coverImage) {
        setFormData(prev => ({ ...prev, coverImage: savedCoverImage }));
      }
    };

    // Check on mount and focus
    checkCoverImage();
    window.addEventListener('focus', checkCoverImage);
    return () => {
      window.removeEventListener('focus', checkCoverImage);
    };
  }, [formData.coverImage]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClearCover = () => {
    sessionStorage.removeItem('ellars_draft_cover_image');
    setFormData(prev => ({ ...prev, coverImage: '' }));
  };

  const handleSaveDraft = () => {
    localStorage.setItem('ellars_draft_dispatch', JSON.stringify(formData));
    showToast('Draft saved locally.');
  };


  const handleStageDispatch = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      showToast('Title and Content are required to stage.');
      return;
    }

    setIsSubmitting(true);

    try {
        const payload = {
            ...formData,
            content: DOMPurify.sanitize(formData.content),
            client_idempotency_key: idempotencyKey,
            status: 'draft'
        };

        let result;
        if (editingItem) {
           result = await updateVaultItem(editingItem.id, formData);
           if (!result.isError) {
              showToast('Dispatch Updated Successfully.');
              if (onSuccess) onSuccess();
           } else {
              showToast('// ERROR: UNABLE TO UPDATE DISPATCH');
           }
        } else {
           const success = await publishVaultItem(payload);
           if (success) {
               showToast('Dispatch Staged Successfully.');
               setIdempotencyKey(uuidv4()); // reset key
               setFormData({
                   title: '',
                   category: 'Dispatch',
                   readTime: '',
                   excerpt: '',
                   content: '',
                   coverImage: ''
               });
               sessionStorage.removeItem('ellars_draft_cover_image');
               localStorage.removeItem('ellars_draft_dispatch');
               if (onSuccess) onSuccess();
           } else {
                showToast('// ERROR: UNABLE TO PUBLISH DISPATCH');
           }
        }
    } finally {
        setIsSubmitting(false);
    }
  };


  return (
    <div className="deco-frame p-6 bg-black/40 backdrop-blur-md border border-white/10">
      <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
         <h2 className="text-yellow-electric font-editorial font-bold text-2xl tracking-tighter uppercase">
            {editingItem ? 'Edit Dispatch' : 'Intelligence Dispatch Publisher'}
         </h2>
         <SafeIcon name={editingItem ? "Edit" : "FileText"} className="w-6 h-6 text-yellow-electric" />
      </div>
      {editingItem && (
        <div className="mb-6 p-4 bg-yellow-electric/10 border border-yellow-electric/30 rounded-sm flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-widest text-yellow-electric">Currently Editing Existing Record</span>
        </div>
      )}

      <form onSubmit={handleStageDispatch} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-editorial uppercase tracking-widest text-gray-400">Title</label>
            <input disabled={isSubmitting}
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter dispatch title"
              className="w-full bg-void border border-white/10 rounded-sm px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-electric/50 font-editorial deco-brackets"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-editorial uppercase tracking-widest text-gray-400">Category</label>
            <select disabled={isSubmitting}
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full bg-void border border-white/10 rounded-sm px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-electric/50 font-editorial deco-brackets"
            >
              <option value="Dispatch">Dispatch</option>
              <option value="Business Briefing">Business Briefing</option>
              <option value="Directive">Directive</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-2">
              <label className="block text-xs font-editorial uppercase tracking-widest text-gray-400">Read Time (Mins)</label>
              <input disabled={isSubmitting}
                type="number"
                name="readTime"
                value={formData.readTime}
                onChange={handleChange}
                placeholder="e.g. 5"
                className="w-full bg-void border border-white/10 rounded-sm px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-electric/50 font-editorial deco-brackets"
              />
            </div>
             <div className="space-y-2">
              <label className="block text-xs font-editorial uppercase tracking-widest text-gray-400">Excerpt</label>
              <input disabled={isSubmitting}
                type="text"
                name="excerpt"
                value={formData.excerpt}
                onChange={handleChange}
                placeholder="Brief summary..."
                className="w-full bg-void border border-white/10 rounded-sm px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-electric/50 font-editorial deco-brackets"
              />
            </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-editorial uppercase tracking-widest text-gray-400">Cover Image URL</label>
          <div className="flex space-x-2">
            <input disabled={isSubmitting}
              type="text"
              name="coverImage"
              value={formData.coverImage}
              onChange={handleChange}
              placeholder="https://..."
              className="flex-grow bg-void border border-white/10 rounded-sm px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-electric/50 font-editorial deco-brackets"
            />
            {formData.coverImage && (
              <button type="button" onClick={handleClearCover} className="px-4 py-2 bg-red-900/20 text-red-500 border border-red-500/30 rounded-sm hover:bg-red-900/40 transition-colors uppercase text-xs tracking-widest font-mono">
                Clear
              </button>
            )}
          </div>
          {formData.coverImage && (
             <div className="mt-4 border border-white/10 p-2 bg-black/50 rounded-sm inline-block">
                <img src={formData.coverImage} alt="Cover Preview" className="h-32 object-cover rounded-sm border border-white/5" />
             </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-editorial uppercase tracking-widest text-gray-400">Content (HTML/Text)</label>
          <textarea disabled={isSubmitting}
            name="content"
            value={formData.content}
            onChange={handleChange}
            placeholder="Draft content here..."
            rows={8}
            className="w-full bg-void border border-white/10 rounded-sm px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-electric/50 font-mono deco-brackets custom-scrollbar"
          ></textarea>
        </div>

        <div className="flex items-center space-x-4 pt-4 border-t border-white/10">
           {!editingItem && (
             <button
              type="button"
              onClick={handleSaveDraft}
              className="px-6 py-2 bg-white/5 text-gray-300 border border-white/20 rounded-sm hover:bg-white/10 transition-colors uppercase text-xs tracking-widest font-editorial"
             >
                Save Draft Locally
             </button>
           )}
           {editingItem && onCancel && (
             <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 bg-white/5 text-gray-300 border border-white/20 rounded-sm hover:bg-white/10 transition-colors uppercase text-xs tracking-widest font-editorial"
             >
                Cancel Edit
             </button>
           )}
           <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-yellow-electric/10 text-yellow-electric border border-yellow-electric/30 rounded-sm hover:bg-yellow-electric/20 transition-colors uppercase text-xs tracking-widest font-editorial font-bold flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
           >
              <span>{editingItem ? 'Save Changes' : 'Stage Dispatch'}</span>
              <SafeIcon name="Send" className="w-4 h-4" />
           </button>
        </div>

      </form>
    </div>
  );
};

export default DispatchPublisher;
