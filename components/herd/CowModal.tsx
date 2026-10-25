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
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
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
      const existingPhotos = cowToEdit.photoUrls && cowToEdit.photoUrls.length > 0
        ? cowToEdit.photoUrls
        : (cowToEdit.photoUrl ? [cowToEdit.photoUrl] : []);
      setPhotoUrls(existingPhotos);
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
      setPhotoUrls([]);
      setNotes('');
    }
    setError('');
  }, [cowToEdit, isOpen]);

  if (!isOpen) return null;

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 3.5 * 1024 * 1024) {
        setError(lang === 'sw' ? 'Picha moja ni kubwa mno (chagua chini ya 3.5MB)' : 'One of the photos exceeds 3.5MB limit');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          const resultStr = event.target.result;
          setPhotoUrls((prev) => [...prev, resultStr]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setPhotoUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSetPrimary = (indexToPrimary: number) => {
    setPhotoUrls((prev) => {
      if (indexToPrimary === 0) return prev;
      const selected = prev[indexToPrimary];
      const others = prev.filter((_, idx) => idx !== indexToPrimary);
      return [selected, ...others];
    });
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
      photoUrl: photoUrls[0] || undefined,
      photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
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

          {/* Multiple Photo Upload Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                {lang === 'sw' ? 'Picha za Ng\'ombe (Kamera au Faili)' : 'Cow Photos (Upload Multiple)'}
              </label>
              <span className="text-[11px] text-[#879C91]">
                {photoUrls.length} {photoUrls.length === 1 ? 'photo' : 'photos'}
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              onChange={handleFilesChange}
              className="hidden"
            />

            {photoUrls.length > 0 ? (
              <div className="space-y-3">
                {/* Thumbnails Grid */}
                <div className="grid grid-cols-3 gap-2.5">
                  {photoUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className={`relative rounded-xl overflow-hidden border-2 h-28 bg-[#FAF9F5] group transition-all ${
                        idx === 0 ? 'border-[#345C4A] shadow-xs' : 'border-[#E8E4D8]'
                      }`}
                    >
                      <img
                        src={url}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />

                      {/* Primary Badge */}
                      {idx === 0 ? (
                        <span className="absolute top-1.5 left-1.5 bg-[#345C4A] text-white text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                          {lang === 'sw' ? 'Kuu' : 'Primary'}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(idx)}
                          className="absolute top-1.5 left-1.5 bg-black/60 hover:bg-[#345C4A] text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Make Primary
                        </button>
                      )}

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1.5 right-1.5 p-1 bg-red-600/90 hover:bg-red-700 text-white rounded-md shadow-xs transition-colors"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add more button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-28 rounded-xl border-2 border-dashed border-[#cbdbcf] hover:border-[#345C4A] bg-[#f3f7f4]/60 hover:bg-[#e4ede7]/50 text-[#345C4A] flex flex-col items-center justify-center gap-1 transition-all"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="text-[11px] font-bold">
                      {lang === 'sw' ? '+ Picha Zaidi' : '+ Add More'}
                    </span>
                  </button>
                </div>

                <p className="text-[11px] text-[#5D7368]">
                  {lang === 'sw'
                    ? 'Kidokezo: Picha ya kwanza ndiyo itaonekana kwenye kadi ya ng\'ombe.'
                    : 'Tip: The first photo is the primary image shown on cow cards.'}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 rounded-2xl border-2 border-dashed border-[#cbdbcf] hover:border-[#345C4A] bg-[#f3f7f4]/60 hover:bg-[#e4ede7]/40 transition-colors flex flex-col items-center justify-center text-[#5D7368] hover:text-[#345C4A] gap-2"
              >
                <div className="p-2.5 rounded-full bg-white shadow-xs border border-[#E8E4D8]">
                  <Camera className="w-5 h-5 text-[#345C4A]" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-[#26332D] block">
                    {lang === 'sw' ? 'Piga picha au pakia (picha moja au zaidi)' : 'Take photo or upload (one or more)'}
                  </span>
                  <span className="text-[10px] text-[#879C91]">Select multiple images from phone or camera</span>
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
