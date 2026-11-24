"use client"

import { useEffect, useState, useMemo } from "react"
import {
  Waves,
  Plus,
  Search,
  Play,
  Edit2,
  Trash2,
  Archive,
  RefreshCw,
  Clock,
  Bell,
  CheckCircle2,
  Filter,
  Check,
  Calendar,
  AlertCircle,
  Pause,
  Layers,
  Sparkles,
} from "lucide-react"
import {
  type Routine,
  type TaskOccurrence,
  fetchRoutines,
  deleteRoutine,
  archiveRoutine,
  unarchiveRoutine,
  updateRoutine,
  startOccurrence,
  fetchOccurrences,
  ensureAuthenticatedUser,
} from "@/lib/api"
import { useLifePilot } from "@/components/lifepilot-context"
import { RoutineBuilderModal } from "@/components/routine-builder-modal"
import { TaskExecutionModal } from "@/components/task-execution-modal"

const CATEGORIES = [
  "All",
  "Spiritual",
  "Health",
  "Fitness",
  "Work",
  "Business",
  "Study",
  "Personal",
  "Sleep",
]

export default function RoutinesPage() {
  const { notify } = useLifePilot()

  const [routines, setRoutines] = useState<Routine[]>([])
  const [meta, setMeta] = useState({ total: 0, active_count: 0, paused_count: 0, archived_count: 0 })
  const [loading, setLoading] = useState(true)
  const [apiOnline, setApiOnline] = useState(true)

  // Filters
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"active" | "paused" | "archived" | "all">("active")
  const [categoryFilter, setCategoryFilter] = useState("All")

  // Modals
  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null)
  const [executionOccurrence, setExecutionOccurrence] = useState<TaskOccurrence | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      await ensureAuthenticatedUser()
      const res = await fetchRoutines({
        status: statusFilter === "all" ? undefined : statusFilter,
        category: categoryFilter === "All" ? undefined : categoryFilter,
        search: search.trim() || undefined,
      })
      setRoutines(res.routines || [])
      setMeta(res.meta || { total: 0, active_count: 0, paused_count: 0, archived_count: 0 })
      setApiOnline(true)
    } catch (err) {
      console.warn("Failed to load routines from API:", err)
      setApiOnline(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [statusFilter, categoryFilter])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleToggleEnabled = async (r: Routine) => {
    try {
      const res = await updateRoutine(r.id, { enabled: !r.enabled })
      notify(res.routine.enabled ? `Resumed "${r.title}"` : `Paused "${r.title}"`)
      loadData()
    } catch {
      notify("Failed to update routine status")
    }
  }

  const handleArchive = async (r: Routine) => {
    try {
      if (r.archived_at) {
        await unarchiveRoutine(r.id)
        notify(`Unarchived "${r.title}"`)
      } else {
        await archiveRoutine(r.id)
        notify(`Archived "${r.title}"`)
      }
      loadData()
    } catch {
      notify("Failed to archive/unarchive routine")
    }
  }

  const handleDelete = async (r: Routine) => {
    if (!window.confirm(`Permanently delete "${r.title}"?`)) return
    try {
      await deleteRoutine(r.id)
      notify(`Deleted "${r.title}"`)
      loadData()
    } catch {
      notify("Failed to delete routine")
    }
  }

  const handleRunNow = async (r: Routine) => {
    try {
      notify(`Preparing "${r.title}"...`)
      // Get today's occurrences or create execution instance
      const occRes = await fetchOccurrences()
      let occ = occRes.occurrences.find((o) => o.routine_id === r.id)

      if (occ) {
        // Start occurrence if not in progress
        if (occ.status !== "in_progress") {
          const started = await startOccurrence(occ.id)
          occ = started.occurrence
        }
        setExecutionOccurrence(occ)
      } else {
        notify("No occurrence scheduled for today. Create or enable a schedule first.")
        setEditingRoutine(r)
        setBuilderOpen(true)
      }
    } catch (err: any) {
      notify(err.message || "Failed to start routine execution")
    }
  }

  return (
    <div className="routines-module-page" style={{ padding: "1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Top Banner / Hero */}
      <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", color: "var(--primary)", textTransform: "uppercase" }}>
              Rhythms That Feel Like You
            </span>
            <span
              style={{
                fontSize: "0.68rem",
                padding: "2px 8px",
                borderRadius: "999px",
                background: apiOnline ? "rgba(116, 199, 195, 0.15)" : "rgba(239, 68, 68, 0.15)",
                color: apiOnline ? "var(--primary)" : "#f87171",
                fontWeight: 600,
              }}
            >
              {apiOnline ? "● API Connected (lifepilot_db)" : "○ Backend Connecting..."}
            </span>
          </div>
          <h1 style={{ fontSize: "2rem", margin: 0, fontWeight: 700, letterSpacing: "-0.03em" }}>
            Smart Routine Builder
          </h1>
          <p style={{ margin: "0.35rem 0 0", color: "var(--muted-foreground)", fontSize: "0.95rem" }}>
            Build repeatable multi-step rhythms with scheduled triggers, verification, and foreground alarms.
          </p>
        </div>

        <button
          type="button"
          className="button button-primary"
          style={{ padding: "0.75rem 1.25rem", fontSize: "0.92rem", gap: "0.5rem" }}
          onClick={() => {
            setEditingRoutine(null)
            setBuilderOpen(true)
          }}
        >
          <Plus size={18} /> Create Routine
        </button>
      </section>

      {/* Stats Bar */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {[
          { label: "Active Routines", count: meta.active_count, tone: "teal" },
          { label: "Paused Routines", count: meta.paused_count, tone: "amber" },
          { label: "Archived", count: meta.archived_count, tone: "violet" },
          { label: "Total Configured", count: meta.total, tone: "blue" },
        ].map((card, i) => (
          <div
            key={i}
            className="surface-card"
            style={{ padding: "1rem 1.25rem", borderRadius: "1rem", background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <span style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", fontWeight: 600 }}>{card.label}</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--foreground)", marginTop: "0.2rem" }}>
              {card.count}
            </div>
          </div>
        ))}
      </section>

      {/* Search & Filters */}
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          marginBottom: "1.5rem",
          background: "var(--card)",
          padding: "1rem",
          borderRadius: "1rem",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          {/* Status Tabs */}
          <div style={{ display: "flex", gap: "0.35rem", background: "var(--muted)", padding: "4px", borderRadius: "0.6rem" }}>
            {(["active", "paused", "archived", "all"] as const).map((s) => (
              <button
                key={s}
                type="button"
                style={{
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  borderRadius: "0.45rem",
                  border: "none",
                  background: statusFilter === s ? "var(--card)" : "transparent",
                  color: statusFilter === s ? "var(--primary)" : "var(--muted-foreground)",
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div style={{ flex: 1, minWidth: "220px", position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search routines or descriptions..."
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem 0.5rem 2.25rem",
                background: "var(--muted)",
                border: "1px solid var(--border)",
                borderRadius: "0.6rem",
                color: "inherit",
                fontSize: "0.85rem",
              }}
            />
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ display: "flex", gap: "0.4rem", overflowX: "auto", paddingBottom: "2px" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              style={{
                padding: "0.3rem 0.8rem",
                fontSize: "0.78rem",
                borderRadius: "999px",
                border: "1px solid",
                borderColor: categoryFilter === cat ? "var(--primary)" : "var(--border)",
                background: categoryFilter === cat ? "rgba(116, 199, 195, 0.15)" : "transparent",
                color: categoryFilter === cat ? "var(--primary)" : "var(--muted-foreground)",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Routine Cards Grid */}
      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted-foreground)" }}>
          <RefreshCw className="animate-spin" size={24} style={{ margin: "0 auto 0.5rem" }} />
          <p>Loading your rhythms from database...</p>
        </div>
      ) : routines.length === 0 ? (
        <div
          className="surface-card"
          style={{
            padding: "3.5rem 1.5rem",
            textAlign: "center",
            borderRadius: "1rem",
            background: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <Waves size={36} style={{ color: "var(--primary)", margin: "0 auto 0.75rem" }} />
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0 0 0.4rem" }}>
            No routines found in this view
          </h3>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.88rem", maxWidth: "420px", margin: "0 auto 1.5rem" }}>
            Create a custom routine or choose from presets like Morning Prayer, Deep Work Sprint, or Evening Reset.
          </p>
          <button
            type="button"
            className="button button-primary"
            onClick={() => {
              setEditingRoutine(null)
              setBuilderOpen(true)
            }}
          >
            <Plus size={16} /> Create your first routine
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {routines.map((r) => {
            const stepsCount = r.steps?.length || 0
            const schedule = r.schedules?.[0]
            const alarm = r.alarm_rule

            return (
              <article
                key={r.id}
                className="surface-card"
                style={{
                  padding: "1.25rem",
                  borderRadius: "1rem",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  opacity: r.enabled ? 1 : 0.7,
                  transition: "all 0.2s ease",
                }}
              >
                <div>
                  {/* Card Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: "rgba(116, 199, 195, 0.15)",
                          color: "var(--primary)",
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}
                      >
                        {r.category}
                      </span>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: "var(--muted)",
                          color: "var(--muted-foreground)",
                          fontWeight: 600,
                          textTransform: "uppercase",
                        }}
                      >
                        {r.priority}
                      </span>
                      {!r.enabled && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            background: "rgba(245, 158, 11, 0.15)",
                            color: "#f59e0b",
                            fontWeight: 600,
                          }}
                        >
                          PAUSED
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button
                        type="button"
                        className="lp-icon-action"
                        onClick={() => {
                          setEditingRoutine(r)
                          setBuilderOpen(true)
                        }}
                        title="Edit Routine"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        className="lp-icon-action"
                        onClick={() => handleToggleEnabled(r)}
                        title={r.enabled ? "Pause routine" : "Resume routine"}
                      >
                        {r.enabled ? <Pause size={15} /> : <Play size={15} />}
                      </button>
                      <button
                        type="button"
                        className="lp-icon-action"
                        onClick={() => handleArchive(r)}
                        title={r.archived_at ? "Unarchive" : "Archive"}
                      >
                        <Archive size={15} />
                      </button>
                      <button
                        type="button"
                        className="lp-icon-action"
                        onClick={() => handleDelete(r)}
                        title="Delete permanently"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 0.35rem", letterSpacing: "-0.01em" }}>
                    {r.title}
                  </h3>
                  {r.description && (
                    <p style={{ fontSize: "0.82rem", color: "var(--muted-foreground)", margin: "0 0 1rem", lineHeight: 1.4 }}>
                      {r.description}
                    </p>
                  )}

                  {/* Meta Chips */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginBottom: "1rem", fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Clock size={14} style={{ color: "var(--primary)" }} />
                      <span>{r.estimated_duration} minutes total</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Layers size={14} style={{ color: "var(--primary)" }} />
                      <span>{stepsCount} steps configured</span>
                    </div>

                    {schedule && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Calendar size={14} style={{ color: "var(--primary)" }} />
                        <span>
                          {schedule.recurrence_type.replace("_", " ")} at {schedule.local_start_time}
                        </span>
                      </div>
                    )}

                    {alarm && alarm.enabled && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Bell size={14} style={{ color: "var(--primary)" }} />
                        <span>
                          Alarm: {alarm.sound.replace(/_/g, " ")} ({alarm.repeat_interval}m repeat)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Steps preview */}
                  {r.steps && r.steps.length > 0 && (
                    <div
                      style={{
                        background: "var(--muted)",
                        borderRadius: "0.6rem",
                        padding: "0.5rem 0.75rem",
                        marginBottom: "1rem",
                        fontSize: "0.78rem",
                      }}
                    >
                      <span style={{ fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: "0.3rem" }}>
                        STEPS:
                      </span>
                      <ol style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--foreground)" }}>
                        {r.steps.slice(0, 3).map((st) => (
                          <li key={st.id || st.title} style={{ margin: "2px 0" }}>
                            {st.title} {st.required ? "" : "(optional)"}
                          </li>
                        ))}
                        {r.steps.length > 3 && (
                          <li style={{ color: "var(--muted-foreground)", listStyleType: "none", marginLeft: "-0.5rem" }}>
                            +{r.steps.length - 3} more steps...
                          </li>
                        )}
                      </ol>
                    </div>
                  )}
                </div>

                {/* Card Action */}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.85rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button
                    type="button"
                    className="button button-primary"
                    style={{ padding: "0.5rem 0.9rem", fontSize: "0.85rem", gap: "6px", width: "100%", justifyContent: "center" }}
                    onClick={() => handleRunNow(r)}
                  >
                    <Play size={14} /> Run / Start Now
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Routine Builder Modal */}
      {builderOpen && (
        <RoutineBuilderModal
          isOpen={builderOpen}
          routine={editingRoutine}
          onClose={() => setBuilderOpen(false)}
          onSaved={() => {
            loadData()
          }}
          notify={notify}
        />
      )}

      {/* Task Execution Modal */}
      {executionOccurrence && (
        <TaskExecutionModal
          occurrence={executionOccurrence}
          onClose={() => setExecutionOccurrence(null)}
          onUpdated={(updated) => {
            setExecutionOccurrence(updated)
            loadData()
          }}
          notify={notify}
        />
      )}
    </div>
  )
}
