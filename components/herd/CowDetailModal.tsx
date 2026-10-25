'use client';

import React, { useState } from 'react';
import { Cow, HealthEvent, BreedingEvent, MilkEntry, Language } from '@/types';
import { translations } from '@/lib/translations';
import { 
  X, 
  Calendar, 
  Activity, 
  Edit3, 
  Camera, 
  ChevronLeft, 
  ChevronRight, 
  Stethoscope, 
  Dna, 
  AlertTriangle, 
  Milk, 
  Clock, 
  Check, 
  ShieldAlert,
  Sparkles,
  Info
} from 'lucide-react';

interface CowDetailModalProps {
  cow: Cow | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (cow: Cow) => void;
  onOpenRecordHealth?: () => void;
  onOpenRecordBreeding?: () => void;
  healthEvents: HealthEvent[];
  breedingEvents: BreedingEvent[];
  milkEntries?: MilkEntry[];
  lang: Language;
}

export const CowDetailModal: React.FC<CowDetailModalProps> = ({
  cow,
  isOpen,
  onClose,
  onEdit,
  onOpenRecordHealth,
  onOpenRecordBreeding,
  healthEvents,
  breedingEvents,
  milkEntries = [],
  lang,
}) => {
  const t = translations[lang];
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'health' | 'breeding'>('overview');

  if (!isOpen || !cow) return null;

  // Gather photos
  const photos = cow.photoUrls && cow.photoUrls.length > 0 
    ? cow.photoUrls 
    : (cow.photoUrl ? [cow.photoUrl] : []);

  // Filter cow specific events
  const cowHealth = healthEvents.filter((h) => h.cowId === cow.id);
  const cowBreeding = breedingEvents.filter((b) => b.cowId === cow.id);

  // Active withdrawal
  const activeWithdrawal = cowHealth.find((h) => h.isWithdrawalActive);

  // Recent milk production breakdown
  const cowMilkHistory = milkEntries
    .filter((entry) => entry.cowBreakdown?.some((b) => b.cowId === cow.id))
    .map((entry) => {
      const match = entry.cowBreakdown?.find((b) => b.cowId === cow.id);
      return {
        date: entry.date,
        session: entry.session,
        litres: match ? match.litres : 0,
      };
    })
    .slice(0, 7);

  const totalRecordedYield = cowMilkHistory.reduce((sum, item) => sum + item.litres, 0);
  const averageDailyYield = cowMilkHistory.length > 0 
    ? (totalRecordedYield / cowMilkHistory.length).toFixed(1) 
    : null;

  // Days until calving calculation
  let daysUntilCalving: number | null = null;
  if (cow.expectedCalvingDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const calvingDate = new Date(cow.expectedCalvingDate);
    calvingDate.setHours(0, 0, 0, 0);
    const diffTime = calvingDate.getTime() - today.getTime();
    daysUntilCalving = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Next / Previous Photo
  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const getStatusBadge = () => {
    switch (cow.status) {
      case 'lactating':
        return { label: lang === 'sw' ? 'Inakamuliwa (Lactating)' : 'Lactating', class: 'bg-[#A8BFA5]/25 text-[#26332D] border-[#A8BFA5]/40' };
      case 'dry':
        return { label: lang === 'sw' ? 'Haikamuliwi (Dry)' : 'Dry Cow', class: 'bg-[#FAF5EB] text-[#b39252] border-[#E5D5B5]' };
      case 'pregnant_heifer':
        return { label: lang === 'sw' ? 'Mtamba Mjamzito' : 'Pregnant Heifer', class: 'bg-[#FAF5EB] text-[#b39252] border-[#E5D5B5]' };
      case 'calf':
        return { label: lang === 'sw' ? 'Ndama' : 'Calf', class: 'bg-[#FAF9F5] text-[#26332D] border-[#E8E4D8]' };
      case 'sick':
        return { label: lang === 'sw' ? 'Inatibiwa' : 'Under Treatment', class: 'bg-rose-50 text-rose-800 border-rose-200' };
      case 'sold':
        return { label: lang === 'sw' ? 'Imeuzwa' : 'Sold', class: 'bg-gray-100 text-gray-700 border-gray-200' };
      default:
        return { label: cow.status, class: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-[#FAF9F5] rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-[#E8E4D8] flex flex-col text-[#26332D]">
        
        {/* Top Header Ribbon */}
        <div className="p-4 sm:p-5 border-b border-[#E8E4D8] bg-white sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1.5 bg-[#345C4A] text-white font-mono font-bold text-sm sm:text-base rounded-xl shadow-xs">
              {cow.tag}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[#26332D]">
                  {cow.name || cow.tag}
                </h2>
                <span className="text-xs font-semibold text-[#5D7368] bg-[#FAF9F5] px-2.5 py-0.5 rounded-full border border-[#E8E4D8]">
                  {cow.breed}
                </span>
              </div>
              <p className="text-[11px] text-[#879C91]">
                {cow.sex === 'male' ? 'Bull' : 'Cow'} • ID: {cow.id}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onClose();
                onEdit(cow);
              }}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-[#E8E4D8] bg-[#FAF9F5] hover:bg-[#F2EFE7] text-xs font-bold text-[#26332D] transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Edit Cow"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#345C4A]" />
              <span className="hidden sm:inline">{lang === 'sw' ? 'Hariri' : 'Edit'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#879C91] hover:text-[#26332D] hover:bg-[#F2EFE7] rounded-full transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5">
          
          {/* Active Milk Withdrawal Warning Banner */}
          {activeWithdrawal && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-start gap-3 animate-fade-in">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-sm text-rose-900 flex items-center gap-2">
                  <span>{lang === 'sw' ? 'Kizuizi cha Dawa Kinafanya Kazi' : 'Active Antibiotic Milk Withdrawal'}</span>
                  <span className="text-[10px] bg-rose-200 text-rose-900 font-bold px-2 py-0.2 rounded-full">
                    DO NOT SELL MILK
                  </span>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed">
                  Treatment: <strong>{activeWithdrawal.medicineName || activeWithdrawal.diagnosis || 'Veterinary Drug'}</strong>. 
                  Administered on {activeWithdrawal.date}. Withdrawal ends on <strong>{activeWithdrawal.withdrawalEndDate}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Photo Gallery & Carousel */}
          {photos.length > 0 ? (
            <div className="space-y-2.5">
              <div className="relative h-64 sm:h-80 w-full rounded-2xl overflow-hidden bg-black/90 shadow-sm border border-[#E8E4D8] group">
                <img
                  src={photos[activePhotoIndex]}
                  alt={`${cow.name || cow.tag} - Photo ${activePhotoIndex + 1}`}
                  className="w-full h-full object-contain sm:object-cover transition-all"
                />

                {/* Photo Counter Pill */}
                <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-full font-medium shadow">
                  {activePhotoIndex + 1} / {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
                </div>

                {/* Left/Right Carousel Arrows */}
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevPhoto}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition-colors"
                      title="Previous Photo"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleNextPhoto}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition-colors"
                      title="Next Photo"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnail Strip */}
              {photos.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {photos.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActivePhotoIndex(idx)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                        activePhotoIndex === idx 
                          ? 'border-[#345C4A] ring-2 ring-[#345C4A]/30 scale-102' 
                          : 'border-[#E8E4D8] opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={p} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 rounded-2xl border-2 border-dashed border-[#cbdbcf] bg-white flex flex-col items-center justify-center text-center space-y-2.5">
              <div className="p-3 bg-[#f3f7f4] text-[#345C4A] rounded-2xl">
                <Camera className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#26332D]">
                  {lang === 'sw' ? 'Hakuna picha zilizopakiwa bado' : 'No photos uploaded yet'}
                </h4>
                <p className="text-xs text-[#879C91] max-w-sm mt-0.5">
                  {lang === 'sw' ? 'Unaweza kupakia picha nyingi za pembe tofauti za ng\'ombe huyu.' : 'Add multiple photos of cow markings, ear tags, and posture.'}
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onEdit(cow);
                }}
                className="px-4 py-2 bg-[#345C4A] hover:bg-[#274537] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{lang === 'sw' ? 'Pakia Picha Sasa' : 'Upload Photos'}</span>
              </button>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white p-3.5 rounded-2xl border border-[#E8E4D8] space-y-1">
              <span className="text-[11px] font-semibold text-[#879C91] uppercase tracking-wider block">
                Status
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${badge.class}`}>
                {badge.label}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-[#E8E4D8] space-y-1">
              <span className="text-[11px] font-semibold text-[#879C91] uppercase tracking-wider block">
                {t.herd.parity}
              </span>
              <span className="text-sm font-black text-[#26332D]">
                {cow.parity} {cow.parity === 1 ? 'Calving' : 'Calvings'}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-[#E8E4D8] space-y-1">
              <span className="text-[11px] font-semibold text-[#879C91] uppercase tracking-wider block">
                Age / DOB
              </span>
              <span className="text-sm font-black text-[#26332D] truncate block">
                {cow.dob ? cow.dob : 'Unknown'}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-[#E8E4D8] space-y-1">
              <span className="text-[11px] font-semibold text-[#879C91] uppercase tracking-wider block">
                Breeding
              </span>
              <span className={`text-xs font-bold block ${cow.isPregnant ? 'text-[#C6A76A]' : 'text-[#5D7368]'}`}>
                {cow.isPregnant ? 'Confirmed Pregnant' : 'Open / Not Pregnant'}
              </span>
            </div>
          </div>

          {/* Expected Calving Countdown Card */}
          {cow.expectedCalvingDate && (
            <div className="p-4 bg-[#FAF5EB] border border-[#E5D5B5] rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-white text-[#C6A76A] rounded-xl shadow-2xs">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#b39252]">
                    {lang === 'sw' ? 'Tarehe Inayotarajiwa ya Kuzaa' : 'Expected Calving Countdown'}
                  </span>
                  <div className="text-sm font-black text-[#26332D] mt-0.5">
                    {cow.expectedCalvingDate}
                  </div>
                </div>
              </div>

              {daysUntilCalving !== null && (
                <div className="text-right">
                  <span className="px-3 py-1 bg-white border border-[#E5D5B5] rounded-full text-xs font-extrabold text-[#b39252] shadow-2xs">
                    {daysUntilCalving > 0 
                      ? `${daysUntilCalving} days left` 
                      : daysUntilCalving === 0 
                      ? 'Due Today!' 
                      : `${Math.abs(daysUntilCalving)} days overdue`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Milk Performance Snapshot (if lactating or has history) */}
          {cowMilkHistory.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-[#E8E4D8] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-[#f3f7f4] text-[#345C4A] rounded-lg">
                    <Milk className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#26332D]">
                    {lang === 'sw' ? 'Uzalishaji wa Maziwa wa Karibuni' : 'Recent Milking Records'}
                  </h4>
                </div>
                {averageDailyYield && (
                  <span className="text-xs font-bold text-[#345C4A]">
                    Avg: {averageDailyYield} L / session
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {cowMilkHistory.slice(0, 4).map((entry, idx) => (
                  <div key={idx} className="p-2.5 bg-[#FAF9F5] rounded-xl border border-[#E8E4D8] text-center">
                    <span className="text-[10px] text-[#879C91] block">{entry.date} ({entry.session})</span>
                    <span className="text-sm font-black text-[#26332D] mt-0.5 block">{entry.litres.toFixed(1)} L</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtabs for Health & Breeding History */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-[#E8E4D8] pb-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'overview'
                    ? 'bg-[#345C4A] text-white shadow-2xs'
                    : 'text-[#5D7368] hover:text-[#26332D] hover:bg-[#F2EFE7]'
                }`}
              >
                {lang === 'sw' ? 'Muhtasari & Vidokezo' : 'Notes & Pedigree'}
              </button>
              <button
                onClick={() => setActiveTab('health')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'health'
                    ? 'bg-[#345C4A] text-white shadow-2xs'
                    : 'text-[#5D7368] hover:text-[#26332D] hover:bg-[#F2EFE7]'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>{lang === 'sw' ? 'Afya' : 'Health Records'} ({cowHealth.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('breeding')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'breeding'
                    ? 'bg-[#345C4A] text-white shadow-2xs'
                    : 'text-[#5D7368] hover:text-[#26332D] hover:bg-[#F2EFE7]'
                }`}
              >
                <Dna className="w-3.5 h-3.5" />
                <span>{lang === 'sw' ? 'Uzazi' : 'Breeding Events'} ({cowBreeding.length})</span>
              </button>
            </div>

            {/* TAB CONTENT: Overview / Notes */}
            {activeTab === 'overview' && (
              <div className="space-y-3 animate-fade-in">
                {cow.notes ? (
                  <div className="p-4 bg-white rounded-2xl border border-[#E8E4D8]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#879C91] block mb-1">
                      Farmer Notes & Behavior
                    </span>
                    <p className="text-xs text-[#3D4F46] leading-relaxed italic">
                      &ldquo;{cow.notes}&rdquo;
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-white rounded-2xl border border-[#E8E4D8] text-xs text-[#879C91]">
                    No specific notes recorded for this animal yet. Click &apos;Edit&apos; to add temperament, feed preference, or pedigree notes.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-[#E8E4D8]">
                    <span className="text-[10px] text-[#879C91] uppercase font-semibold block">Sire (Father)</span>
                    <span className="font-bold text-[#26332D] mt-0.5 block">{cow.sire || 'Not specified'}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-[#E8E4D8]">
                    <span className="text-[10px] text-[#879C91] uppercase font-semibold block">Dam (Mother Tag)</span>
                    <span className="font-bold text-[#26332D] mt-0.5 block">{cow.damId || 'Not specified'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Health History */}
            {activeTab === 'health' && (
              <div className="space-y-2.5 animate-fade-in">
                {cowHealth.length === 0 ? (
                  <div className="p-5 bg-white rounded-2xl border border-[#E8E4D8] text-center text-xs text-[#879C91]">
                    No veterinary treatments or health issues recorded for {cow.name || cow.tag}.
                  </div>
                ) : (
                  cowHealth.map((item) => (
                    <div key={item.id} className="p-3.5 bg-white rounded-xl border border-[#E8E4D8] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#26332D]">
                          {item.diagnosis || item.medicineName || item.type.toUpperCase()}
                        </span>
                        <span className="text-[11px] text-[#879C91]">{item.date}</span>
                      </div>
                      <p className="text-xs text-[#5D7368]">
                        Medicine: {item.medicineName || 'None'} {item.costKSh ? `• Cost: KSh ${item.costKSh.toLocaleString()}` : ''}
                      </p>
                      {item.isWithdrawalActive && (
                        <span className="inline-block text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.2 rounded-md">
                          Withdrawal active until {item.withdrawalEndDate}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: Breeding History */}
            {activeTab === 'breeding' && (
              <div className="space-y-2.5 animate-fade-in">
                {cowBreeding.length === 0 ? (
                  <div className="p-5 bg-white rounded-2xl border border-[#E8E4D8] text-center text-xs text-[#879C91]">
                    No artificial insemination or calving events recorded for {cow.name || cow.tag}.
                  </div>
                ) : (
                  cowBreeding.map((item) => (
                    <div key={item.id} className="p-3.5 bg-white rounded-xl border border-[#E8E4D8] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#26332D]">
                          {item.type.replace('_', ' ').toUpperCase()} {item.sireOrProvider ? `— ${item.sireOrProvider}` : ''}
                        </span>
                        <span className="text-[11px] text-[#879C91]">{item.date}</span>
                      </div>
                      {item.expectedCalvingDate && (
                        <p className="text-xs text-[#b39252] font-semibold">
                          Expected Calving: {item.expectedCalvingDate}
                        </p>
                      )}
                      {item.notes && <p className="text-xs text-[#5D7368] italic">&ldquo;{item.notes}&rdquo;</p>}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Quick Footer Action Buttons */}
          <div className="pt-4 border-t border-[#E8E4D8] flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              {onOpenRecordHealth && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenRecordHealth();
                  }}
                  className="px-3 py-2 rounded-xl border border-[#E8E4D8] bg-white hover:bg-[#F2EFE7] text-[#26332D] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Stethoscope className="w-3.5 h-3.5 text-[#345C4A]" />
                  <span>Log Treatment</span>
                </button>
              )}
              {onOpenRecordBreeding && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenRecordBreeding();
                  }}
                  className="px-3 py-2 rounded-xl border border-[#E8E4D8] bg-white hover:bg-[#F2EFE7] text-[#26332D] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Dna className="w-3.5 h-3.5 text-[#C6A76A]" />
                  <span>Log AI / Breeding</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(cow);
                }}
                className="px-4 py-2 bg-[#345C4A] hover:bg-[#274537] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{lang === 'sw' ? 'Hariri Ng\'ombe' : 'Edit Details'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white hover:bg-[#F2EFE7] border border-[#E8E4D8] text-[#26332D] rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
