import { MoveClassification } from "@/types/enums";
import { CLASS_META } from "./classes";

/** Rounded square badge with the class symbol. size 0 means "fill parent" (used on the board). */
export default function ClassBadge({ cls, size = 22 }: { cls: MoveClassification; size?: number }) {
  const m = CLASS_META[cls];
  const style = size ? { width: size, height: size, fontSize: size * 0.5 } : undefined;
  return (
    <span className="class-badge" style={{ background: m.color, ...style }} title={m.label}>
      {m.glyph}
    </span>
  );
}
