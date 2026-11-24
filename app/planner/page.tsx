"use client"

import { useState, useEffect, useMemo } from "react"
import {
  CalendarDays,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Play,
  RotateCcw,
  Plus,
  Briefcase,
  Compass,
  Moon,
  Sun,
  Shield,
  Layers,
  Check,
  X,
  Target,
  RefreshCw,
  ArrowRight,
  HelpCircle,
  Filter,
} from "lucide-react"
import {
  type DailyTimelineResponse,
  type TimelineBlock,
  type ScheduleConflict,
  type FreeSlot,
  type WeeklyCalendarResponse,
  type WeeklyCalendarDay,
  type MonthlyCalendarResponse,
  type TaskOccurrence,
  fetchDailyTimeline,
  fetchWeeklyCalendar,
  fetchMonthlyCalendar,
  recordPrayerCompletion,
  completeOccurrence,
  startOccurrence,
  fetchOccurrence,
  ensureAuthenticatedUser,
} from "@/lib/api"
import { useLifePilot } from "@/components/lifepilot-context"
import { PageHeader, StatusBadge } from "@/components/lifepilot-ui"
import { RescheduleModal } from "@/components/reschedule-modal"
import { SlotSuggestionModal } from "@/components/slot-suggestion-modal"
import { PrayerOverrideModal } from "@/components/prayer-override-modal"
import { TaskExecutionModal } from "@/components/task-execution-modal"

type PlannerView = "daily" | "weekly" | "monthly"

