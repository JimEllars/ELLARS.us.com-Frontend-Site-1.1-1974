import React, { useState, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { createIntelBrief } from '@/lib/api';

const IntelManager = () => {
  const userToken = useAppStore((state) => state.userToken);
  const showToast = useAppStore((state) => state.showToast);

  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [tags, setTags] = useState('');
  const [body, setBody] = useState('');

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const successRef = useRef(null);

  const validateForm = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = 'Brief Title is required.';
    if (!body.trim()) newErrors.body = 'Intelligence Body Payload is required.';

    // Explicitly enforce comma-separated format for tags
    if (tags.trim() && !/^[a-zA-Z0-9s-]+(,[a-zA-Z0-9s-]+)*$/.test(tags)) {
      newErrors.tags = 'Tags must be strictly comma-separated.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        app_id: 'ellars.us.com',
        type: 'intel_brief',
        title: title.trim(),
        excerpt: excerpt.trim(),
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        content: body.trim(),
        created_at: new Date().toISOString()
      };

      const success = await createIntelBrief(payload, userToken);

      if (success) {
        showToast('Intelligence brief securely compiled and vaulted.');
        setTitle('');
        setExcerpt('');
        setTags('');
        setBody('');
        setErrors({});
        setTimeout(() => successRef.current?.focus(), 100);
      } else {
        setErrors({ submit: 'Transmission rejected. Core server may be offline.' });
      }
    } catch (err) {
      setErrors({ submit: 'Transmission rejected. Core server may be offline.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="deco-frame p-8 bg-black/40 backdrop-blur-md w-full min-h-[600px] border border-white/10 rounded-sm">
      <div className="mb-8" ref={successRef} tabIndex="-1" aria-live="polite">
        <h2 className="font-editorial font-black text-3xl tracking-tighter text-white uppercase mb-2">
          Intelligence <span className="text-yellow-electric">Manager</span>
        </h2>
        <div className="h-px w-16 bg-yellow-electric/50 mb-4"></div>
        <p className="font-mono text-sm text-gray-400 uppercase tracking-widest text-xs">
          Draft and compile secure operational intelligence briefs.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {errors.submit && (
          <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-sm mb-6">
             <p className="text-red-400 font-mono text-xs uppercase tracking-widest">{errors.submit}</p>
          </div>
        )}

        <div>
          <label htmlFor="intel-title" className="block font-mono text-xs text-yellow-electric uppercase tracking-widest mb-2">
            Brief Title
          </label>
          <input
            type="text"
            id="intel-title"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? "intel-title-error" : undefined}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSubmitting}
            className={`w-full bg-white/5 border text-white font-mono text-sm p-4 focus:outline-none transition-colors placeholder-gray-600 rounded-sm ${errors.title ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-yellow-electric/50'}`}
            placeholder="ENTER PRIMARY DIRECTIVE OR TOPIC"
          />
          {errors.title && <p id="intel-title-error" className="text-red-400 font-mono text-[10px] mt-2 uppercase tracking-widest">{errors.title}</p>}
        </div>

        <div>
          <label htmlFor="intel-excerpt" className="block font-mono text-xs text-yellow-electric uppercase tracking-widest mb-2">
            Executive Summary / Excerpt
          </label>
          <textarea
            id="intel-excerpt"
            rows={3}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            disabled={isSubmitting}
            className="w-full bg-white/5 border border-white/10 text-white font-mono text-sm p-4 focus:outline-none focus:border-yellow-electric/50 transition-colors placeholder-gray-600 rounded-sm resize-none"
            placeholder="SUMMARIZE THE OPERATIONAL IMPACT"
          ></textarea>
        </div>

        <div>
          <label htmlFor="intel-tags" className="block font-mono text-xs text-yellow-electric uppercase tracking-widest mb-2">
            Operational Tags
          </label>
          <input
            type="text"
            id="intel-tags"
            aria-invalid={!!errors.tags}
            aria-describedby={errors.tags ? "intel-tags-error" : undefined}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            disabled={isSubmitting}
            className={`w-full bg-white/5 border text-white font-mono text-sm p-4 focus:outline-none transition-colors placeholder-gray-600 rounded-sm ${errors.tags ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-yellow-electric/50'}`}
            placeholder="COMMA-SEPARATED (E.G. LOGISTICS, POLICY, SYSTEMS)"
          />
          {errors.tags && <p id="intel-tags-error" className="text-red-400 font-mono text-[10px] mt-2 uppercase tracking-widest">{errors.tags}</p>}
        </div>

        <div>
          <label htmlFor="intel-body" className="block font-mono text-xs text-yellow-electric uppercase tracking-widest mb-2">
            Intelligence Body Payload
          </label>
          <textarea
            id="intel-body"
            aria-invalid={!!errors.body}
            aria-describedby={errors.body ? "intel-body-error" : undefined}
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={isSubmitting}
            className={`w-full bg-white/5 border text-white font-mono text-sm p-4 focus:outline-none transition-colors placeholder-gray-600 rounded-sm resize-y ${errors.body ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-yellow-electric/50'}`}
            placeholder="INPUT SECURE INTELLIGENCE DATA HERE..."
          ></textarea>
          {errors.body && <p id="intel-body-error" className="text-red-400 font-mono text-[10px] mt-2 uppercase tracking-widest">{errors.body}</p>}
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-4 bg-yellow-electric text-black font-editorial font-bold text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(250,204,21,0.3)] hover:bg-yellow-400 transition-colors hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Transmitting...' : 'Commit Payload'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default IntelManager;
