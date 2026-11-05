import Mascot from "@/ui/Mascot";

export default function Loading({ text, progress }: { text: string; progress?: number }) {
  return (
    <div className="screen loading">
      <Mascot mood="thinking" size={150} />
      <h2>{text}</h2>
      <div className="progress">
        <div className="progress-fill" style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} />
      </div>
      {progress !== undefined && <p className="muted">{Math.round(progress * 100)}%</p>}
    </div>
  );
}