export default function PlannerPage() {
  const { notify } = useLifePilot()

  // Selected date in local YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [currentDate, setCurrentDate] = useState(todayStr)
  const [view, setView] = useState<PlannerView>("daily")

  // Data states
  const [dailyData, setDailyData] = useState<DailyTimelineResponse | null>(null)
  const [weeklyData, setWeeklyData] = useState<WeeklyCalendarResponse | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlyCalendarResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Modals
  const [rescheduleOccurrenceData, setRescheduleOccurrenceData] = useState<TaskOccurrence | null>(null)
  const [slotSuggestionOpen, setSlotSuggestionOpen] = useState(false)
  const [activeConflictMessage, setActiveConflictMessage] = useState<string | undefined>()
  const [prayerOverrideOpen, setPrayerOverrideOpen] = useState(false)
  const [executionOccurrence, setExecutionOccurrence] = useState<TaskOccurrence | null>(null)

  // Load daily timeline
  const loadDailyTimeline = async (date: string) => {
    setLoading(true)
    setError("")
    try {
      await ensureAuthenticatedUser()
      const data = await fetchDailyTimeline(date)
      setDailyData(data)
    } catch (err: any) {
      console.warn("Error fetching daily timeline:", err)
      setError(err.message || "Failed to load timeline from backend")
    } finally {
      setLoading(false)
    }
  }

  // Load weekly calendar
  const loadWeeklyCalendar = async (date: string) => {
    setLoading(true)
    setError("")
    try {
      await ensureAuthenticatedUser()
      const data = await fetchWeeklyCalendar(date)
      setWeeklyData(data)
    } catch (err: any) {
      console.warn("Error fetching weekly calendar:", err)
      setError(err.message || "Failed to load weekly schedule")
    } finally {
      setLoading(false)
    }
  }

  // Load monthly calendar
  const loadMonthlyCalendar = async (dateStr: string) => {
    setLoading(true)
    setError("")
    try {
      await ensureAuthenticatedUser()
      const [yearStr, monthStr] = dateStr.split("-")
      const data = await fetchMonthlyCalendar(parseInt(yearStr, 10), parseInt(monthStr, 10))
      setMonthlyData(data)
    } catch (err: any) {
      console.warn("Error fetching monthly calendar:", err)
      setError(err.message || "Failed to load monthly calendar")
    } finally {
      setLoading(false)
    }
  }

  // Reload current view
  const refreshData = () => {
    if (view === "daily") {
      loadDailyTimeline(currentDate)
    } else if (view === "weekly") {
      loadWeeklyCalendar(currentDate)
    } else {
      loadMonthlyCalendar(currentDate)
    }
  }

  useEffect(() => {
    refreshData()
  }, [currentDate, view])

  // Date Navigation Helpers
  const handlePrevDay = () => {
    const d = new Date(currentDate)
    if (view === "daily") {
      d.setDate(d.getDate() - 1)
    } else if (view === "weekly") {
      d.setDate(d.getDate() - 7)
    } else {
      d.setMonth(d.getMonth() - 1)
    }
    setCurrentDate(d.toISOString().slice(0, 10))
  }

  const handleNextDay = () => {
    const d = new Date(currentDate)
    if (view === "daily") {
      d.setDate(d.getDate() + 1)
    } else if (view === "weekly") {
      d.setDate(d.getDate() + 7)
    } else {
      d.setMonth(d.getMonth() + 1)
    }
    setCurrentDate(d.toISOString().slice(0, 10))
  }

  const handleJumpToday = () => {
    setCurrentDate(todayStr)
  }

  // Prayer Completion Toggle
  const handleTogglePrayer = async (block: TimelineBlock) => {
    if (!block.prayer_name) return
    const nextStatus = block.status === "completed" ? "missed" : "completed"

    try {
      await recordPrayerCompletion(block.prayer_name, currentDate, nextStatus as any)
      notify(`${block.title} marked as ${nextStatus}`)
      loadDailyTimeline(currentDate)
    } catch (err: any) {
      notify(err.message || "Failed to record prayer status")
    }
  }

  // Open Reschedule Modal for Occurrence
  const handleOpenReschedule = async (block: TimelineBlock) => {
    if (!block.occurrence_id) return
    try {
      const res = await fetchOccurrence(block.occurrence_id)
      setRescheduleOccurrenceData(res.occurrence)
    } catch {
      notify("Failed to fetch occurrence details")
    }
  }

  // Open Execution Modal for Occurrence
  const handleStartOccurrence = async (block: TimelineBlock) => {
    if (!block.occurrence_id) return
    try {
      const res = await startOccurrence(block.occurrence_id)
      setExecutionOccurrence(res.occurrence)
      loadDailyTimeline(currentDate)
    } catch (err: any) {
      notify(err.message || "Failed to start routine")
    }
  }

  // Quick Toggle Occurrence Complete
  const handleQuickCompleteOccurrence = async (block: TimelineBlock) => {
    if (!block.occurrence_id) return
    try {
      if (block.status === "completed") {
        notify(`"${block.title}" is already completed`)
      } else {
        await completeOccurrence(block.occurrence_id, true)
        notify(`Completed "${block.title}"`)
        loadDailyTimeline(currentDate)
      }
    } catch (err: any) {
      notify(err.message || "Failed to update routine status")
    }
  }

  // Resolve conflict using smart suggestions
  const handleResolveConflict = (conflict: ScheduleConflict) => {
    setActiveConflictMessage(conflict.message)
    setSlotSuggestionOpen(true)
  }

  // Apply suggested slot
  const handleApplySlotToConflict = (slot: any, targetDate: string) => {
    notify(`Selected open slot: ${slot.start_time} - ${slot.end_time}. You can reschedule overlapping tasks to this time.`)
  }

  return (
    <div className="planner-page">
      {/* Top Header */}
      <div className="planner-header-row flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>INTELLIGENT DAILY SCHEDULING</p>
          <h1 style={{ fontSize: "1.75rem", margin: "4px 0 0" }}>Daily Planner</h1>
          <p style={{ margin: "2px 0 0", color: "rgba(255, 255, 255, 0.6)", fontSize: "0.85rem" }}>
            Real-time synchronization across work shifts, Islamic prayer windows, protected focus &amp; routines.
          </p>
        </div>

        {/* View Switcher Buttons */}
        <div className="flex items-center gap-2">
          <div
            style={{
              display: "flex",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "8px",
              padding: "3px",
            }}
          >
            <button
              type="button"
              onClick={() => setView("daily")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                background: view === "daily" ? "#74c7c3" : "transparent",
                color: view === "daily" ? "#0f172a" : "rgba(255,255,255,0.7)",
                fontWeight: view === "daily" ? 600 : 400,
                fontSize: "0.82rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Daily Timeline
            </button>
            <button
              type="button"
              onClick={() => setView("weekly")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                background: view === "weekly" ? "#74c7c3" : "transparent",
                color: view === "weekly" ? "#0f172a" : "rgba(255,255,255,0.7)",
                fontWeight: view === "weekly" ? 600 : 400,
                fontSize: "0.82rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Weekly (7-Day)
            </button>
            <button
              type="button"
              onClick={() => setView("monthly")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                background: view === "monthly" ? "#74c7c3" : "transparent",
                color: view === "monthly" ? "#0f172a" : "rgba(255,255,255,0.7)",
                fontWeight: view === "monthly" ? 600 : 400,
                fontSize: "0.82rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Monthly Grid
            </button>
          </div>

          <button
            type="button"
            onClick={() => setPrayerOverrideOpen(true)}
            className="button button-subtle"
            style={{
              padding: "7px 12px",
              fontSize: "0.82rem",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Compass size={14} /> Mosque Times
          </button>
        </div>
      </div>

      {/* Date Navigation Bar */}
      <div
        className="surface-card flex items-center justify-between flex-wrap gap-3"
        style={{
          padding: "12px 18px",
          marginBottom: "20px",
          borderRadius: "10px",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevDay}
              className="icon-action"
              aria-label="Previous period"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={handleNextDay}
              className="icon-action"
              aria-label="Next period"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <CalendarDays size={18} style={{ color: "#74c7c3" }} />
            <span style={{ fontSize: "1.05rem", fontWeight: 600, color: "#fff" }}>
              {dailyData?.date_formatted || currentDate}
            </span>
          </div>

          {currentDate !== todayStr && (
            <button
              type="button"
              onClick={handleJumpToday}
              style={{
                padding: "3px 10px",
                borderRadius: "12px",
                border: "1px solid rgba(116, 199, 195, 0.3)",
                background: "rgba(116, 199, 195, 0.1)",
                color: "#74c7c3",
                fontSize: "0.75rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Today
            </button>
          )}
        </div>

        {/* Date input directly for fast jump */}
        <div className="flex items-center gap-3">
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "rgba(255,255,255,0.7)" }}>
            <span>Pick Date:</span>
            <input
              type="date"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "6px",
                padding: "4px 8px",
                color: "#fff",
                fontSize: "0.82rem",
              }}
            />
          </label>

          <button
            type="button"
            onClick={refreshData}
            className="icon-action"
            title="Refresh schedule"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Main View Content */}
      {view === "daily" && (
        <DailyTimelineView
          data={dailyData}
          loading={loading}
          currentDate={currentDate}
          onTogglePrayer={handleTogglePrayer}
          onOpenReschedule={handleOpenReschedule}
          onStartOccurrence={handleStartOccurrence}
          onQuickComplete={handleQuickCompleteOccurrence}
          onResolveConflict={handleResolveConflict}
          onOpenSlotSuggestions={() => setSlotSuggestionOpen(true)}
        />
      )}

      {view === "weekly" && (
        <WeeklyCalendarView
          data={weeklyData}
          loading={loading}
          onSelectDate={(date) => {
            setCurrentDate(date)
            setView("daily")
          }}
        />
      )}

      {view === "monthly" && (
        <MonthlyCalendarView
          data={monthlyData}
          loading={loading}
          onSelectDate={(date) => {
            setCurrentDate(date)
            setView("daily")
          }}
        />
      )}

      {/* Reschedule Modal */}
      {rescheduleOccurrenceData && (
        <RescheduleModal
          occurrence={rescheduleOccurrenceData}
          onClose={() => setRescheduleOccurrenceData(null)}
          onRescheduled={(updated) => {
            notify(`Task "${updated.routine?.title || "Task"}" rescheduled`)
            loadDailyTimeline(currentDate)
          }}
          notify={notify}
        />
      )}

      {/* Slot Suggestion Modal */}
      {slotSuggestionOpen && (
        <SlotSuggestionModal
          initialDate={currentDate}
          conflictMessage={activeConflictMessage}
          onSelectSlot={handleApplySlotToConflict}
          onClose={() => {
            setSlotSuggestionOpen(false)
            setActiveConflictMessage(undefined)
          }}
        />
      )}

      {/* Mosque Prayer Override Modal */}
      {prayerOverrideOpen && (
        <PrayerOverrideModal
          currentDate={currentDate}
          onClose={() => setPrayerOverrideOpen(false)}
          onSaved={() => loadDailyTimeline(currentDate)}
          notify={notify}
        />
      )}

      {/* Task Execution Runner Modal */}
      {executionOccurrence && (
        <TaskExecutionModal
          occurrence={executionOccurrence}
          onClose={() => setExecutionOccurrence(null)}
          onUpdated={(updated) => {
            setExecutionOccurrence(updated)
            loadDailyTimeline(currentDate)
          }}
          notify={notify}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 1. Daily Timeline View Component
// ---------------------------------------------------------------------------

function DailyTimelineView({
  data,
  loading,
  currentDate,
  onTogglePrayer,
  onOpenReschedule,
  onStartOccurrence,
  onQuickComplete,
  onResolveConflict,
  onOpenSlotSuggestions,
}: {
  data: DailyTimelineResponse | null
  loading: boolean
  currentDate: string
  onTogglePrayer: (block: TimelineBlock) => void
  onOpenReschedule: (block: TimelineBlock) => void
  onStartOccurrence: (block: TimelineBlock) => void
  onQuickComplete: (block: TimelineBlock) => void
  onResolveConflict: (conflict: ScheduleConflict) => void
  onOpenSlotSuggestions: () => void
}) {
  if (loading && !data) {
    return (
      <div className="surface-card" style={{ padding: "40px", textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
        Compiling intelligent schedule &amp; prayer windows...
      </div>
    )
  }

  const conflicts = data?.conflicts || []
  const blocks = data?.timeline_blocks || []
  const stats = data?.stats || { total_routines: 0, completed_routines: 0, conflicts_count: 0, free_minutes: 0 }
  const freeSlots = data?.free_slots || []

  return (
    <div className="daily-view-layout flex flex-col gap-5">
      {/* Conflicts Banner (if any) */}
      {conflicts.length > 0 && (
        <div
          style={{
            padding: "14px 18px",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "rgba(239, 68, 68, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#f87171",
                }}
              >
                <AlertTriangle size={16} />
              </span>
              <div>
                <strong style={{ color: "#f87171", fontSize: "0.95rem" }}>
                  {conflicts.length} Schedule Conflict{conflicts.length > 1 ? "s" : ""} Detected
                </strong>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
                  Overlapping commitments need adjustment to prevent schedule friction.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenSlotSuggestions}
              className="button button-subtle"
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                color: "#fca5a5",
                borderColor: "rgba(239, 68, 68, 0.3)",
                fontSize: "0.8rem",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Sparkles size={14} /> Find Free Slots
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {conflicts.map((conflict, idx) => (
              <div
                key={idx}
                style={{
                  padding: "8px 12px",
                  background: "rgba(0, 0, 0, 0.25)",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "8px",
                  fontSize: "0.82rem",
                }}
              >
                <div>
                  <span style={{ color: "#fca5a5", fontWeight: 500 }}>{conflict.message}</span>
                  <span style={{ marginLeft: "8px", color: "rgba(255,255,255,0.5)", fontSize: "0.78rem" }}>
                    ({conflict.overlap_start} - {conflict.overlap_end}, {conflict.overlap_minutes}m overlap)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onResolveConflict(conflict)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#74c7c3",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  Resolve with Smart Slot <ArrowRight size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Stats Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="surface-card" style={{ padding: "12px 16px" }}>
          <p className="eyebrow" style={{ margin: 0, fontSize: "0.68rem" }}>ROUTINES SCHEDULED</p>
          <div className="flex items-baseline gap-2" style={{ marginTop: "4px" }}>
            <strong style={{ fontSize: "1.4rem", color: "#fff" }}>{stats.total_routines}</strong>
            <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
              ({stats.completed_routines} completed)
            </span>
          </div>
        </div>

        <div className="surface-card" style={{ padding: "12px 16px" }}>
          <p className="eyebrow" style={{ margin: 0, fontSize: "0.68rem" }}>COMPLETION RATE</p>
          <div className="flex items-baseline gap-2" style={{ marginTop: "4px" }}>
            <strong style={{ fontSize: "1.4rem", color: "#74c7c3" }}>
              {stats.total_routines > 0
                ? Math.round((stats.completed_routines / stats.total_routines) * 100)
                : 100}%
            </strong>
          </div>
        </div>

        <div className="surface-card" style={{ padding: "12px 16px" }}>
          <p className="eyebrow" style={{ margin: 0, fontSize: "0.68rem" }}>OPEN BUFFER TIME</p>
          <div className="flex items-baseline gap-2" style={{ marginTop: "4px" }}>
            <strong style={{ fontSize: "1.4rem", color: "#38bdf8" }}>
              {Math.floor(stats.free_minutes / 60)}h {stats.free_minutes % 60}m
            </strong>
            <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
              available
            </span>
          </div>
        </div>

        <div className="surface-card" style={{ padding: "12px 16px" }}>
          <p className="eyebrow" style={{ margin: 0, fontSize: "0.68rem" }}>PRAYER WINDOWS</p>
          <div className="flex items-center gap-2" style={{ marginTop: "4px" }}>
            <strong style={{ fontSize: "1.05rem", color: "#a855f7" }}>5 Prayers</strong>
            {data?.prayer_summary?.tahajjud && (
              <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
                + Tahajjud
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Vertical Timeline */}
      <section className="surface-card" style={{ padding: "20px" }}>
        <div className="flex items-center justify-between pb-4 border-b border-[rgba(255,255,255,0.08)]">
          <div>
            <h2 style={{ fontSize: "1.15rem", margin: 0 }}>Chronological Day Flow</h2>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
              All activities, prayer blocks, work shifts, and available buffer windows.
            </p>
          </div>
          <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)" }}>
            Timezone: {data?.timezone || "Local"}
          </span>
        </div>

        {blocks.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
            No schedule blocks found for this day.
          </div>
        ) : (
          <div className="timeline-container" style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {blocks.map((block) => (
              <TimelineBlockRow
                key={block.id}
                block={block}
                onTogglePrayer={onTogglePrayer}
                onOpenReschedule={onOpenReschedule}
                onStartOccurrence={onStartOccurrence}
                onQuickComplete={onQuickComplete}
              />
            ))}
          </div>
        )}
      </section>

      {/* Free Slots Panel */}
      {freeSlots.length > 0 && (
        <section className="surface-card" style={{ padding: "16px 20px" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: "12px" }}>
            <div className="flex items-center gap-2">
              <span className="icon-tile icon-tile-cyan" style={{ width: 28, height: 28 }}>
                <Clock size={15} />
              </span>
              <div>
                <strong style={{ fontSize: "0.95rem", color: "#fff" }}>Available Free Buffer Windows</strong>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "rgba(255,255,255,0.5)" }}>
                  Ideal intervals for spontaneous deep work, walking, study, or meals.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenSlotSuggestions}
              className="button button-subtle"
              style={{ fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "4px" }}
            >
              <Sparkles size={13} /> Suggest Tasks
            </button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {freeSlots.map((slot, index) => (
              <div
                key={index}
                style={{
                  padding: "6px 12px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px dashed rgba(255,255,255,0.12)",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Clock size={12} style={{ color: "#38bdf8" }} />
                <span style={{ color: "#fff" }}>{slot.start_time} - {slot.end_time}</span>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>
                  ({slot.duration_minutes} min)
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Single Timeline Block Row Component
// ---------------------------------------------------------------------------

function TimelineBlockRow({
  block,
  onTogglePrayer,
  onOpenReschedule,
  onStartOccurrence,
  onQuickComplete,
}: {
  block: TimelineBlock
  onTogglePrayer: (block: TimelineBlock) => void
  onOpenReschedule: (block: TimelineBlock) => void
  onStartOccurrence: (block: TimelineBlock) => void
  onQuickComplete: (block: TimelineBlock) => void
}) {
  const isPrayer = block.type === "prayer"
  const isWorkShift = block.type === "work_shift"
  const isRoutine = block.type === "routine_occurrence"
  const isFocus = block.type === "focus_block"
  const isSleep = block.type === "sleep_morning" || block.type === "sleep_night"

  const isCompleted = block.status === "completed" || block.status === "partially_completed"
  const isInProgress = block.status === "in_progress"

  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        background: isCompleted
          ? "rgba(255, 255, 255, 0.015)"
          : isWorkShift
          ? "rgba(139, 92, 246, 0.05)"
          : isPrayer
          ? "rgba(14, 165, 233, 0.05)"
          : isFocus
          ? "rgba(168, 85, 247, 0.05)"
          : "rgba(255, 255, 255, 0.03)",
        border: "1px solid",
        borderColor: isCompleted
          ? "rgba(255, 255, 255, 0.05)"
          : isWorkShift
          ? "rgba(139, 92, 246, 0.25)"
          : isPrayer
          ? "rgba(14, 165, 233, 0.25)"
          : isFocus
          ? "rgba(168, 85, 247, 0.25)"
          : "rgba(255, 255, 255, 0.08)",
        borderRadius: "8px",
        overflow: "hidden",
        transition: "all 0.15s ease",
      }}
    >
      {/* Left Color Accent Bar */}
      <div
        style={{
          width: 5,
          background: block.color || "#74c7c3",
          flexShrink: 0,
        }}
      />

      {/* Time column */}
      <div
        style={{
          width: 100,
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        <strong style={{ fontSize: "0.92rem", color: "#fff" }}>{block.start_time}</strong>
        <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>to {block.end_time}</span>
        <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
          {block.duration_minutes}m
        </span>
      </div>

      {/* Main Block Info */}
      <div
        style={{
          padding: "10px 16px",
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <strong
              style={{
                fontSize: "0.95rem",
                color: isCompleted ? "rgba(255,255,255,0.6)" : "#fff",
                textDecoration: isCompleted ? "line-through" : "none",
              }}
            >
              {block.title}
            </strong>

            {/* Badges */}
            {isWorkShift && (
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  background: "rgba(139, 92, 246, 0.15)",
                  color: "#c084fc",
                }}
              >
                Work Shift
              </span>
            )}

            {block.is_overnight && (
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  background: "rgba(234, 179, 8, 0.15)",
                  color: "#fde047",
                }}
              >
                🌙 Overnight Shift
              </span>
            )}

            {isPrayer && (
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  background: "rgba(14, 165, 233, 0.15)",
                  color: "#38bdf8",
                }}
              >
                {block.has_override ? "Mosque Override" : "Prayer Time"}
              </span>
            )}

            {isFocus && (
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  background: "rgba(168, 85, 247, 0.15)",
                  color: "#c084fc",
                }}
              >
                Protected Focus
              </span>
            )}

            {isSleep && (
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "rgba(255, 255, 255, 0.7)",
                }}
              >
                Sleep / Rest
              </span>
            )}

            {/* Rescheduled Tag */}
            {block.is_rescheduled && (
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  background: "rgba(234, 179, 8, 0.15)",
                  color: "#eab308",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
                title={block.reschedule_reason || "Rescheduled occurrence"}
              >
                <Clock size={10} /> Rescheduled from {block.original_due_at}
              </span>
            )}
          </div>

          {/* Subtext info */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "3px", fontSize: "0.78rem", color: "rgba(255,255,255,0.5)" }}>
            {block.category && <span>{block.category}</span>}
            {isRoutine && block.steps_count !== undefined && (
              <>
                <span>•</span>
                <span>
                  {block.completed_steps || 0} / {block.steps_count} steps
                </span>
              </>
            )}
            {block.reschedule_reason && (
              <>
                <span>•</span>
                <span style={{ fontStyle: "italic", color: "rgba(255,255,255,0.6)" }}>
                  &quot;{block.reschedule_reason}&quot;
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Prayer Block: Quick Toggle Log */}
          {isPrayer && block.prayer_name !== "tahajjud" && (
            <button
              type="button"
              onClick={() => onTogglePrayer(block)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid",
                borderColor: isCompleted ? "rgba(34, 197, 94, 0.4)" : "rgba(255,255,255,0.15)",
                background: isCompleted ? "rgba(34, 197, 94, 0.15)" : "transparent",
                color: isCompleted ? "#4ade80" : "rgba(255,255,255,0.8)",
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
            >
              {isCompleted ? <Check size={13} /> : <Circle size={13} />}
              {isCompleted ? "Prayed" : "Mark Prayed"}
            </button>
          )}

          {/* Routine Occurrence: Quick Complete, Start, Reschedule */}
          {isRoutine && (
            <>
              {/* Quick complete check */}
              <button
                type="button"
                onClick={() => onQuickComplete(block)}
                className={`task-toggle ${isCompleted ? "task-toggle-done" : ""}`}
                title={isCompleted ? "Completed" : "Mark completed"}
              >
                {isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
              </button>

              {/* Start Runner */}
              {!isCompleted && (
                <button
                  type="button"
                  onClick={() => onStartOccurrence(block)}
                  className="button button-subtle"
                  style={{
                    padding: "5px 10px",
                    fontSize: "0.78rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    color: "#74c7c3",
                  }}
                  title="Open guided execution runner"
                >
                  <Play size={12} fill="#74c7c3" /> Start
                </button>
              )}

              {/* Reschedule Button */}
              <button
                type="button"
                onClick={() => onOpenReschedule(block)}
                className="button button-subtle"
                style={{
                  padding: "5px 10px",
                  fontSize: "0.78rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  color: block.is_rescheduled ? "#eab308" : "rgba(255,255,255,0.7)",
                }}
                title="Reschedule this occurrence"
              >
                <Clock size={12} /> Reschedule
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 2. Weekly Calendar View Component (7-Day Overview)
// ---------------------------------------------------------------------------

function WeeklyCalendarView({
  data,
  loading,
  onSelectDate,
}: {
  data: WeeklyCalendarResponse | null
  loading: boolean
  onSelectDate: (date: string) => void
}) {
  if (loading && !data) {
    return (
      <div className="surface-card" style={{ padding: "40px", textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
        Compiling 7-day weekly schedule...
      </div>
    )
  }

  const days = data?.days || []

  return (
    <div className="weekly-view-layout flex flex-col gap-4">
      <div className="surface-card flex items-center justify-between" style={{ padding: "12px 18px" }}>
        <div>
          <strong style={{ fontSize: "1.05rem", color: "#fff" }}>
            Week of {data?.week_start} to {data?.week_end}
          </strong>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
            Overview of work shifts, daily routines, prayer times, and scheduled conflicts. Click any day to open its timeline.
          </p>
        </div>
      </div>

      {/* 7 Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {days.map((day) => (
          <div
            key={day.date}
            onClick={() => onSelectDate(day.date)}
            className="surface-card"
            style={{
              padding: "14px 12px",
              cursor: "pointer",
              borderRadius: "10px",
              border: day.is_today ? "1px solid #74c7c3" : "1px solid rgba(255,255,255,0.08)",
              background: day.is_today ? "rgba(116, 199, 195, 0.05)" : "rgba(255,255,255,0.02)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              minHeight: "280px",
              transition: "transform 0.15s ease, border-color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(116, 199, 195, 0.4)")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = day.is_today ? "#74c7c3" : "rgba(255,255,255,0.08)")
            }
          >
            {/* Day Header */}
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-2">
              <div>
                <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>
                  {day.day_name}
                </span>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, color: day.is_today ? "#74c7c3" : "#fff" }}>
                  {day.day_number}
                </div>
              </div>

              {day.conflicts_count > 0 && (
                <span
                  title={`${day.conflicts_count} conflicts detected`}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "rgba(239, 68, 68, 0.2)",
                    color: "#f87171",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.7rem",
                    fontWeight: "bold",
                  }}
                >
                  !
                </span>
              )}
            </div>

            {/* Work shifts chip */}
            {day.work_shifts.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {day.work_shifts.map((shift, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "3px 6px",
                      borderRadius: "4px",
                      background: "rgba(139, 92, 246, 0.15)",
                      color: "#c084fc",
                      fontSize: "0.72rem",
                      fontWeight: 500,
                    }}
                  >
                    💼 {shift.start_time} - {shift.end_time}
                  </div>
                ))}
              </div>
            )}

            {/* Routine summary */}
            <div style={{ marginTop: "auto", paddingTop: "8px", borderTop: "1px dashed rgba(255,255,255,0.08)" }}>
              <div className="flex items-center justify-between" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
                <span>Routines:</span>
                <strong>{day.completed_count} / {day.routines_count}</strong>
              </div>

              <div className="flex items-center justify-between" style={{ fontSize: "0.72rem", color: "#38bdf8", marginTop: "2px" }}>
                <span>Free Buffer:</span>
                <span>{Math.round(day.free_minutes / 60)}h</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 3. Monthly Calendar View Component (Grid Overview)
// ---------------------------------------------------------------------------

function MonthlyCalendarView({
  data,
  loading,
  onSelectDate,
}: {
  data: MonthlyCalendarResponse | null
  loading: boolean
  onSelectDate: (date: string) => void
}) {
  if (loading && !data) {
    return (
      <div className="surface-card" style={{ padding: "40px", textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
        Loading monthly consistency matrix...
      </div>
    )
  }

  const days = data?.days || []
  const monthName = data?.month_name || "Current Month"

  return (
    <div className="monthly-view-layout flex flex-col gap-4">
      <div className="surface-card flex items-center justify-between" style={{ padding: "12px 18px" }}>
        <div>
          <strong style={{ fontSize: "1.1rem", color: "#fff" }}>{monthName}</strong>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
            Monthly routine consistency, missed tasks, and prayer records. Click any day cell to view or plan.
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {days.map((day) => (
          <div
            key={day.date}
            onClick={() => onSelectDate(day.date)}
            className="surface-card"
            style={{
              padding: "10px",
              cursor: "pointer",
              borderRadius: "8px",
              border: day.is_today ? "1px solid #74c7c3" : "1px solid rgba(255,255,255,0.06)",
              background: day.is_today ? "rgba(116, 199, 195, 0.06)" : "rgba(255,255,255,0.02)",
              minHeight: "95px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transition: "border-color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(116, 199, 195, 0.4)")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = day.is_today ? "#74c7c3" : "rgba(255,255,255,0.06)")
            }
          >
            <div className="flex items-center justify-between">
              <strong style={{ fontSize: "0.95rem", color: day.is_today ? "#74c7c3" : "#fff" }}>
                {day.day}
              </strong>
              <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>
                {day.day_name}
              </span>
            </div>

            <div>
              {day.total_tasks > 0 ? (
                <div>
                  <div className="flex items-center justify-between" style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.6)" }}>
                    <span>{day.completed_tasks}/{day.total_tasks} done</span>
                    <span style={{ color: "#74c7c3", fontWeight: 600 }}>{day.completion_percent}%</span>
                  </div>
                  <div
                    style={{
                      height: 3,
                      width: "100%",
                      background: "rgba(255,255,255,0.1)",
                      borderRadius: 2,
                      marginTop: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${day.completion_percent}%`,
                        background: "#74c7c3",
                      }}
                    />
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)" }}>Open day</span>
              )}

              {day.prayers_completed > 0 && (
                <div style={{ marginTop: "4px", fontSize: "0.68rem", color: "#38bdf8" }}>
                  🕌 {day.prayers_completed} prayers
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
