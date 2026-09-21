/** Wishlist occasion scoping — hide the control until there are two named packs. */

export function shouldShowOccasionFilter(occasionCount: number) {
  return occasionCount >= 2;
}
