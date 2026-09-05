import { Link2 } from "lucide-react";

/** Amber-to-dark-amber rounded square with a link glyph (BrandMark.kt). */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="brand-mark"
      style={{ width: size, height: size, borderRadius: size * 0.28 }}
      aria-hidden="true"
    >
      <Link2 size={Math.round(size * 0.6)} strokeWidth={2.4} />
    </span>
  );
}
