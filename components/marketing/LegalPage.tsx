import Link from 'next/link';
import type { LegalDocument } from '@/lib/legal';
import { LEGAL_UPDATED } from '@/lib/legal';

/** A plain, readable page for the Privacy notice and Terms of use. A server component: no scripts needed. */
export function LegalPage({ doc, other }: { doc: LegalDocument; other: { href: string; label: string } }) {
  return (
    <div className="min-h-screen bg-ivory text-charcoal">
      <header className="border-b border-ivory-border bg-white/80 backdrop-blur">
        <div className="container-page flex items-center justify-between gap-4 py-4">
          <Link href="/" className="flex items-center gap-3 whitespace-nowrap" aria-label="Mylkio home">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sage font-display text-lg font-medium text-white">M</span>
            <span className="font-display text-xl font-medium">Mylkio</span>
          </Link>
          <Link href="/" className="btn btn-secondary">Back to Mylkio</Link>
        </div>
      </header>

      <main className="container-page max-w-3xl py-12 sm:py-16">
        <p className="eyebrow">Legal</p>
        <h1 className="page-title mt-4 !text-display-lg">{doc.title}</h1>
        <p className="mt-4 text-lg text-charcoal-light">{doc.summary}</p>
        <p className="mt-2 text-sm text-charcoal-muted">Last updated {LEGAL_UPDATED}</p>

        <div className="mt-10 space-y-9">
          {doc.sections.map((section, index) => (
            <section key={section.heading} aria-labelledby={`s${index}`}>
              <h2 id={`s${index}`} className="font-display text-2xl font-medium">{section.heading}</h2>
              {section.paragraphs?.map((text) => <p key={text} className="mt-3 leading-relaxed text-charcoal-light">{text}</p>)}
              {section.bullets && (
                <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-charcoal-light marker:text-sage">
                  {section.bullets.map((text) => <li key={text}>{text}</li>)}
                </ul>
              )}
            </section>
          ))}
        </div>

        <p className="mt-14 border-t border-ivory-border pt-6 text-sm text-charcoal-muted">
          Also read our <Link className="font-semibold text-sage underline" href={other.href}>{other.label}</Link>.
        </p>
      </main>
    </div>
  );
}
