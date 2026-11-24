"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, type FormEvent } from "react"
import { Activity, Bell, CalendarDays, CheckCircle2, Home, Moon, Plus, Sun, Target, Waves, X, BarChart3, ArrowRight, Sparkles, Clock3 } from "lucide-react"
import { LifePilotProvider, useLifePilot } from "@/components/lifepilot-context"
import { Dashboard } from "@/components/lifepilot-dashboard"
import { categories, type TaskCategory } from "@/lib/lifepilot"
import { type TaskOccurrence } from "@/lib/api"
import { AlarmOverlay } from "@/components/alarm-overlay"
import { TaskExecutionModal } from "@/components/task-execution-modal"

const navigation = [
  { href: "/", label: "Home", icon: Home },
  { href: "/planner", label: "Planner", icon: CalendarDays },
  { href: "/routines", label: "Routines", icon: Waves },
  { href: "/focus", label: "Focus", icon: Target },
  { href: "/reports", label: "Reports", icon: BarChart3 },
]

const titles: Record<string, string> = {
  "/": "Home", "/planner": "Daily planner", "/routines": "Routine library",
  "/focus": "Focus", "/reports": "Your progress", "/profile": "Profile & settings",
}

export default function LifePilotApp({ children }: { children: React.ReactNode }) {
  return <LifePilotProvider><LifePilotFrame>{children}</LifePilotFrame></LifePilotProvider>
}

function LifePilotFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { theme, setTheme, addTaskOpen, closeAddTask, addTask, notice, settings, notify } = useLifePilot()
  const [taskName, setTaskName] = useState("")
  const [taskTime, setTaskTime] = useState("3:00 PM")
  const [taskDuration, setTaskDuration] = useState(30)
  const [taskCategory, setTaskCategory] = useState<TaskCategory>("Personal")
  const [activeExecutionOccurrence, setActiveExecutionOccurrence] = useState<TaskOccurrence | null>(null)

  const submitTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!taskName.trim()) return
    addTask({ title: taskName.trim(), time: taskTime, category: taskCategory, durationMinutes: taskDuration })
    setTaskName("")
  }

  return <div className="app-shell">
    <aside className="desktop-sidebar">
      <Link href="/" className="brand-lockup" aria-label="LifePilot home"><span className="brand-symbol"><Waves size={19}/></span><span className="brand-word">life<span>pilot</span><small>YOUR DAY, IN FLOW</small></span></Link>
      <div className="sidebar-label">YOUR SPACE</div>
      <nav className="sidebar-navigation" aria-label="Primary navigation">{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`sidebar-link ${pathname === href ? "is-active" : ""}`} aria-current={pathname === href ? "page" : undefined}><Icon size={18}/><span>{label}</span>{pathname === href && <i/>}</Link>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-quote"><span className="quote-symbol">“</span><p>Progress isn&apos;t a perfect day. It&apos;s showing up again.</p><span className="quote-caption">A NOTE TO YOURSELF</span></div><Link href="/profile" className="account-link"><span className="user-avatar">{settings.name ? settings.name.trim().split(/\s+/).map(s => s[0]).slice(0,2).join("").toUpperCase() : "LP"}</span><span><strong>{settings.name || "Your workspace"}</strong><small>Personal workspace</small></span><Activity size={17}/></Link></div>
    </aside>

    <div className="app-main">
      <header className="app-header">
        <Link href="/" className="mobile-brand" aria-label="LifePilot home"><span className="brand-symbol"><Waves size={17}/></span><span>life<span>pilot</span></span></Link>
        <div className="desktop-page-label"><span>LifePilot</span><i>/</i><strong>{titles[pathname] ?? "Home"}</strong></div>
        <div className="header-actions"><button className="header-icon-button" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}</button><button className="header-icon-button notification-button" aria-label="Notifications" onClick={() => notify("You’re all caught up.")}><Bell size={18}/><i/></button><Link href="/profile" className="user-avatar avatar-small" aria-label="Open profile settings">{settings.name ? settings.name.trim().split(/\s+/).map(s => s[0]).slice(0,2).join("").toUpperCase() : "LP"}</Link></div>
      </header>
      <main className="page-content">{pathname === "/" ? <Dashboard/> : children}</main>
      <footer className="app-footer"><span>LifePilot</span><span>Your day stays yours · Saved on this device</span></footer>
    </div>

    <nav className="mobile-navigation" aria-label="Primary navigation">{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={pathname === href ? "mobile-nav-link is-active" : "mobile-nav-link"} aria-current={pathname === href ? "page" : undefined}><Icon size={19}/><span>{label}</span></Link>)}</nav>

    {addTaskOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeAddTask() }}><section className="task-dialog" role="dialog" aria-modal="true" aria-labelledby="task-dialog-title"><div className="dialog-header"><div><p className="eyebrow">A SMALL NEXT STEP</p><h2 id="task-dialog-title">Add to your day</h2></div><button className="header-icon-button" onClick={closeAddTask} aria-label="Close add task dialog"><X size={18}/></button></div><form onSubmit={submitTask}><label htmlFor="task-name">What would you like to do?</label><input id="task-name" autoFocus required value={taskName} onChange={event => setTaskName(event.target.value)} placeholder="Give it a clear, kind name"/><div className="dialog-fields"><div><label htmlFor="task-time">Time</label><input id="task-time" value={taskTime} onChange={event => setTaskTime(event.target.value)} aria-label="Scheduled time, for example 3:00 PM"/></div><div><label htmlFor="task-duration">Duration</label><select id="task-duration" value={taskDuration} onChange={event => setTaskDuration(Number(event.target.value))}><option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option><option value={90}>90 min</option></select></div></div><label htmlFor="task-category">Category</label><select id="task-category" value={taskCategory} onChange={event => setTaskCategory(event.target.value as TaskCategory)}>{categories.map(category => <option key={category} value={category}>{category}</option>)}</select><button className="button button-primary dialog-submit" type="submit"><Plus size={17}/>Add task</button><p className="dialog-note">Saved to this device. You can mark it complete from your plan.</p></form></section></div>}
    {notice && <div className="toast-message" role="status"><CheckCircle2 size={17}/>{notice}</div>}

    {/* App-Wide Foreground Alarm Overlay Engine */}
    <AlarmOverlay
      onStartRoutine={(occ) => setActiveExecutionOccurrence(occ)}
      notify={notify}
    />

    {/* App-Wide Step-by-Step Activity Runner */}
    {activeExecutionOccurrence && (
      <TaskExecutionModal
        occurrence={activeExecutionOccurrence}
        onClose={() => setActiveExecutionOccurrence(null)}
        onUpdated={(updated) => setActiveExecutionOccurrence(updated)}
        notify={notify}
      />
    )}
  </div>
}


