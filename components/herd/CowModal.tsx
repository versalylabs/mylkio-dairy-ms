'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Cow, Breed, CowStatus, Language } from '@/types';
import { translations } from '@/lib/translations';
import { X, Check, Camera, Trash2, Image as ImageIcon } from 'lucide-react';

interface CowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cow: Omit<Cow, 'id' | 'createdAt' | 'farmId'>) => void;
  cowToEdit?: Cow | null;
  lang: Language;
}

const breeds: Breed[] = [
  'Friesian',
  'Ayrshire',
  'Jersey',
  'Guernsey',
  'Sahiwal',
  'Boran',
  'Crossbreed',
  'Other',
];

export const CowModal: React.FC<CowModalProps> = ({
  isOpen,
  onClose,
  onSave,
  cowToEdit,
  lang,
}) => {
  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tag, setTag] = useState('');
  const [name, setName] = useState('');
  const [breed, setBreed] = useState<Breed>('Friesian');
  const [status, setStatus] = useState<CowStatus>('lactating');
  const [isPregnant, setIsPregnant] = useState(false);
  const [expectedCalvingDate, setExpectedCalvingDate] = useState('');
  const [parity, setParity] = useState(1);
  const [dob, setDob] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (cowToEdit) {
      setTag(cowToEdit.tag);
      setName(cowToEdit.name || '');
      setBreed(cowToEdit.breed);
      setStatus(cowToEdit.status);
      setIsPregnant(cowToEdit.isPregnant);
      setExpectedCalvingDate(cowToEdit.expectedCalvingDate || '');
      setParity(cowToEdit.parity);
      setDob(cowToEdit.dob || '');
      setPhotoUrl(cowToEdit.photoUrl || '');
      setNotes(cowToEdit.notes || '');
    } else {
      setTag('');
      setName('');
      setBreed('Friesian');
      setStatus('lactating');
      setIsPregnant(false);
      setExpectedCalvingDate('');
      setParity(1);
      setDob('');
      setPhotoUrl('');
      setNotes('');
    }
    setError('');
  }, [cowToEdit, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit ~3MB for browser local storage
    if (file.size > 3 * 1024 * 1024) {
      setError(lang === 'sw' ? 'Picha ni kubwa mno (chagua chini ya 3MB)' : 'Photo size too large (under 3MB recommended)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setPhotoUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tag.trim()) {
      setError(lang === 'sw' ? 'Tafadhali weka nambari ya sikio (Tag)' : 'Please enter an ear tag or ID');
      return;
    }

    onSave({
      tag: tag.trim().toUpperCase(),
      name: name.trim() || undefined,
      breed,
      sex: status === 'calf' && name.toLowerCase().includes('bull') ? 'male' : 'female',
      status,
      isPregnant,
      expectedCalvingDate: isPregnant ? expectedCalvingDate : undefined,
      parity: Number(parity) || 0,
      dob: dob || undefined,
      photoUrl: photoUrl || undefined,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {cowToEdit ? t.cowModal.titleEdit : t.cowModal.titleNew}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {lang === 'sw' ? 'Weka taarifa na picha ya ng\'ombe' : 'Enter cattle identification, breeding status & photo'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
              {error}
            </div>
          )}

          {/* Photo Upload Area */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
              {lang === 'sw' ? 'Picha ya Ng\'ombe (Kamera au Faili)' : 'Cow Photo (Camera / Upload)'}
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {photoUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 h-44 group">
                <img
                  src={photoUrl}
                  alt="Cow preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 bg-white text-gray-800 rounded-xl text-xs font-bold shadow hover:bg-gray-100 transition-colors flex items-center gap-1.5"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{lang === 'sw' ? 'Badilisha' : 'Change'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    className="p-2.5 bg-red-600 text-white rounded-xl text-xs font-bold shadow hover:bg-red-700 transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{lang === 'sw' ? 'Ondoa' : 'Remove'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 rounded-2xl border-2 border-dashed border-gray-300 hover:border-dairy-500 bg-gray-50/70 hover:bg-dairy-50/40 transition-colors flex flex-col items-center justify-center text-gray-500 hover:text-dairy-700 gap-2"
              >
                <div className="p-2.5 rounded-full bg-white shadow-xs border border-gray-200">
                  <Camera className="w-5 h-5 text-dairy-600" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-gray-800 block">
                    {lang === 'sw' ? 'Piga picha au pakia kutoka simuni' : 'Take photo or upload image'}
                  </span>
                  <span className="text-[10px] text-gray-400">JPG, PNG under 3MB</span>
                </div>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {t.cowModal.tagLabel}
              </label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder={t.cowModal.tagPlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 focus:border-dairy-500 text-sm font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {t.cowModal.nameLabel}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.cowModal.namePlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 focus:border-dairy-500 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {t.cowModal.breedLabel}
              </label>
              <select
                value={breed}
                onChange={(e) => setBreed(e.target.value as Breed)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 focus:border-dairy-500 text-sm bg-white"
              >
                {breeds.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {t.cowModal.statusLabel}
              </label>
              <select
                value={status}
                onChange={(e) => {
                  const s = e.target.value as CowStatus;
                  setStatus(s);
                  if (s === 'pregnant_heifer') {
                    setIsPregnant(true);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 focus:border-dairy-500 text-sm bg-white font-medium"
              >
                <option value="lactating">{lang === 'sw' ? 'Lactating (Inakamuliwa)' : 'Lactating'}</option>
                <option value="dry">{lang === 'sw' ? 'Dry (Haipatikani maziwa)' : 'Dry'}</option>
                <option value="pregnant_heifer">{lang === 'sw' ? 'Pregnant Heifer (Mtamba Mjamzito)' : 'Pregnant Heifer'}</option>
                <option value="calf">{lang === 'sw' ? 'Calf (Ndama)' : 'Calf'}</option>
                <option value="sick">{lang === 'sw' ? 'Sick / Inatibiwa' : 'Sick / Under Treatment'}</option>
                <option value="sold">{lang === 'sw' ? 'Sold (Imeuzwa)' : 'Sold'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {t.cowModal.parityLabel}
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={parity}
                onChange={(e) => setParity(parseInt(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 focus:border-dairy-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {t.cowModal.dobLabel}
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 focus:border-dairy-500 text-sm"
              />
            </div>
          </div>

          {/* Pregnancy Check & Due Date */}
          <div className="p-3.5 bg-dairy-50/60 rounded-xl border border-dairy-100 space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPregnant}
                onChange={(e) => setIsPregnant(e.target.checked)}
                className="w-4 h-4 text-dairy-600 rounded border-gray-300 focus:ring-dairy-500"
              />
              <span className="text-sm font-semibold text-gray-800">
                {t.cowModal.isPregnantLabel}
              </span>
            </label>

            {isPregnant && (
              <div className="pt-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t.cowModal.expectedCalvingLabel}
                </label>
                <input
                  type="date"
                  value={expectedCalvingDate}
                  onChange={(e) => setExpectedCalvingDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-sm bg-white"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              {t.cowModal.notesLabel}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={lang === 'sw' ? 'Maelezo ya ziada kuhusu afya au asili...' : 'e.g., Vaccinated for FMD, high producer, artificial insemination notes'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-sm"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t.herd.cancel}
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-dairy-600 hover:bg-dairy-700 text-white font-medium text-sm shadow-sm transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{t.herd.saveCow}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
