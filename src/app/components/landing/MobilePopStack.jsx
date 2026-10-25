"use client";

import React, { useEffect, useRef } from "react";

/**
 * Mobile-only stacked cards that pop into view on scroll (staggered).
 * From md breakpoint up, children flow in a normal grid via parent classes.
 */
export function MobilePopStack({ children, className = "" }) {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === "undefined") return;

    const cards = root.querySelectorAll("[data-pop-card]");
    if (!cards.length) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      cards.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            el.classList.add("is-visible");
            window.setTimeout(() => el.classList.add("is-parallax-active"), 720);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );

    cards.forEach((el, index) => {
      el.style.setProperty("--pop-index", String(index));
      observer.observe(el);
    });

    let raf = 0;
    const updateParallax = () => {
      const vh = window.innerHeight;
      cards.forEach((el) => {
        if (!el.classList.contains("is-visible")) return;
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const delta = (center - vh * 0.52) / vh;
        const shift = Math.max(-14, Math.min(14, delta * -32));
        el.style.setProperty("--parallax-y", `${shift.toFixed(1)}px`);
      });
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateParallax);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [children]);

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  );
}

export function MobilePopStackItem({ children, className = "" }) {
  return (
    <div data-pop-card className={`mobile-pop-card ${className}`}>
      {children}
    </div>
  );
}
