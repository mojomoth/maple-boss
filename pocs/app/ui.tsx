// Shared by the server page and the client components: the sprite crop and the page's one icon set.
import type { Character } from "@/lib/types";

// Nexon sprites are a 300px canvas with the character small in the middle; .sprite crops and zooms it.
export function Sprite({ c, size }: { c: Pick<Character, "name" | "imageUrl">; size: "card" | "member" | "preview" | "row" }) {
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

const Icon = ({ d, size = 20, fill = "none", sw = 2 }: { d: string; size?: number; fill?: string; sw?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} fillRule="evenodd" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d={d} />
  </svg>
);

export const SearchIcon = () => <Icon size={22} d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15ZM16 16l5 5" />;
export const PinIcon = () => <Icon size={15} fill="currentColor" sw={0} d="M12 22s-7.5-6.6-7.5-12.3a7.5 7.5 0 0 1 15 0C19.5 15.4 12 22 12 22ZM12 12.5a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6Z" />;
export const SwordsIcon = () => <Icon size={16} d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5L18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2" />;
export const CrownIcon = () => (
  <Icon size={28} fill="currentColor" d="M4.5 18.5h15L21 9l-4.8 3.6L12 6.5l-4.2 6.1L3 9l1.5 9.5ZM3 6.4a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8ZM12 2.8a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8ZM21 6.4a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Z" />
);
export const PeopleIcon = ({ size = 18 }: { size?: number }) => (
  <Icon size={size} d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6M16 4.3a3.5 3.5 0 0 1 0 6.4M18.5 14.3c1.8.7 3 2.9 3 5.7" />
);
// One per boss fact, in the draft's mint line style.
export const LevelIcon = () => <Icon d="M6 12l6-6 6 6M6 18l6-6 6 6" />;
export const HeartIcon = () => <Icon d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20Z" />;
export const ShieldIcon = () => <Icon d="M12 3l7.5 3v5.5c0 4.4-3.1 7.9-7.5 9.5-4.4-1.6-7.5-5.1-7.5-9.5V6L12 3Z" />;
export const BoltIcon = () => <Icon d="M13 2.5L4.5 13.5H11l-1 8 8.5-11H12l1-8Z" />;
export const TrashIcon = () => <Icon size={38} d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />;
export const CloseIcon = ({ size = 24 }: { size?: number }) => <Icon size={size} d="M6 6l12 12M18 6L6 18" />;
