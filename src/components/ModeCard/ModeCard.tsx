import "./ModeCard.css";

interface ModeCardProps {
  icon: string;
  title: string;
  description: string;
  onSelect: () => void;
}

export function ModeCard({ icon, title, description, onSelect }: ModeCardProps) {
  return (
    <button type="button" className="mode-card" onClick={onSelect}>
      <span className="mode-card__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="mode-card__title">{title}</span>
      <span className="mode-card__desc">{description}</span>
      <span className="mode-card__cta">Play ▶</span>
    </button>
  );
}
