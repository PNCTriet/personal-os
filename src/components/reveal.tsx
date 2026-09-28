"use client";

import { useEffect, useRef, type ElementType, type ReactNode, type CSSProperties } from "react";

/** Fade-and-rise on first entry into the viewport (600ms, DESIGN ease). Reduced motion: shown immediately via CSS. */
export function Reveal({ children, as: Tag = "div", delay = 0, className = "", ...rest }: {
  children: ReactNode; as?: ElementType; delay?: number; className?: string; id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`reveal ${className}`} style={{ "--d": `${delay}ms` } as CSSProperties} {...rest}>
      {children}
    </Tag>
  );
}
