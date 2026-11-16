// Shared by the server page and the client components: the sprite crop and the page's one icon set.
import type { Character } from "@/lib/types";

// Nexon sprites are a 300px canvas with the character small in the middle; .sprite crops and zooms it.
export function Sprite({ c, size }: { c: Pick<Character, "name" | "imageUrl">; size: "card" | "member" | "preview" }) {
  return (
    <span className={`sprite sprite--${size}`} aria-hidden="true">
      {c.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote Nexon sprite host, no next/image config needed for a PoC
        <img src={c.imageUrl} alt="" width={300} height={300} />
      ) : (
        <span className="sprite-none">{c.name.slice(0, 1)}</span>
      )}
    </span>
  );
}

const Icon = ({ d, size = 20, fill = "none" }: { d: string; size?: number; fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d={d} />
  </svg>
);

export const SearchIcon = () => <Icon d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15ZM16 16l5 5" />;
export const PinIcon = () => <Icon size={14} d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21ZM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />;
export const CrownIcon = () => <Icon size={24} fill="currentColor" d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z" />;
export const TrashIcon = () => <Icon size={32} d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />;
export const CloseIcon = () => <Icon size={24} d="M6 6l12 12M18 6L6 18" />;
