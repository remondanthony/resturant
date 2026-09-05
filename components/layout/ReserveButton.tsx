"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { RESERVATIONS_HREF } from "@/lib/site";

/**
 * The reservations link is a button rather than a nav item, so it carries the
 * active state for /reservations itself.
 */
export function ReserveButton({
  size = "md",
  className,
  onNavigate,
}: {
  size?: "md" | "lg";
  className?: string;
  onNavigate?: () => void;
}) {
  const isActive = usePathname() === RESERVATIONS_HREF;

  return (
    <Button
      href={RESERVATIONS_HREF}
      size={size}
      variant={isActive ? "outline" : "primary"}
      className={className}
      aria-current={isActive ? "page" : undefined}
      onClick={onNavigate}
    >
      Reserve a Table
    </Button>
  );
}
