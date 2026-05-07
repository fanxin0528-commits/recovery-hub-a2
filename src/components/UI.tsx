import type { ReactNode } from 'react';
import { PixelIcon, type PixelIconName } from './PixelIcon';

type PanelProps = {
  title: string;
  icon: PixelIconName;
  children: ReactNode;
  className?: string;
  edgeAction?: ReactNode;
};

export function Panel({ title, icon, children, className = '', edgeAction }: PanelProps) {
  return (
    <section className={`pixel-panel ${className}`}>
      <div className="panel-strip">
        <PixelIcon name={icon} size={24} />
        <span>{title}</span>
      </div>
      <div className="panel-body">{children}</div>
      {edgeAction ? <div className="edge-action">{edgeAction}</div> : null}
    </section>
  );
}

type ButtonProps = {
  icon: PixelIconName;
  children: ReactNode;
  onClick?: () => void;
  to?: string;
  variant?: 'primary' | 'secondary';
  type?: 'button' | 'submit';
};

export function PixelButton({ icon, children, onClick, to, variant = 'primary', type = 'button' }: ButtonProps) {
  const className = `pixel-button ${variant === 'secondary' ? 'secondary' : ''}`;
  const content = (
    <>
      <PixelIcon name={icon} size={19} light={variant === 'primary'} />
      <span>{children}</span>
    </>
  );
  if (to) {
    return (
      <a className={className} href={to} onClick={onClick}>
        {content}
      </a>
    );
  }
  return (
    <button className={className} type={type} onClick={onClick}>
      {content}
    </button>
  );
}

export function Tag({ icon, children }: { icon: PixelIconName; children: ReactNode }) {
  return (
    <span className="tag">
      <PixelIcon name={icon} size={17} />
      <span>{children}</span>
    </span>
  );
}

export function Row({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="data-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function ListItem({ icon, title, meta, href }: { icon: PixelIconName; title: ReactNode; meta?: ReactNode; href?: string }) {
  const inner = (
    <>
      <PixelIcon name={icon} size={24} />
      <span>
        <strong>{title}</strong>
        {meta ? <small>{meta}</small> : null}
      </span>
    </>
  );
  return href ? <a className="list-item" href={href}>{inner}</a> : <div className="list-item">{inner}</div>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="empty-state">{children}</p>;
}
