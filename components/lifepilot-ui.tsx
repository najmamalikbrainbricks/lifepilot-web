import type { ReactNode } from "react"
import { Check } from "lucide-react"

export function ProgressRing({ value, size = 92, stroke = 8, label, color = "var(--accent-cyan)", children, className = "" }: { value: number; size?: number; stroke?: number; label: string; color?: string; children?: ReactNode; className?: string }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(100, Math.max(0, value))
  return <div className={`progress-ring ${className}`} role="img" aria-label={`${label}: ${Math.round(progress)}%`} style={{ width: size, height: size }}>
    <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle className="ring-track" cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke}/>
      <circle className="ring-value" cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress / 100)} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}/>
    </svg>
    <span className="ring-center">{children ?? <><strong>{Math.round(progress)}%</strong><small>{label}</small></>}</span>
  </div>
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action && <div className="page-heading-action">{action}</div>}</div>
}

export function SectionHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return <div className="section-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>{action}</div>
}

export function MetricCard({ icon, label, value, caption, tone = "cyan" }: { icon: ReactNode; label: string; value: string; caption: string; tone?: string }) {
  return <article className="metric-card"><span className={`metric-icon tone-${tone}`}>{icon}</span><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-caption">{caption}</span></article>
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "live" | "preview" }) {
  return <span className={`status-badge badge-${tone}`}>{tone === "success" && <Check size={12}/>} {children}</span>
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon">{icon}</span><h3>{title}</h3><p>{description}</p>{action}</div>
}
