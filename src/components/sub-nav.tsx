import Link from "next/link";
import type { ReactNode } from "react";

/** DESIGN.md sub-nav-frosted: sticky 52px, parchment @80% + saturate(180%) blur(20px). */
export function SubNav({ title, links = [], cta }: {
  title: string;
  links?: { href: string; label: string; current?: boolean }[];
  cta?: ReactNode;
}) {
  return (
    <div className="sub-nav">
      <div className="inner">
        <div className="title">{title}</div>
        <div className="right">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="sublink" aria-current={l.current ? "page" : undefined}>{l.label}</Link>
          ))}
          {cta}
        </div>
      </div>
    </div>
  );
}