/** Preview page for feature routes that are not implemented yet.
 *  Accepts serializable icon keys from Server Components.
 */
export function FeaturePage({
  title, eyebrow, description, icon, bullets,
}: {
  title: string
  eyebrow: string
  description: string
  icon: "focus" | "calendar" | "reports" | "routines"
  bullets: string[]
}) {
  const Icon = { focus: Target, calendar: CalendarDays, reports: BarChart3, routines: Waves }[icon]

  return (
    <div className="feature-page">
      <section className="feature-hero">
        <span className="feature-icon"><Icon size={24} aria-hidden="true" /></span>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <span className="preview-badge">FEATURE PREVIEW</span>
      </section>
      <div className="feature-layout">
        <section className="feature-primary section-card">
          <p className="eyebrow">COMING IN THE NEXT PHASE</p>
          <h2>Built for your everyday rhythm</h2>
          <p>This section is a preview. The next development steps will add real functionality.</p>
          <div className="feature-checklist">
            {bullets.map((bullet) => (
              <div key={bullet}>
                <span><CheckCircle2 size={13} aria-hidden="true" /></span>
                {bullet}
              </div>
            ))}
          </div>
          <Link href="/" className="button button-primary"><ArrowRight size={16}/> Back to dashboard</Link>
        </section>
        <aside className="feature-note">
          <span className="note-icon"><Sparkles size={18} aria-hidden="true" /></span>
          <strong>One step at a time</strong>
          <p>Keep planning and recording activities from the dashboard while we build this module.</p>
          <Link href="/profile">Personalize your settings <ArrowRight size={14}/></Link>
        </aside>
      </div>
    </div>
  )
}
