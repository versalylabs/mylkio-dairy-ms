'use client';

import React, { useState } from 'react';
import { Cow, CowStatus, HealthEvent, BreedingEvent, Language } from '@/types';
import { translations } from '@/lib/translations';
import { 
  Plus, 
  Search, 
  Calendar, 
  Activity, 
  Edit2, 
  Trash2, 
  Camera, 
  Stethoscope, 
  Dna, 
  Users, 
  ShieldAlert, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';

interface HerdViewProps {
  cows: Cow[];
  healthEvents: HealthEvent[];
  breedingEvents: BreedingEvent[];
  onAddCow: () => void;
  onEditCow: (cow: Cow) => void;
  onDeleteCow: (id: string) => void;
  onOpenRecordHealth: () => void;
  onDeleteHealth: (id: string) => void;
  onOpenRecordBreeding: () => void;
  onDeleteBreeding: (id: string) => void;
  lang: Language;
}

export const HerdView: React.FC<HerdViewProps> = ({
  cows,
  healthEvents,
  breedingEvents,
  onAddCow,
  onEditCow,
  onDeleteCow,
  onOpenRecordHealth,
  onDeleteHealth,
  onOpenRecordBreeding,
  onDeleteBreeding,
  lang,
}) => {
  const t = translations[lang];
  const [activeSubTab, setActiveSubTab] = useState<'registry' | 'health' | 'breeding'>('registry');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const filteredCows = cows.filter((cow) => {
    const matchesSearch =
      cow.tag.toLowerCase().includes(search.toLowerCase()) ||
      (cow.name && cow.name.toLowerCase().includes(search.toLowerCase())) ||
      cow.breed.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === 'all') return true;
    if (filter === 'lactating') return cow.status === 'lactating';
    if (filter === 'dry') return cow.status === 'dry';
    if (filter === 'pregnant') return cow.isPregnant || cow.status === 'pregnant_heifer';
    if (filter === 'sick') return cow.status === 'sick';
    if (filter === 'calves') return cow.status === 'calf';
    return true;
  });

  const activeWithdrawals = healthEvents.filter((h) => h.isWithdrawalActive);

  const getStatusBadge = (status: CowStatus, isPregnant: boolean) => {
    let bg = 'bg-gray-100 text-gray-700';
    let label: string = status;

    if (status === 'lactating') {
      bg = 'bg-emerald-100 text-emerald-800 border-emerald-200';
      label = lang === 'sw' ? 'Inakamuliwa' : 'Lactating';
    } else if (status === 'dry') {
      bg = 'bg-amber-100 text-amber-800 border-amber-200';
      label = lang === 'sw' ? 'Haikamuliwi (Dry)' : 'Dry';
    } else if (status === 'pregnant_heifer') {
      bg = 'bg-purple-100 text-purple-800 border-purple-200';
      label = lang === 'sw' ? 'Mtamba Mjamzito' : 'Pregnant Heifer';
    } else if (status === 'calf') {
      bg = 'bg-blue-100 text-blue-800 border-blue-200';
      label = lang === 'sw' ? 'Ndama' : 'Calf';
    } else if (status === 'sick') {
      bg = 'bg-rose-100 text-rose-800 border-rose-200';
      label = lang === 'sw' ? 'Inatibiwa' : 'Under Treatment';
    } else if (status === 'sold') {
      bg = 'bg-gray-200 text-gray-700 border-gray-300';
      label = lang === 'sw' ? 'Imeuzwa' : 'Sold';
    }

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${bg}`}>
          {label}
        </span>
        {isPregnant && status !== 'pregnant_heifer' && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            {lang === 'sw' ? 'Mimba' : 'Pregnant'}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {t.herd.title}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'sw'
              ? 'Usajili wa wanyama, afya na kizuizi cha maziwa, na uzazi wa kisasa'
              : 'Animal registry, veterinary treatments, withdrawal periods & AI breeding'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onAddCow}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-dairy-600 hover:bg-dairy-700 text-white font-semibold text-xs shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t.herd.addCowBtn}</span>
          </button>

          <button
            onClick={onOpenRecordHealth}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm transition-all"
          >
            <Stethoscope className="w-4 h-4" />
            <span>{lang === 'sw' ? 'Rekodi Afya' : 'Log Health'}</span>
          </button>

          <button
            onClick={onOpenRecordBreeding}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-sm transition-all"
          >
            <Dna className="w-4 h-4" />
            <span>{lang === 'sw' ? 'Rekodi Uzazi' : 'Log Breeding'}</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveSubTab('registry')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'registry'
              ? 'bg-dairy-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{lang === 'sw' ? 'Orodha ya Ng\'ombe' : 'Cattle Registry'}</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeSubTab === 'registry' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {cows.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('health')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'health'
              ? 'bg-dairy-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>{lang === 'sw' ? 'Afya na Chanjo' : 'Health & Treatments'}</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeSubTab === 'health' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {healthEvents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('breeding')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'breeding'
              ? 'bg-dairy-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Dna className="w-4 h-4" />
          <span>{lang === 'sw' ? 'Uzazi na Upandishaji' : 'Breeding & Calving'}</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeSubTab === 'breeding' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {breedingEvents.length}
          </span>
        </button>
      </div>

      {/* SUB-TAB 1: CATTLE REGISTRY */}
      {activeSubTab === 'registry' && (
        <div className="space-y-4">
          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { key: 'all', label: t.herd.filterAll, count: cows.length },
              { key: 'lactating', label: t.herd.filterLactating, count: cows.filter(c => c.status === 'lactating').length },
              { key: 'dry', label: t.herd.filterDry, count: cows.filter(c => c.status === 'dry').length },
              { key: 'pregnant', label: t.herd.filterPregnant, count: cows.filter(c => c.isPregnant || c.status === 'pregnant_heifer').length },
              { key: 'sick', label: t.herd.filterSick, count: cows.filter(c => c.status === 'sick').length },
              { key: 'calves', label: t.herd.filterCalves, count: cows.filter(c => c.status === 'calf').length },
            ].map((tab) => {
              const isActive = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                    isActive
                      ? 'bg-dairy-600 text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.herd.searchPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-dairy-500 focus:border-dairy-500"
            />
          </div>

          {/* Cow Cards / Grid */}
          {filteredCows.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 p-6">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium text-sm">{t.herd.emptyState}</p>
              <button
                onClick={onAddCow}
                className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-dairy-50 text-dairy-700 font-semibold text-xs rounded-lg hover:bg-dairy-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{t.herd.addCowBtn}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCows.map((cow) => (
                <div
                  key={cow.id}
                  className="bg-white rounded-2xl border border-gray-200/90 shadow-sm hover:shadow transition-all flex flex-col justify-between overflow-hidden"
                >
                  {/* Cow Photo Banner */}
                  {cow.photoUrl ? (
                    <div className="relative h-40 w-full bg-gray-100 overflow-hidden">
                      <img
                        src={cow.photoUrl}
                        alt={cow.name || cow.tag}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 left-2.5">
                        <span className="px-2.5 py-1 bg-black/75 backdrop-blur-md text-white font-mono font-bold text-xs rounded-lg shadow">
                          {cow.tag}
                        </span>
                      </div>
                      <div className="absolute top-2.5 right-2.5">
                        <span className="text-xs font-semibold text-gray-800 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-md shadow">
                          {cow.breed}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 pb-0 flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-1 bg-dairy-900 text-white font-mono font-bold text-xs rounded-lg">
                          {cow.tag}
                        </span>
                        <h3 className="font-bold text-gray-900 text-base">
                          {cow.name || cow.tag}
                        </h3>
                      </div>
                      <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                        {cow.breed}
                      </span>
                    </div>
                  )}

                  {/* Card Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      {cow.photoUrl && (
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-gray-900 text-lg">
                            {cow.name || cow.tag}
                          </h3>
                          {cow.name && (
                            <span className="text-xs font-mono text-gray-400">
                              {cow.tag}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mt-1">
                        {getStatusBadge(cow.status, cow.isPregnant)}
                      </div>

                      {/* Meta Details */}
                      <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                        <div>
                          <span className="text-gray-400 block text-[11px]">{t.herd.parity}</span>
                          <span className="font-semibold text-gray-800">{cow.parity} {cow.parity === 1 ? 'calving' : 'calvings'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px]">{t.herd.age}</span>
                          <span className="font-semibold text-gray-800">
                            {cow.dob ? cow.dob : 'Unknown'}
                          </span>
                        </div>
                        {cow.expectedCalvingDate && (
                          <div className="col-span-2 pt-1 border-t border-gray-200/60 flex items-center gap-1.5 text-purple-700 font-medium">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span>{t.herd.expectedCalving}: {cow.expectedCalvingDate}</span>
                          </div>
                        )}
                      </div>

                      {cow.notes && (
                        <p className="mt-3 text-xs text-gray-500 line-clamp-2 italic">
                          &quot;{cow.notes}&quot;
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                      {!cow.photoUrl && (
                        <button
                          onClick={() => onEditCow(cow)}
                          className="inline-flex items-center space-x-1 text-xs text-dairy-700 font-medium hover:underline"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>{lang === 'sw' ? 'Weka picha' : 'Add photo'}</span>
                        </button>
                      )}
                      {cow.photoUrl && <span></span>}

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onEditCow(cow)}
                          className="p-2 rounded-lg text-gray-500 hover:text-dairy-700 hover:bg-dairy-50 transition-colors"
                          title={t.common.edit}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(lang === 'sw' ? `Una uhakika unataka kumfuta ng'ombe ${cow.tag}?` : `Are you sure you want to delete ${cow.tag}?`)) {
                              onDeleteCow(cow.id);
                            }
                          }}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title={t.common.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: HEALTH & TREATMENTS */}
      {activeSubTab === 'health' && (
        <div className="space-y-4">
          {/* Active Milk Withdrawal Warning Banner */}
          {activeWithdrawals.length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl space-y-2">
              <div className="flex items-center space-x-2 text-rose-900 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{lang === 'sw' ? 'Tahadhari ya Kizuizi cha Maziwa (Active Withdrawal)' : 'Active Milk Withdrawal Periods Warning'}</span>
              </div>
              <p className="text-xs text-rose-800">
                Milk from the following animal(s) contains antibiotic/treatment residues and must <strong>NOT</strong> be delivered to cooperatives or household buyers:
              </p>
              <div className="space-y-1.5 pt-1">
                {activeWithdrawals.map((w) => (
                  <div key={w.id} className="p-2.5 bg-white rounded-xl border border-rose-200 text-xs text-rose-900 font-semibold flex items-center justify-between">
                    <span>• <strong>{w.cowTag} ({w.cowName})</strong>: Treated with {w.medicineName}</span>
                    <span className="bg-rose-100 px-2 py-0.5 rounded-full text-[11px] font-bold">
                      Safe after: {w.withdrawalEndDate}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Health Records Ledger */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {lang === 'sw' ? 'Kumbukumbu za Dawa na Chanjo' : 'Veterinary & Medication History'}
                </h2>
                <p className="text-xs text-gray-500">
                  {healthEvents.length} medical events logged
                </p>
              </div>
              <button
                onClick={onOpenRecordHealth}
                className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold transition-colors"
              >
                + Log Health Event
              </button>
            </div>

            {healthEvents.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                No veterinary or vaccination records logged yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {healthEvents.map((h) => (
                  <div
                    key={h.id}
                    className="p-4 sm:p-5 hover:bg-gray-50/70 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-gray-900">
                          {h.cowTag} {h.cowName ? `(${h.cowName})` : ''}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800">
                          {h.type}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">
                          {h.date}
                        </span>
                      </div>

                      <div className="text-xs text-gray-700 font-medium">
                        Medicine: <strong>{h.medicineName || 'N/A'}</strong>
                        {h.diagnosis && <span> • Diagnosis: {h.diagnosis}</span>}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                        {h.administeredBy && <span>Provider: {h.administeredBy}</span>}
                        {h.costKSh && <span>Cost: <strong>KSh {h.costKSh.toLocaleString()}</strong></span>}
                        {h.nextDueDate && (
                          <span className="text-purple-700 font-semibold">
                            Next due: {h.nextDueDate}
                          </span>
                        )}
                      </div>

                      {h.notes && (
                        <p className="text-xs text-gray-400 italic">
                          &quot;{h.notes}&quot;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end space-x-4">
                      {h.isWithdrawalActive && (
                        <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold text-xs rounded-full border border-rose-200">
                          Withdrawal Active
                        </span>
                      )}

                      <button
                        onClick={() => {
                          if (confirm('Delete this health record?')) {
                            onDeleteHealth(h.id);
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={t.common.delete}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: BREEDING & REPRODUCTION */}
      {activeSubTab === 'breeding' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {lang === 'sw' ? 'Kumbukumbu za Upandishaji na Kuzaa' : 'Insemination, Pregnancy & Calving Registry'}
              </h2>
              <p className="text-xs text-gray-500">
                {breedingEvents.length} reproductive events recorded
              </p>
            </div>
            <button
              onClick={onOpenRecordBreeding}
              className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold transition-colors"
            >
              + Log Breeding Event
            </button>
          </div>

          {breedingEvents.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No breeding or insemination records yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {breedingEvents.map((b) => (
                <div
                  key={b.id}
                  className="p-4 sm:p-5 hover:bg-gray-50/70 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-gray-900">
                        {b.cowTag} {b.cowName ? `(${b.cowName})` : ''}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800">
                        {b.type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        {b.date}
                      </span>
                    </div>

                    {b.sireOrProvider && (
                      <div className="text-xs text-gray-700">
                        Sire / AI: <strong>{b.sireOrProvider}</strong>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
                      {b.pregnancyResult && (
                        <span className={`font-bold ${b.pregnancyResult === 'positive' ? 'text-emerald-700' : 'text-gray-600'}`}>
                          Result: {b.pregnancyResult.toUpperCase()}
                        </span>
                      )}
                      {b.expectedCalvingDate && (
                        <span className="text-purple-700 font-bold flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Due: {b.expectedCalvingDate}</span>
                        </span>
                      )}
                      {b.calvingOutcome && (
                        <span className="text-blue-700 font-semibold">
                          Outcome: {b.calvingOutcome.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    {b.notes && (
                      <p className="text-xs text-gray-400 italic">
                        &quot;{b.notes}&quot;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-4">
                    <button
                      onClick={() => {
                        if (confirm('Delete this breeding record?')) {
                          onDeleteBreeding(b.id);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title={t.common.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
