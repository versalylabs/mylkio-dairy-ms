# Phase 7: interface refinement (app screens)

Status: built on 15 November 2026. The website and sign-in were redone earlier; this pass brings the app itself (Home, Milk, Herd, Sales, Finance, Settings and every pop-up form) up to the same standard.

## What changed

- **One colour family.** The app screens were written with Tailwind's cold grey and slate. Both scales are remapped in `tailwind.config.ts` to the warm ivory / charcoal family, so every screen matches the website without touching each class. Text greys were chosen to keep readable contrast on white.
- **Shared screen styles** in `app/globals.css`: `.page-title` (the serif heading), `.page-sub`, `.tab-strip` / `.tab-btn` / `.tab-btn-active` / `.count-badge` (sub-tabs), `.chip-btn` (small quick-pick chips). Sales, Herd, Cow detail and Finance now use them, so a tab label never wraps; the strip scrolls sideways on a phone instead.
- **Buttons.** 27 hand-styled primary, gold and secondary buttons now use `.btn .btn-primary / .btn-gold / .btn-secondary` (pill shape, 44px high, no wrapping).
- **Pop-up forms.** Ten forms plus the shared `Dialog` open as a bottom sheet on phones and a centred card on larger screens, with the serif title and a 44px close button. 71 inputs now use `.field` (16px text, so phones do not zoom in on tap) and 62 labels use `.field-label`. The quick-add litre chips are real chips and no longer run off the screen.
- **No wrapping.** Badges and date labels never break onto two lines; name, badge and date rows flow as units; panel headers wrap their buttons below the title instead of squeezing them; Finance's period switch scrolls rather than wrapping; Home's quick-action tiles fit at 320px.
- **Layout at tablet width.** Screen headers stack above their buttons until 1024px, stat cards use two columns (three or four only when there is room), and Home's stat cards become one column below 360px. Big amounts stay on one line.

## How it was checked

Every screen and every pop-up form was scanned in the browser at 320, 375 and tablet widths for buttons whose text wraps and for anything wider than the screen. The only multi-line labels left are the two language choices in Settings, which are deliberately a name plus a description.

## Not done

- A few older inner panels still use the original rounded corners and shadows (cosmetic; the colours already match).
- Kiswahili for new text (deferred by request).
