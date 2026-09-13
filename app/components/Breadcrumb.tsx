import { Link } from "react-router-dom";

export type Crumb = { label: string; to?: string };

/**
 * Trail of links above a screen's heading.
 *
 * The order is the caller's to decide, and it is not always general-to-specific:
 * on your own character sheet the trail reads Dashboard › Character, but when
 * you are looking at someone else's, the character comes first, because the
 * character is the thing you navigated to and the dashboard is the way back to
 * your own.
 */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-shade-ash-dim" aria-hidden="true">›</span>}
            {c.to ? (
              <Link to={c.to} className="text-shade-red-400 hover:text-shade-red-100 transition-colors">
                {c.label}
              </Link>
            ) : (
              <span className="text-shade-red-200 font-semibold" aria-current="page">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
