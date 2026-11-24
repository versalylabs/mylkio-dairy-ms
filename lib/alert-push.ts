// The words of the Community alert notifications (migration 0016), in English and Kiswahili. Signs come from the vet
// guide's own list, which is English only until a veterinarian has reviewed it.

import type { DigestMessage, Lang } from './reminder-push';
import { signLabel } from './community-outbreak';

const cut = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** "Official alert: FMD confirmed in Moiben" with the source. One notification per alert (its own tag). */
export function officialMessage(alert: { id: string; title: string; sourceName: string }, lang: Lang): DigestMessage {
  return {
    title: cut(`${lang === 'sw' ? 'Tahadhari rasmi' : 'Official alert'}: ${alert.title}`, 100),
    body: lang === 'sw' ? `Chanzo: ${alert.sourceName}. Fungua Mylkio kusoma.` : `Source: ${alert.sourceName}. Open Mylkio to read it.`,
    url: '/', tag: `mylkio-official-${alert.id}`,
  };
}

/** "Outbreak alert in Rongai": the group, the first new sign, and the safety line. One per area. */
export function outbreakMessage(area: string, groupName: string, signs: readonly string[], lang: Lang): DigestMessage {
  const first = signLabel(signs[0] ?? '');
  const more = signs.length - 1;
  const what = more > 0 ? (lang === 'sw' ? `${first}; na ${more} zaidi` : `${first}; and ${more} more`) : first;
  return lang === 'sw'
    ? { title: `Tahadhari ya mlipuko: ${area}`, body: cut(`${groupName}: shamba linaripoti ${what}. Ushauri wa majirani, si utambuzi. Mwite daktari wa mifugo ukiwa na wasiwasi.`, 240), url: '/', tag: `mylkio-outbreak-${area.toLowerCase()}` }
    : { title: `Outbreak alert: ${area}`, body: cut(`${groupName}: a farm reports ${what}. Guidance from neighbours, not a diagnosis. Call a vet if you are worried.`, 240), url: '/', tag: `mylkio-outbreak-${area.toLowerCase()}` };
}
