"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Activity,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Footprints,
  Moon,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  Waves,
  Play,
  RotateCcw,
} from "lucide-react"
import { prayerTimes } from "@/lib/lifepilot"
import { useLifePilot } from "@/components/lifepilot-context"
import { MetricCard, ProgressRing, SectionHeader, StatusBadge } from "@/components/lifepilot-ui"
import {
  type DailyReport,
  type TaskOccurrence,
  type PrayerTimesResponse,
  type AccountabilitySummary,
  fetchDailyReport,
  fetchPrayerTimes,
  recordPrayerCompletion,
  ensureAuthenticatedUser,
  completeOccurrence,
  startOccurrence,
  fetchDueAlarms,
  fetchAccountabilitySummary,
} from "@/lib/api"
import { TaskExecutionModal } from "@/components/task-execution-modal"

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(date)

export function Dashboard() {
  const {
    tasks: localTasks,
    completedTasks: localCompleted,
    completionPercent: localPercent,
    now,
    focusSecondsToday,
    openAddTask,
    notify,
    settings,
  } = useLifePilot()

  const [report, setReport] = useState<DailyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeExecutionOccurrence, setActiveExecutionOccurrence] = useState<TaskOccurrence | null>(null)
  const [dueAlarms, setDueAlarms] = useState<TaskOccurrence[]>([])
  const [accountability, setAccountability] = useState<AccountabilitySummary | null>(null)

  const loadReport = async () => {
    try {
      await ensureAuthenticatedUser()
      const [data, alarms, acc] = await Promise.allSettled([
        fetchDailyReport(),
        fetchDueAlarms(),
        fetchAccountabilitySummary(),
      ])

      if (data.status === "fulfilled") {
        setReport(data.value)
      }
      if (alarms.status === "fulfilled") {
        setDueAlarms(alarms.value.due_alarms || [])
      }
      if (acc.status === "fulfilled") {
        setAccountability(acc.value)
      }
    } catch (err) {
      console.warn("Unable to load daily report from API, using local fallback:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [])

  const hour = now.getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const dateLabel = formatDate(now)

  // Use real database values if available, fallback to local prototype
  const occurrences = report?.occurrences || []
  const hasRealOccurrences = occurrences.length > 0

  const totalTasks = hasRealOccurrences ? report!.summary.total_routines : localTasks.length
  const completedTasks = hasRealOccurrences ? report!.summary.completed : localCompleted
  const pendingTasks = hasRealOccurrences ? report!.summary.pending : totalTasks - completedTasks
  const completionPercent = hasRealOccurrences ? report!.summary.completion_percent : localPercent

  const currentTask = report?.current_task || (localTasks.find((t) => t.status === "in-progress") as any)
  const nextTask = report?.next_task || (localTasks.find((t) => t.status === "upcoming") as any)

  const focusGoalMinutes = report?.summary?.focus_goal_minutes || settings.focusGoalMinutes || 60
  const focusMinutes = Math.floor(focusSecondsToday / 60)

  // Toggle or execute occurrence
  const handleToggleOccurrence = async (occ: TaskOccurrence) => {
    try {
      if (occ.status === "completed" || occ.status === "partially_completed") {
        notify(`"${occ.routine?.title || "Task"}" is already completed today`)
      } else if (occ.status === "in_progress") {
        // Complete it
        await completeOccurrence(occ.id, true)
        notify(`Completed "${occ.routine?.title || "Task"}"`)
        loadReport()
      } else {
        // Start it and open execution runner
        const res = await startOccurrence(occ.id)
        setActiveExecutionOccurrence(res.occurrence)
        loadReport()
      }
    } catch (err: any) {
      notify(err.message || "Failed to update task")
    }
  }

  return (
    <div className="dashboard-page">
      <section className="dashboard-welcome">
        <div>
          <div className="welcome-date">
            <CalendarDays size={14} />
            {dateLabel}
          </div>
          <h1>
            {greeting}, <span>{settings.name ? settings.name.split(" ")[0] : "friend"}</span>
          </h1>
          <p>Your day, with real database rhythms &amp; intention.</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link href="/reports" className="button button-secondary" style={{ padding: "0.6rem 0.9rem", fontSize: "0.85rem" }}>
            <ShieldCheck size={16} /> Reports &amp; Proofs
          </Link>
          <Link href="/routines" className="button button-secondary" style={{ padding: "0.6rem 0.9rem", fontSize: "0.85rem" }}>
            <Waves size={16} /> Routine Builder
          </Link>
          <button className="button button-primary welcome-add" onClick={openAddTask}>
            <Plus size={17} />
            <span>Add task</span>
          </button>
        </div>
      </section>

      {/* Due Alarms Banner */}
      {dueAlarms.length > 0 && (
        <section
          className="surface-card"
          style={{
            border: "1px solid rgba(245, 158, 11, 0.4)",
            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(13, 17, 23, 0.95) 100%)",
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
            borderRadius: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "rgba(245, 158, 11, 0.2)",
                color: "#fbbf24",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bell size={20} className="animate-pulse" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <strong style={{ color: "#fff", fontSize: "0.95rem" }}>
                  {dueAlarms[0].routine?.title || "Upcoming Routine"} is Due
                </strong>
                <StatusBadge tone="live">ALARM READY</StatusBadge>
              </div>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--foreground-muted)" }}>
                {dueAlarms.length > 1
                  ? `${dueAlarms.length} routines have pending alarms waiting for acknowledgment.`
                  : "Scheduled routine alarm is active. Open runner to verify steps."}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="button button-primary"
              style={{ padding: "0.55rem 1.1rem", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
              onClick={() => setActiveExecutionOccurrence(dueAlarms[0])}
            >
              <Play size={15} fill="currentColor" /> Open Runner
            </button>
          </div>
        </section>
      )}

      {/* Overview Ring & Summary */}
      <section className="overview-card" aria-label="Daily overview">
        <div className="overview-copy">
          <StatusBadge tone="live">TODAY&apos;S FLOW · DATABASE BACKED</StatusBadge>
          <h2>
            Make today<br />
            <span>count for you.</span>
          </h2>
          <p>Small steps build a rhythm that lasts.</p>
          <div className="overview-meta">
            <span>
              <CheckCircle2 size={15} />
              {completedTasks} of {totalTasks} routines completed
            </span>
            <span>{pendingTasks} still ahead</span>
          </div>
        </div>
        <ProgressRing
          value={completionPercent}
          size={134}
          stroke={9}
          label="daily progress"
          className="overview-ring"
          color="var(--accent-teal)"
        >
          <strong>{completionPercent}%</strong>
          <small>today</small>
        </ProgressRing>
        <span className="overview-glow" aria-hidden="true" />
        <span className="overview-orb overview-orb-one" aria-hidden="true" />
        <span className="overview-orb overview-orb-two" aria-hidden="true" />
      </section>

      {/* Metric Cards */}
      <section className="metric-grid" aria-label="Daily metrics">
        <MetricCard
          icon={<Timer size={17} />}
          label="Focus"
          value={`${focusMinutes}m`}
          caption="Tracked in LifePilot"
          tone="blue"
        />
        <MetricCard
          icon={<ShieldCheck size={17} />}
          label="Accountability"
          value={accountability ? `${accountability.metrics.completion_rate}%` : "100%"}
          caption={accountability ? `${accountability.metrics.verified_completions} verified proofs` : "No proofs submitted"}
          tone="teal"
        />
        <MetricCard
          icon={<Moon size={17} />}
          label="Sleep"
          value="7h 24m"
          caption="Illustrative demo"
          tone="violet"
        />
        <MetricCard
          icon={<Waves size={17} />}
          label="Routines"
          value={`${completedTasks} / ${totalTasks}`}
          caption="Real database occurrences"
          tone="amber"
        />
      </section>

      <div className="dashboard-layout">
        <div className="dashboard-main-column">
          {/* Active Activity Card */}
          <section className="surface-card activity-card">
            <SectionHeader
              eyebrow="RIGHT NOW"
              title="Current activity"
              action={
                <StatusBadge tone={currentTask ? "live" : "neutral"}>
                  {currentTask ? "IN PROGRESS" : "READY WHEN YOU ARE"}
                </StatusBadge>
              }
            />
            <div className="activity-feature">
              <span className="activity-art">
                <Target size={22} />
              </span>
              <div className="activity-details">
                <strong>
                  {currentTask?.routine?.title || currentTask?.title || "Make space for what matters"}
                </strong>
                <span>
                  {currentTask
                    ? `${currentTask.routine?.category || currentTask.category || "Routine"} · ${
                        currentTask.routine?.estimated_duration || currentTask.durationMinutes || 15
                      } min planned`
                    : "No routine currently in progress"}
                </span>
              </div>
              {currentTask?.id && (
                <button
                  className="icon-action"
                  aria-label="Open task execution runner"
                  onClick={() => setActiveExecutionOccurrence(currentTask)}
                  title="Open execution runner"
                >
                  <ArrowUpRight size={17} />
                </button>
              )}
            </div>
            {currentTask?.id && (
              <div style={{ padding: "0 1.25rem 0.75rem 1.25rem" }}>
                <button
                  className="button button-primary"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.6rem",
                    padding: "0.7rem 1.2rem",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
                    boxShadow: "0 4px 14px rgba(6, 182, 212, 0.25)",
                  }}
                  onClick={() => setActiveExecutionOccurrence(currentTask)}
                >
                  <Play size={16} fill="currentColor" />
                  Continue Active Routine
                </button>
              </div>
            )}
            <div className="activity-footer">
              <span className="muted-inline">
                <Clock3 size={14} />
                {currentTask ? "In progress · Steps tracked" : "Pick one small next step"}
              </span>
              <button
                className="text-action"
                onClick={() => {
                  if (currentTask?.id) {
                    setActiveExecutionOccurrence(currentTask)
                  } else {
                    openAddTask()
                  }
                }}
              >
                {currentTask ? "View Active Steps" : "Choose an activity"}
                <ChevronRight size={15} />
              </button>
            </div>
          </section>

          {/* Today's Schedule List */}
          <section className="surface-card schedule-card">
            <SectionHeader
              eyebrow="YOUR DAY"
              title="Today&apos;s routines &amp; plan"
              action={
                <Link className="text-action" href="/routines">
                  Routine Builder <ChevronRight size={15} />
                </Link>
              }
            />

            {hasRealOccurrences ? (
              <div className="schedule-list">
                {occurrences.slice(0, 6).map((occ, index) => {
                  const completed =
                    occ.status === "completed" || occ.status === "partially_completed"
                  const inProgress = occ.status === "in_progress"
                  const title = occ.routine?.title || "Routine"
                  const category = occ.routine?.category || "Personal"
                  const duration = occ.routine?.estimated_duration || 15
                  const stepsCount = occ.routine?.steps?.length || 0

                  // Format due_at
                  const timeLabel = occ.due_at
                    ? new Date(occ.due_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                    : "09:00 AM"

                  return (
                    <article
                      key={occ.id}
                      className={`schedule-row ${completed ? "schedule-row-done" : ""}`}
                    >
                      <time>{timeLabel}</time>
                      <div
                        className={`schedule-timeline-marker marker-${category.toLowerCase()}`}
                      >
                        {completed ? <Check size={13} /> : <span />}
                        {index !== Math.min(occurrences.length, 6) - 1 && <i />}
                      </div>
                      <div className="schedule-row-body">
                        <div className="schedule-row-title">
                          <strong
                            style={{ cursor: "pointer" }}
                            onClick={() => setActiveExecutionOccurrence(occ)}
                          >
                            {title}
                          </strong>
                          <button
                            className={`task-toggle ${completed ? "task-toggle-done" : ""}`}
                            onClick={() => handleToggleOccurrence(occ)}
                            aria-label={`Toggle: ${title}`}
                          >
                            {completed ? (
                              <CheckCircle2 size={18} />
                            ) : inProgress ? (
                              <Play size={16} style={{ color: "var(--primary)" }} />
                            ) : (
                              <Circle size={18} />
                            )}
                          </button>
                        </div>
                        <div className="schedule-row-meta">
                          <span>{category}</span>
                          <span className="meta-dot" />
                          <span>{duration} min</span>
                          {stepsCount > 0 && (
                            <>
                              <span className="meta-dot" />
                              <span>{stepsCount} steps</span>
                            </>
                          )}
                          {inProgress && (
                            <>
                              <span className="meta-dot" />
                              <span style={{ color: "var(--primary)", fontWeight: 600 }}>
                                IN PROGRESS
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : localTasks.length > 0 ? (
              <div className="schedule-list">
                {localTasks.slice(0, 5).map((task, index) => {
                  const completed = task.status === "completed"
                  return (
                    <article
                      key={task.id}
                      className={`schedule-row ${completed ? "schedule-row-done" : ""}`}
                    >
                      <time>{task.time}</time>
                      <div className={`schedule-timeline-marker marker-${task.category.toLowerCase()}`}>
                        {completed ? <Check size={13} /> : <span />}
                        {index !== Math.min(localTasks.length, 5) - 1 && <i />}
                      </div>
                      <div className="schedule-row-body">
                        <div className="schedule-row-title">
                          <strong>{task.title}</strong>
                          <button
                            className={`task-toggle ${completed ? "task-toggle-done" : ""}`}
                            onClick={() => notify("Task updated locally")}
                          >
                            {completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                          </button>
                        </div>
                        <div className="schedule-row-meta">
                          <span>{task.category}</span>
                          <span className="meta-dot" />
                          {task.durationMinutes} min
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="empty-inline">
                <p>Your schedule is open. Build a routine to get started.</p>
                <Link href="/routines" className="text-action">
                  Open Routine Builder <ChevronRight size={15} />
                </Link>
              </div>
            )}
          </section>
        </div>

        {/* Side Column */}
        <div className="dashboard-side-column">
          {/* Agency Focus Promo */}
          <section className="focus-promo">
            <div className="focus-promo-top">
              <span className="icon-tile icon-tile-cyan">
                <Target size={18} />
              </span>
              <StatusBadge tone="neutral">{focusGoalMinutes} MIN GOAL</StatusBadge>
            </div>
            <p className="eyebrow">AGENCY FOCUS</p>
            <h2>
              One thing.<br />
              <span>All your attention.</span>
            </h2>
            <p className="focus-copy">A calmer space for the work that matters.</p>
            <div className="focus-progress-row">
              <span className="focus-progress-track">
                <span
                  style={{
                    width: `${Math.min(100, (focusMinutes / Math.max(1, focusGoalMinutes)) * 100)}%`,
                  }}
                />
              </span>
              <strong>
                {focusMinutes}
                <small> / {focusGoalMinutes} min</small>
              </strong>
            </div>
            <Link href="/focus" className="button button-focus">
              <Target size={16} />
              Start a focus session
              <ChevronRight size={15} />
            </Link>
            <Sparkles className="promo-sparkle" size={19} aria-hidden="true" />
          </section>

          {/* Next Up Card */}
          <section className="surface-card next-card">
            <SectionHeader eyebrow="COMING UP" title="Next on your plan" />
            <div className="next-event-icon">
              <CalendarDays size={17} />
            </div>
            {nextTask ? (
              <>
                <h3>{nextTask.routine?.title || nextTask.title}</h3>
                <p>
                  {nextTask.routine?.category || nextTask.category || "Routine"} ·{" "}
                  {nextTask.routine?.estimated_duration || nextTask.durationMinutes || 15} min
                </p>
                <div className="next-countdown">
                  <Clock3 size={14} />
                  <span>Ready to begin</span>
                </div>
              </>
            ) : (
              <p className="empty-copy">Your schedule is clear for now.</p>
            )}
          </section>

          {/* Prayer Card */}
          <PrayerCard
            onInfo={() => notify("Prayer times shown here are illustrative, not location-based.")}
          />
        </div>
      </div>

      {/* Health Section (Demonstration sensor values clearly marked) */}
      <section className="health-section">
        <SectionHeader
          eyebrow="BODY &amp; MIND"
          title="A little care goes a long way"
          action={<span className="demo-note">DEMO VALUES</span>}
        />
        <div className="health-grid">
          <HealthCard
            icon={<Footprints size={18} />}
            label="Steps"
            value="4,280"
            note="Illustrative · not sensed"
            tone="teal"
          />
          <HealthCard
            icon={<Activity size={18} />}
            label="Movement"
            value="Walk planned"
            note="Today at 2:30 PM"
            tone="blue"
          />
          <HealthCard
            icon={<Moon size={18} />}
            label="Sleep"
            value="7h 24m"
            note="Illustrative summary"
            tone="violet"
          />
        </div>
      </section>

      {/* Task Execution Modal */}
      {activeExecutionOccurrence && (
        <TaskExecutionModal
          occurrence={activeExecutionOccurrence}
          onClose={() => setActiveExecutionOccurrence(null)}
          onUpdated={(updated) => {
            setActiveExecutionOccurrence(updated)
            loadReport()
          }}
          notify={notify}
        />
      )}
    </div>
  )
}

function PrayerCard({ onInfo }: { onInfo: () => void }) {
  const { notify } = useLifePilot()
  const [data, setData] = useState<PrayerTimesResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const loadTimes = async () => {
    try {
      await ensureAuthenticatedUser()
      const res = await fetchPrayerTimes()
      setData(res)
    } catch (err) {
      console.warn("Could not load live prayer times:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTimes()
  }, [])

  const handleTogglePrayer = async (prayerKey: string) => {
    if (!data) return
    const current = data.completions?.[prayerKey]
    const nextStatus = current?.status === "completed" ? "missed" : "completed"

    try {
      await recordPrayerCompletion(prayerKey, data.date, nextStatus as any)
      notify(`${prayerKey.charAt(0).toUpperCase() + prayerKey.slice(1)} prayer marked as ${nextStatus}`)
      loadTimes()
    } catch (err: any) {
      notify(err.message || "Failed to update prayer status")
    }
  }

  const prayersList = [
    { key: "fajr", name: "Fajr" },
    { key: "dhuhr", name: "Dhuhr" },
    { key: "asr", name: "Asr" },
    { key: "maghrib", name: "Maghrib" },
    { key: "isha", name: "Isha" },
  ]

  const effectiveTimes = data?.effective_times
  const completions = data?.completions || {}
  const overrides = data?.overrides?.by_prayer || {}

  return (
    <section className="surface-card prayer-card">
      <div className="prayer-card-head">
        <div>
          <p className="eyebrow">DAILY PAUSE</p>
          <h2>Prayer times</h2>
        </div>
        <Link
          href="/planner"
          className="icon-action"
          title="Open Daily Planner"
          style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "2px" }}
        >
          <CalendarDays size={14} />
        </Link>
      </div>

      <div style={{ margin: "2px 0 10px", fontSize: "0.75rem", color: "rgba(255,255,255,0.55)" }}>
        {data ? (
          <div>
            <span>{data.location.city} · {data.method.name} ({data.method.asr})</span>
            {data.overrides?.has_any && (
              <span style={{ color: "#38bdf8", display: "block", marginTop: "1px" }}>
                🕌 Mosque timetable override active
              </span>
            )}
          </div>
        ) : (
          <span>Calculated astronomical times</span>
        )}
      </div>

      <div className="prayer-items">
        {prayersList.map((p) => {
          const time = effectiveTimes ? effectiveTimes[p.key as keyof typeof effectiveTimes] : null
          const isDone = completions[p.key]?.status === "completed"
          const hasOverride = overrides[p.key]

          return (
            <div
              key={p.key}
              className={`prayer-item ${isDone ? "prayer-done" : ""}`}
              style={{ cursor: "pointer", transition: "all 0.15s ease" }}
              onClick={() => handleTogglePrayer(p.key)}
              title="Click to toggle completion"
            >
              <span className="prayer-status" style={{ color: isDone ? "#4ade80" : "rgba(255,255,255,0.3)" }}>
                {isDone ? <Check size={12} /> : <span />}
              </span>
              <span>
                {p.name}
                {hasOverride && (
                  <small style={{ marginLeft: "4px", fontSize: "0.65rem", color: "#38bdf8" }}>
                    [override]
                  </small>
                )}
              </span>
              <time>{time || "—"}</time>
            </div>
          )
        })}
      </div>

      {data?.tahajjud?.enabled && (
        <div
          style={{
            marginTop: "10px",
            paddingTop: "8px",
            borderTop: "1px dashed rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.75rem",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          <span>🌙 Tahajjud window:</span>
          <strong style={{ color: "#38bdf8" }}>
            {data.tahajjud.suggested_start} ({data.tahajjud.duration_minutes}m)
          </strong>
        </div>
      )}
    </section>
  )
}

function HealthCard({
  icon,
  label,
  value,
  note,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  note: string
  tone: string
}) {
  return (
    <article className="health-card">
      <span className={`health-icon tone-${tone}`}>{icon}</span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
      {tone === "teal" && (
        <div className="health-sparkline" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      )}
    </article>
  )
}
