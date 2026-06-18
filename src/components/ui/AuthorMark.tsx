/**
 * Mathieu Mahoudeau's "MM" monogram, lifted from the mathieu.dev brand mark
 * (public/logo.svg). Uses `currentColor` so it adopts the surrounding text
 * colour — used in the footer credit.
 */
export function AuthorMark({ class: className }: { class?: string }) {
  return (
    <svg viewBox="0 0 48 40" fill="currentColor" class={className} aria-hidden="true">
      <path fill-rule="evenodd" d="M41.576 0L12.872 28.703v-2.95L38.625 0h-4.1l-10.9 10.898L12.725 0h-4.1l12.949 12.95-1.476 1.474L5.675 0h-4.1l16.474 16.475-1.475 1.475L0 1.376V40h2.9V8.378l2.087 2.086V40h2.9V13.364l2.086 2.087V40h2.9v-.146l10.752-10.752L34.525 40h2.951V15.253l2.086-2.087V40h2.9V10.266l2.087-2.086V40h2.898V5.434h-.153l.153-.154V1.178L12.872 35.754v-2.95L45.675 0h-4.1zm-8.849 20l1.848-1.848v3.697L32.727 20zm-19.855-1.65L14.522 20l-1.65 1.65V18.35zm16.329 5.176l1.476-1.474 3.898 3.899v2.952l-5.374-5.377zm-3.526 3.526l1.475-1.476 7.425 7.426v2.95l-8.9-8.9z" />
    </svg>
  );
}
