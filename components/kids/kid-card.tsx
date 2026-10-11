import Link from "next/link";
import { type Kid } from "@/types/kid";
import { ChevronRightIcon } from "@/components/shared/icons";
import { alertStyles } from "@/data/mock/kids";

function getContrastingTextColor(hexColor: string): string {
  // Remove # if present and parse RGB
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  // Calculate relative luminance (sRGB)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // Return dark text on light backgrounds, light text on dark backgrounds
  return luminance > 0.5 ? "#1F7A93" : "#FFFFFF";
}

function parentsLabel(count: number): string {
  if (count === 0) return "sin padres vinculados";
  return count === 1 ? "1 padre vinculado" : `${count} padres vinculados`;
}

function getColorIndex(id: string | number, palette: string[]): number {
  if (typeof id === "number") {
    return id % palette.length;
  }
  // Hash string UUID to a deterministic color index
  let hash = 0;
  const idStr = String(id);
  for (let i = 0; i < idStr.length; i++) {
    hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % palette.length;
}

function CardBadge({ kid }: { kid: Kid }) {
  if (kid.alerts && kid.alerts.length > 0) {
    return (
      <div className="flex gap-1">
        {kid.alerts.map((tag, index) => {
          const style = alertStyles[tag as keyof typeof alertStyles];
          if (style) {
            return (
              <span
                key={index}
                className="flex rounded-full bg-[var(--bg)] text-[var(--text)] px-[6px] py-[3px] text-[10px] font-semibold"
                style={{ "--bg": style.bg, "--text": style.text } as any}
              >
                {style.label}
              </span>
            );
          }
          // Generic fallback badge for tags not in alertStyles
          return (
            <span
              key={index}
              className="flex rounded-full bg-[var(--bg)] text-[var(--text)] px-[6px] py-[3px] text-[10px] font-semibold"
              style={{ "--bg": "#F3E5F5", "--text": "#7B1FAB" } as any}
            >
              {tag}
            </span>
          );
        })}
      </div>
    );
  }
  return (
    <ChevronRightIcon
      className="h-[18px] w-[18px] flex-none text-[#CBB89F]"
      strokeWidth={2.2}
    />
  );
}

export default function KidCard({ kid }: { kid: Kid }) {
  // Color palette for deterministic avatar colors per child
  const avatarColorPalette = [
    "#A9D9E8",
    "#F4B8CC",
    "#B9DEC4",
    "#F4DC8E",
    "#C9B6E8",
    "#FCE4EC",
    "#E8DAEF",
    "#FFF3E0",
    "#E0F7FA",
    "#F3E5F5",
    "#F8F9FA",
    "#EBF5FB",
  ];

  const colorIndex = getColorIndex(kid.id, avatarColorPalette);
  const determinedColor = avatarColorPalette[colorIndex];
  const textColor = getContrastingTextColor(determinedColor);

  return (
    <Link
      href={`/kids/${kid.id}`}
      className="kid flex min-w-0 items-center gap-[14px] rounded-[18px] border border-border bg-surface p-4 shadow-[0_4px_14px_-12px_rgba(120,90,60,.5)] transition duration-150 hover:-translate-y-0.5 hover:border-[#F2A78E]"
    >
      <span
        className="flex h-12 w-12 flex-none items-center justify-center rounded-full font-heading text-[19px] font-semibold"
        style={{ backgroundColor: determinedColor, color: textColor }}
      >
        {kid.initial}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-heading text-[16px] text-ink">
          {kid.name}
        </span>
        <span className="block text-[13px] text-ink-muted">
          {kid.age || kid.birthDate} · {parentsLabel(kid.parents.length)}
        </span>
      </span>
      <CardBadge kid={kid} />
    </Link>
  );
}