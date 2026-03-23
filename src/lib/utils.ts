/**
 * Merges class names, filtering out falsy values.
 * Replace with `clsx` + `tailwind-merge` once Tailwind is installed.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
