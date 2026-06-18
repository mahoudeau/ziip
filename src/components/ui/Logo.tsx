/**
 * The Ziip wordmark glyph, sourced from the mathieu.dev brand assets
 * (public/images/logos/ziip-mark.svg). Fills inherit `currentColor` so the
 * mark recolors with the surrounding text color.
 */
/**
 * The Ziip wordmark: the Z mark stands in for the initial letter, followed by
 * "iip". Everything sizes off the inherited font-size (set a `text-*` class on
 * this element or a parent), so the header and hero versions stay identical at
 * any scale. `leading-none` keeps vertical alignment consistent across sizes.
 */
export function Wordmark({ class: className = '' }: { class?: string }) {
  return (
    <span class={`inline-flex items-center font-display font-semibold tracking-tight leading-none ${className}`}>
      <LogoMark class="h-[1.067em] w-[1.067em] shrink-0 text-brand -mr-[0.233em]" />
      iip
    </span>
  );
}

export function LogoMark({ class: className }: { class?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="currentColor" class={className} aria-hidden="true">
      <path d="M28,18 L92,18 L74,36 L28,36 L24,32 L24,22 Z" />
      <path d="M46,84 L88,84 L92,88 L92,98 L88,102 L28,102 Z" />
      <rect x="-1.90" y="-5.75" width="3.80" height="11.50" rx="1.4" transform="translate(82.6,26.5) rotate(119.7)" />
      <rect x="-1.90" y="-5.75" width="3.80" height="11.50" rx="1.4" transform="translate(74.9,27.9) rotate(119.7)" />
      <rect x="-1.90" y="-5.75" width="3.80" height="11.50" rx="1.4" transform="translate(77.6,35.2) rotate(119.7)" />
      <rect x="-1.90" y="-5.75" width="3.80" height="11.50" rx="1.4" transform="translate(69.9,36.6) rotate(119.7)" />
      <rect x="-1.90" y="-5.75" width="3.80" height="11.50" rx="1.4" transform="translate(72.7,43.9) rotate(119.7)" />
      <rect x="-1.90" y="-5.75" width="3.80" height="11.50" rx="1.4" transform="translate(65.0,45.3) rotate(119.7)" />
      <rect x="-1.90" y="-5.75" width="3.80" height="11.50" rx="1.4" transform="translate(67.7,52.6) rotate(119.7)" />
      <rect x="-1.90" y="-5.75" width="3.80" height="11.50" rx="1.4" transform="translate(60.0,54.0) rotate(119.7)" />
      <rect x="-1.90" y="-5.75" width="3.80" height="11.50" rx="1.4" transform="translate(62.7,61.3) rotate(119.7)" />
      <rect x="-1.90" y="-5.75" width="3.80" height="11.50" rx="1.4" transform="translate(55.0,62.6) rotate(119.7)" />
      <rect x="-1.90" y="-5.75" width="3.80" height="11.50" rx="1.4" transform="translate(57.8,70.0) rotate(119.7)" />
      <rect x="-1.90" y="-5.75" width="3.80" height="11.50" rx="1.4" transform="translate(50.1,71.3) rotate(119.7)" />
      <rect x="-1.90" y="-5.75" width="3.80" height="11.50" rx="1.4" transform="translate(52.8,78.6) rotate(119.7)" />
      <rect x="-1.90" y="-5.75" width="3.80" height="11.50" rx="1.4" transform="translate(45.1,80.0) rotate(119.7)" />
      <rect x="-1.90" y="-5.75" width="3.80" height="11.50" rx="1.4" transform="translate(47.8,87.3) rotate(119.7)" />
      <rect x="-1.90" y="-5.75" width="3.80" height="11.50" rx="1.4" transform="translate(40.2,88.7) rotate(119.7)" />
      <rect x="-1.90" y="-5.75" width="3.80" height="11.50" rx="1.4" transform="translate(42.9,96.0) rotate(119.7)" />
      <rect x="-1.90" y="-5.75" width="3.80" height="11.50" rx="1.4" transform="translate(35.2,97.4) rotate(119.7)" />
    </svg>
  );
}
