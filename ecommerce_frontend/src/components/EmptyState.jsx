import { useId } from 'react';
import { Link } from 'react-router';
import './EmptyState.css';

function StateAction({ action, secondary = false }) {
  const className = `empty-state-action ${secondary ? 'button-secondary' : 'button-primary'}`;
  return action.to
    ? <Link className={className} to={action.to}>{action.label}</Link>
    : <button className={className} type="button" onClick={action.onClick}>{action.label}</button>;
}

export function EmptyState({ icon = 'bag', eyebrow, title, description, primaryAction, secondaryAction, role }) {
  const titleId = useId();
  const icons = {
    bag: <><rect x="31" y="39" width="58" height="57" rx="9" /><path d="M45 42V31a15 15 0 0 1 30 0v11M45 62c3 8 9 12 15 12s12-4 15-12" /></>,
    cart: <><path d="M22 32h12l10 43h42l10-31H37M46 86h1M82 86h1" /><circle cx="47" cy="87" r="5" /><circle cx="82" cy="87" r="5" /></>,
    orders: <><path d="m29 43 31-16 31 16v36L60 96 29 79ZM29 43l31 17 31-17M60 60v36M44 35l31 17v13" /></>,
  };

  return (
    <section className="empty-state" aria-labelledby={titleId} role={role}>
      <div className="empty-state-art" aria-hidden="true">
        <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="60" cy="60" r="55" fill="#eaf5ee" stroke="none" />
          <circle cx="15" cy="31" r="4" fill="#badbc6" stroke="none" />
          <circle cx="105" cy="87" r="5" fill="#badbc6" stroke="none" />
          {icons[icon] || icons.bag}
        </svg>
      </div>
      {eyebrow && <span className="empty-state-eyebrow">{eyebrow}</span>}
      <h2 id={titleId}>{title}</h2>
      <p className="empty-state-description">{description}</p>
      {(primaryAction || secondaryAction) && (
        <div className="empty-state-actions">
          {primaryAction && <StateAction action={primaryAction} />}
          {secondaryAction && <StateAction action={secondaryAction} secondary />}
        </div>
      )}
    </section>
  );
}
