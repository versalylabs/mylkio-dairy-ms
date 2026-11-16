// The one way an amount of money is written anywhere in Mylkio: "KSh 2,800", never "KSh 2800".
// Prices, plan badges, billing messages and the administration screens all use this, so a figure looks the same
// wherever it appears. Amounts are shown in whole shillings unless they have cents.

export function formatKsh(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return `KSh ${value.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
}

/** "KSh 2,800/mo" for a narrow badge, "KSh 2,800/month" for a sentence. */
export const formatKshPerMonth = (amount: number, short = false) => `${formatKsh(amount)}/${short ? 'mo' : 'month'}`;
