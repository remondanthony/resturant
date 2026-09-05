"use client";

import { useEffect, useRef, useState } from "react";

type Category = { slug: string; name: string };

/**
 * Sticky category rail. Anchor links do the navigating — the only JavaScript
 * here highlights whichever category you are currently reading and keeps that
 * chip in view on narrow screens.
 */
export function MenuCategoryNav({ categories }: { categories: readonly Category[] }) {
  const [active, setActive] = useState(categories[0]?.slug ?? "");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef(new Map<string, HTMLAnchorElement>());

  useEffect(() => {
    const sections = categories
      .map((c) => document.getElementById(c.slug))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    /** The reading line: just below the header and the rail. */
    const readingLine = () => {
      const styles = getComputedStyle(document.documentElement);
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const header = parseFloat(styles.getPropertyValue("--header-h")) * rem || 64;
      const rail = parseFloat(styles.getPropertyValue("--rail-h")) * rem || 52;
      return header + rail + 24;
    };

    // The last section whose top has crossed the reading line is the one being read.
    const update = () => {
      const line = readingLine();
      let current = sections[0].id;
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= line + 8) current = section.id;
      }
      setActive(current);
    };

    // The observer is only a cheap trigger; `update` decides the answer, so a
    // section taller than the viewport still resolves correctly.
    const observer = new IntersectionObserver(update, {
      rootMargin: `-${Math.round(readingLine())}px 0px -55% 0px`,
      threshold: 0,
    });
    sections.forEach((section) => observer.observe(section));
    window.addEventListener("resize", update);
    update();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [categories]);

  // Keep the active chip visible in the horizontal scroller on small screens.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const chip = chipRefs.current.get(active);
    if (!scroller || !chip) return;
    if (scroller.scrollWidth <= scroller.clientWidth) return;

    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollTo({
      left: chip.offsetLeft - scroller.clientWidth / 2 + chip.clientWidth / 2,
      behavior: smooth ? "smooth" : "auto",
    });
  }, [active]);

  return (
    <div className="sticky top-[var(--header-h)] z-40 border-b border-line bg-espresso-950/92 backdrop-blur-md">
      <nav aria-label="Menu categories">
        <div
          ref={scrollerRef}
          className="no-scrollbar mx-auto max-w-[var(--container-page)] overflow-x-auto px-[clamp(1.25rem,5vw,5rem)]"
        >
          <ul className="flex h-[var(--rail-h)] min-w-max items-center gap-1 lg:min-w-0 lg:justify-center">
            {categories.map((category) => {
              const isActive = category.slug === active;
              return (
                <li key={category.slug}>
                  <a
                    href={`#${category.slug}`}
                    ref={(node) => {
                      if (node) chipRefs.current.set(category.slug, node);
                      else chipRefs.current.delete(category.slug);
                    }}
                    aria-current={isActive ? "true" : undefined}
                    className={`relative inline-flex min-h-11 items-center whitespace-nowrap px-4 text-eyebrow font-medium uppercase transition-colors duration-180 ${
                      isActive ? "text-amber-soft" : "text-cream-300 hover:text-cream-50"
                    }`}
                  >
                    {category.name}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-3 bottom-1.5 h-px origin-center bg-amber-glow transition-transform duration-260 ease-out-expo ${
                        isActive ? "scale-x-100" : "scale-x-0"
                      }`}
                    />
                  </a>
                </li>
              );
            })}
            {/* Trailing spacer so the last chip clears the gutter when scrolled. */}
            <li aria-hidden="true" className="w-2 shrink-0 lg:hidden" />
          </ul>
        </div>
      </nav>
    </div>
  );
}
