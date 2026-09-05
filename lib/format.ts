import { menuCurrency, menuLocale } from "@/data/menu";

/**
 * Formats a menu price. Booking and deposit pricing arrives in a later phase
 * and will live in its own configuration layer — do not add it here.
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat(menuLocale, {
    style: "currency",
    currency: menuCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
