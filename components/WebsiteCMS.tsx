import React, { useState, useEffect, useRef } from 'react';
import { WebsiteContent, User } from '../types';
import { getWebsiteContent, updateWebsiteContent, logAction, uploadImage } from '../services/db';
import { LayoutIcon, ImageIcon, SaveIcon, GlobeIcon, EyeIcon, TrashIcon, PlusIcon } from './Icons';

interface WebsiteCMSProps {
  user: User;
  onPreview?: () => void;
}

const ImageUploader: React.FC<{
  label: string;
  value?: string;
  onChange: (url: string | undefined) => void;
  uploadPath: string;
  aspectHint?: string;
}> = ({ label, value, onChange, uploadPath, aspectHint }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB.');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadImage(file, `${uploadPath}-${Date.now()}`);
      onChange(url);
    } catch (err: any) {
      alert('Upload failed: ' + (err.message || err));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <label className="text-xs font-bold text-gray-500 uppercase">{label}</label>
      {aspectHint && <span className="text-xs text-gray-400 ml-2">({aspectHint})</span>}
      <div className="mt-1">
        {value ? (
          <div className="relative group rounded-lg overflow-hidden border border-gray-200">
            <img src={value} alt={label} className="w-full h-40 object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-gray-100"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => onChange(undefined)}
                className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full h-32 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-teal-400 hover:text-teal-500 transition-colors disabled:opacity-60"
          >
            <ImageIcon className="w-8 h-8" />
            <span className="text-xs font-medium">{uploading ? 'Uploading...' : 'Click to upload image'}</span>
            <span className="text-[10px]">PNG, JPG up to 5MB</span>
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
};

const WebsiteCMS: React.FC<WebsiteCMSProps> = ({ user, onPreview }) => {
  const [content, setContent] = useState<WebsiteContent>({
    id: 'main',
    heroTitle: '',
    heroSubtitle: '',
    aboutTitle: '',
    aboutText: '',
    showRooms: true,
    showServices: true,
    contactText: '',
    heroImage: undefined,
    aboutImage: undefined,
    galleryImages: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const data = await getWebsiteContent();
      setContent({ galleryImages: [], ...data });
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateWebsiteContent(content);
      await logAction(user, 'UPDATE_WEBSITE', 'Updated public website content');
      alert('Website content saved!');
    } catch (err) {
      console.error(err);
      alert('Failed to save content.');
    } finally {
      setSaving(false);
    }
  };

  const handleGalleryAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const current = content.galleryImages || [];
    if (current.length + files.length > 10) {
      alert('Maximum 10 gallery images allowed.');
      return;
    }
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { alert(`${file.name} is over 5MB, skipped.`); continue; }
      try {
        const url = await uploadImage(file, `gallery/gallery-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        setContent(prev => ({
          ...prev,
          galleryImages: [...(prev.galleryImages || []), url]
        }));
      } catch (err: any) {
        alert(`Failed to upload ${file.name}: ` + (err.message || err));
      }
    }
    e.target.value = '';
  };

  const removeGalleryImage = (index: number) => {
    setContent(prev => ({
      ...prev,
      galleryImages: (prev.galleryImages || []).filter((_, i) => i !== index)
    }));
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview();
    } else {
      const width = 1200, height = 800;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      window.open('/website', '_blank', `width=${width},height=${height},top=${top},left=${left}`);
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Loading CMS...</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <LayoutIcon className="w-6 h-6 text-teal-600" />
            Website Builder
          </h2>
          <p className="text-sm text-gray-500">Manage your public hotel website content and images</p>
        </div>
        <button
          onClick={handlePreview}
          className="flex items-center gap-2 bg-white border border-gray-200 text-teal-600 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
        >
          <EyeIcon className="w-4 h-4" /> Live Preview
        </button>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Hero Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
            <ImageIcon className="w-5 h-5 text-gray-400" /> Hero Section
          </h3>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Main Headline</label>
            <input
              type="text"
              value={content.heroTitle}
              onChange={(e) => setContent({ ...content, heroTitle: e.target.value })}
              className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Subtitle / Slogan</label>
            <textarea
              value={content.heroSubtitle}
              onChange={(e) => setContent({ ...content, heroSubtitle: e.target.value })}
              className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              rows={3}
            />
          </div>
          <ImageUploader
            label="Hero Background Image"
            aspectHint="recommended 1920×1080"
            value={content.heroImage}
            uploadPath="website/hero"
            onChange={(v) => setContent({ ...content, heroImage: v })}
          />
        </div>

        {/* About Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
            <GlobeIcon className="w-5 h-5 text-gray-400" /> About Hotel
          </h3>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Section Title</label>
            <input
              type="text"
              value={content.aboutTitle}
              onChange={(e) => setContent({ ...content, aboutTitle: e.target.value })}
              className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">About Text</label>
            <textarea
              value={content.aboutText}
              onChange={(e) => setContent({ ...content, aboutText: e.target.value })}
              className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              rows={4}
            />
          </div>
          <ImageUploader
            label="About Section Image"
            aspectHint="recommended 4:3"
            value={content.aboutImage}
            uploadPath="website/about"
            onChange={(v) => setContent({ ...content, aboutImage: v })}
          />
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Contact / Footer Text</label>
            <input
              type="text"
              value={content.contactText}
              onChange={(e) => setContent({ ...content, contactText: e.target.value })}
              className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>
        </div>

        {/* Gallery */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-4">
            <h3 className="font-bold text-gray-800">Photo Gallery</h3>
            <span className="text-xs text-gray-400">{(content.galleryImages || []).length}/10 images</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {(content.galleryImages || []).map((img, i) => (
              <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
                <img src={img} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeGalleryImage(i)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <TrashIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
            {(content.galleryImages || []).length < 10 && (
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="aspect-square border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-teal-400 hover:text-teal-500 transition-colors"
              >
                <PlusIcon className="w-6 h-6" />
                <span className="text-[10px] font-medium">Add Photo</span>
              </button>
            )}
          </div>
          <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryAdd} />
        </div>

        {/* Section Visibility */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <h3 className="font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">Section Visibility</h3>
          <div className="flex gap-8">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input type="checkbox" checked={content.showRooms} onChange={(e) => setContent({ ...content, showRooms: e.target.checked })} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </div>
              <span className="text-sm font-medium text-gray-700">Show Rooms Showcase</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input type="checkbox" checked={content.showServices} onChange={(e) => setContent({ ...content, showServices: e.target.checked })} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </div>
              <span className="text-sm font-medium text-gray-700">Show Amenities & Services</span>
            </label>
          </div>
        </div>

        <div className="lg:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-teal-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-teal-700 transition-all shadow-lg hover:shadow-teal-500/30 disabled:opacity-60"
          >
            <SaveIcon className="w-5 h-5" /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WebsiteCMS;
