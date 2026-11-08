'use client';

import { Cow, MilkEntry, Delivery, PaymentRecord, ExpenseRecord, HealthEvent, BreedingEvent, Farm, FarmReminder } from '@/types';
import { farmToday } from './dates';
import { acceptedLitres, deliveryCharge } from './ledger';
import { countedEntryIds } from './milk';

function downloadFile(content: string, fileName: string, mimeType: string) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const DataExporter = {
  exportMilkToCSV(entries: MilkEntry[]) {
    const headers = ['Date', 'Session', 'Mode', 'Total Litres', 'Status', 'Sold (L)', 'Household (L)', 'Calves (L)', 'Waste (L)', 'Notes'];
    const counted = countedEntryIds(entries);
    const rows = entries.map((e) => [
      e.date,
      e.session,
      e.mode,
      e.totalLitres,
      e.voidedAt ? `"Voided: ${(e.voidReason || '').replace(/"/g, '""')}"` : counted.has(e.id) ? 'Counted' : 'Not counted (overlap)',
      e.allocation?.soldLitres ?? '',
      e.allocation?.householdLitres ?? '',
      e.allocation?.calvesLitres ?? '',
      e.allocation?.wasteLitres ?? '',
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadFile(csvContent, `mylkio_milk_production_${farmToday()}.csv`, 'text/csv;charset=utf-8;');
  },

  exportDeliveriesToCSV(deliveries: Delivery[]) {
    const headers = ['Date', 'Buyer Name', 'Buyer Type', 'Delivered Litres', 'Rejected (L)', 'Accepted (L)', 'Rate (KSh)', 'Adjustment (KSh)', 'Charge (KSh)', 'Paid at Delivery (KSh)', 'Status', 'Notes'];
    const rows = deliveries.map((d) => [
      d.date,
      `"${d.buyerName.replace(/"/g, '""')}"`,
      d.buyerType,
      d.litres,
      d.rejectedLitres,
      acceptedLitres(d),
      d.ratePerLitre,
      d.adjustmentKSh,
      deliveryCharge(d),
      d.amountPaid,
      d.voidedAt ? `"Voided: ${(d.voidReason || '').replace(/"/g, '""')}"` : 'Active',
      `"${(d.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadFile(csvContent, `mylkio_deliveries_ledger_${farmToday()}.csv`, 'text/csv;charset=utf-8;');
  },

  exportExpensesToCSV(expenses: ExpenseRecord[]) {
    const headers = ['Date', 'Category', 'Description', 'Amount (KSh)', 'Payment Method', 'Reference Code', 'Notes'];
    const rows = expenses.map((exp) => [
      exp.date,
      exp.category,
      `"${exp.description.replace(/"/g, '""')}"`,
      exp.amount,
      exp.paymentMethod,
      exp.referenceNo || '',
      `"${(exp.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadFile(csvContent, `mylkio_farm_expenses_${farmToday()}.csv`, 'text/csv;charset=utf-8;');
  },

  exportHerdToCSV(cows: Cow[]) {
    const headers = ['Tag / ID', 'Name', 'Breed', 'Status', 'Pregnant?', 'Expected Calving', 'Calvings (Parity)', 'DOB', 'Notes'];
    const rows = cows.map((c) => [
      c.tag,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      c.breed,
      c.status,
      c.isPregnant ? 'Yes' : 'No',
      c.expectedCalvingDate || '',
      c.parity,
      c.dob || '',
      `"${(c.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadFile(csvContent, `mylkio_herd_registry_${farmToday()}.csv`, 'text/csv;charset=utf-8;');
  },

  exportFullBackupJSON(backupData: {
    farm: Farm;
    cows: Cow[];
    buyers: any[];
    milk: MilkEntry[];
    deliveries: Delivery[];
    payments: PaymentRecord[];
    health: HealthEvent[];
    breeding: BreedingEvent[];
    expenses: ExpenseRecord[];
    reminders: FarmReminder[];
  }) {
    const content = JSON.stringify({ schemaVersion: 2, exportedAt: new Date().toISOString(), ...backupData }, null, 2);
    downloadFile(content, `mylkio_full_farm_backup_${farmToday()}.json`, 'application/json');
  }
};
