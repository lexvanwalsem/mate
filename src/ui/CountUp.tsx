import { useEffect, useState } from "react";

interface Props {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

/** A number that counts up to its value with an ease-out curve (shows the final value at once for reduced motion). */
export default function CountUp({ value, decimals = 0, prefix = "", suffix = "" }: Props) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const duration = 700;
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setShown(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{prefix}{shown.toFixed(decimals)}{suffix}</>;
}
