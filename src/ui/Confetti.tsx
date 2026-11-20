const COLORS = ["#0fa3a3", "#ff6b6b", "#ffc93c", "#22c58b", "#22c7e8"];

/** Falling colored blocks, pure CSS. Place inside a positioned container. */
export default function Confetti() {
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: 28 }, (_, i) => (
        <span
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: COLORS[i % COLORS.length],
            animationDelay: `${(i % 7) * 0.12}s`,
            animationDuration: `${1.6 + (i % 5) * 0.25}s`,
          }}
        />
      ))}
    </div>
  );
}
