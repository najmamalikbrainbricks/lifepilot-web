"use client"

import { useState } from "react"
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Volume2,
  Calendar,
  CheckCircle2,
  Sparkles,
  Layers,
  Bell,
  Clock,
  Waves,
  Target,
  Moon,
  Activity,
  Heart,
  BookOpen,
  Briefcase,
  Sliders,
} from "lucide-react"
import {
  type Routine,
  type RoutineStep,
  type RoutineSchedule,
  type AlarmRule,
  createRoutine,
  updateRoutine,
} from "@/lib/api"
import { soundManager } from "@/lib/audio-manager"
import { AlarmSimulatorModal } from "@/components/alarm-simulator-modal"

const CATEGORIES = [
  "Spiritual",
  "Health",
  "Fitness",
  "Work",
  "Business",
  "Study",
  "Personal",
  "Sleep",
  "Custom",
] as const

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const SOUND_OPTIONS = [
  { value: "flowing_water", label: "Flowing Water (Wudu / Calm Stream)" },
  { value: "gentle_chime", label: "Gentle Harmonic Chime" },
  { value: "temple_bell", label: "Soft Temple Bell" },
  { value: "gentle_breeze", label: "Gentle Morning Breeze" },
  { value: "digital", label: "Digital Pulse" },
  { value: "silent", label: "Silent (Visual Flash Only)" },
]

interface RoutineBuilderModalProps {
  isOpen: boolean
  routine?: Routine | null
  onClose: () => void
  onSaved: (routine: Routine) => void
  notify: (msg: string) => void
}

export function RoutineBuilderModal({
  isOpen,
  routine,
  onClose,
  onSaved,
  notify,
}: RoutineBuilderModalProps) {
  const [tab, setTab] = useState<"details" | "steps" | "schedule" | "alarm">("details")

  // Routine Details
  const [title, setTitle] = useState(routine?.title || "")
  const [description, setDescription] = useState(routine?.description || "")
  const [category, setCategory] = useState(routine?.category || "Personal")
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">(
    routine?.priority || "medium"
  )
  const [duration, setDuration] = useState(routine?.estimated_duration || 15)
  const [color, setColor] = useState(routine?.color || "#74c7c3")
  const [icon, setIcon] = useState(routine?.icon || "Waves")
  const [enabled, setEnabled] = useState(routine ? routine.enabled : true)

  // Steps
  const [steps, setSteps] = useState<RoutineStep[]>(() => {
    if (routine?.steps && routine.steps.length > 0) {
      return [...routine.steps]
    }
    return [
      {
        title: "Step 1: Preparation",
        description: "Set your intention and clear distractions",
        sort_order: 0,
        estimated_duration: 5,
        required: true,
        verification_type: "self",
      },
    ]
  })

  // Schedule
  const initialSchedule = routine?.schedules?.[0]
  const [recurrenceType, setRecurrenceType] = useState<"one_time" | "daily" | "selected_weekdays" | "weekly">(
    initialSchedule?.recurrence_type || "daily"
  )
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>(
    initialSchedule?.selected_weekdays ? initialSchedule.selected_weekdays.map(Number) : [1, 2, 3, 4, 5]
  )
  const [startTime, setStartTime] = useState(initialSchedule?.local_start_time || "07:00")
  const [startDate, setStartDate] = useState(initialSchedule?.start_date || "")
  const [endDate, setEndDate] = useState(initialSchedule?.end_date || "")
  const [reminderOffset, setReminderOffset] = useState(initialSchedule?.reminder_offset || 0)
  const [scheduleEnabled, setScheduleEnabled] = useState(
    initialSchedule ? initialSchedule.enabled : true
  )

  // Alarm Settings
  const initialAlarm = routine?.alarm_rule
  const [alarmEnabled, setAlarmEnabled] = useState(initialAlarm ? initialAlarm.enabled : true)
  const [alarmSound, setAlarmSound] = useState(initialAlarm?.sound || "flowing_water")
  const [repeatInterval, setRepeatInterval] = useState(initialAlarm?.repeat_interval || 5)
  const [snoozeDuration, setSnoozeDuration] = useState(initialAlarm?.snooze_duration || 5)
  const [maxAttempts, setMaxAttempts] = useState(initialAlarm?.max_attempts || 3)
  const [verificationRequired, setVerificationRequired] = useState(
    initialAlarm ? initialAlarm.verification_required : false
  )

  // Simulator
  const [testSimulatorOpen, setTestSimulatorOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  if (!isOpen) return null

  // Template pre-fill
  const loadTemplate = (templateName: string) => {
    if (templateName === "prayer") {
      setTitle("Morning Prayer & Reflection")
      setDescription("Wudu, Fajr prayer, and quiet morning contemplation.")
      setCategory("Spiritual")
      setPriority("high")
      setDuration(25)
      setColor("#38bdf8")
      setIcon("Waves")
      setAlarmSound("flowing_water")
      setStartTime("05:30")
      setSteps([
        { title: "Wake up & recite morning remembrance", description: "Gratitude for a new day", sort_order: 0, estimated_duration: 5, required: true, verification_type: "self" },
        { title: "Perform mindful Wudu", description: "Use flowing water with intention", sort_order: 1, estimated_duration: 5, required: true, verification_type: "self" },
        { title: "Pray Fajr", description: "2 Sunnah and 2 Fard rakat", sort_order: 2, estimated_duration: 10, required: true, verification_type: "self" },
        { title: "Morning contemplation & intention", description: "Five minutes of quiet dhikr", sort_order: 3, estimated_duration: 5, required: false, verification_type: "self" },
      ])
      notify("Loaded Morning Prayer template")
    } else if (templateName === "deep_work") {
      setTitle("Agency Deep Work Sprint")
      setDescription("High-leverage focused block with zero distractions.")
      setCategory("Work")
      setPriority("high")
      setDuration(90)
      setColor("#6366f1")
      setIcon("Target")
      setAlarmSound("gentle_chime")
      setStartTime("09:00")
      setSteps([
        { title: "Clear workspace & close notifications", description: "Only task essentials open", sort_order: 0, estimated_duration: 5, required: true, verification_type: "checklist" },
        { title: "Focus Sprint 1", description: "Deep creative execution", sort_order: 1, estimated_duration: 45, required: true, verification_type: "timer" },
        { title: "Mindful break & hydration", description: "Step away from screens", sort_order: 2, estimated_duration: 5, required: false, verification_type: "self" },
        { title: "Focus Sprint 2", description: "Refine and commit work", sort_order: 3, estimated_duration: 35, required: true, verification_type: "timer" },
      ])
      notify("Loaded Deep Work Sprint template")
    } else if (templateName === "evening") {
      setTitle("Evening Rest & Wind-Down")
      setDescription("Screen shutoff, reflection, and preparation for restorative sleep.")
      setCategory("Sleep")
      setPriority("medium")
      setDuration(30)
      setColor("#a855f7")
      setIcon("Moon")
      setAlarmSound("gentle_breeze")
      setStartTime("23:30")
      setSteps([
        { title: "Turn off screens & dim lights", description: "Prepare circadian rhythm", sort_order: 0, estimated_duration: 10, required: true, verification_type: "self" },
        { title: "Evening reflection & journaling", description: "Write 3 wins from today", sort_order: 1, estimated_duration: 10, required: false, verification_type: "self" },
        { title: "Night prayer & peaceful rest", description: "Surah Al-Mulk or quiet sleep prep", sort_order: 2, estimated_duration: 10, required: true, verification_type: "self" },
      ])
      notify("Loaded Evening Rest template")
    }
  }

  // Step Helpers
  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        title: `Step ${prev.length + 1}`,
        description: "",
        sort_order: prev.length,
        estimated_duration: 5,
        required: true,
        verification_type: "self",
      },
    ])
  }

  const updateStep = (index: number, patch: Partial<RoutineStep>) => {
    setSteps((prev) =>
      prev.map((step, idx) => (idx === index ? { ...step, ...patch } : step))
    )
  }

  const removeStep = (index: number) => {
    if (steps.length <= 1) {
      notify("A routine must have at least one step")
      return
    }
    setSteps((prev) =>
      prev.filter((_, idx) => idx !== index).map((s, idx) => ({ ...s, sort_order: idx }))
    )
  }

  const moveStep = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === steps.length - 1)
    ) {
      return
    }
    const nextSteps = [...steps]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    const [moved] = nextSteps.splice(index, 1)
    nextSteps.splice(targetIndex, 0, moved)
    setSteps(nextSteps.map((s, idx) => ({ ...s, sort_order: idx })))
  }

  const toggleWeekday = (day: number) => {
    setSelectedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    )
  }

  // Save Routine
  const handleSave = async () => {
    if (!title.trim()) {
      setError("Please enter a routine title.")
      setTab("details")
      return
    }

    if (steps.some((s) => !s.title.trim())) {
      setError("All steps must have a title.")
      setTab("steps")
      return
    }

    try {
      setIsSubmitting(true)
      setError("")

      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority,
        estimated_duration: Number(duration) || 15,
        icon,
        color,
        enabled,
        steps: steps.map((s, idx) => ({
          title: s.title.trim(),
          description: s.description?.trim() || undefined,
          sort_order: idx,
          estimated_duration: Number(s.estimated_duration) || 5,
          required: Boolean(s.required),
          verification_type: s.verification_type || "self",
        })),
        schedule: {
          recurrence_type: recurrenceType,
          selected_weekdays: recurrenceType === "selected_weekdays" ? selectedWeekdays : undefined,
          local_start_time: startTime,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          reminder_offset: Number(reminderOffset) || 0,
          enabled: scheduleEnabled,
        },
        alarm_rule: {
          enabled: alarmEnabled,
          sound: alarmSound,
          repeat_interval: Number(repeatInterval) || 5,
          snooze_duration: Number(snoozeDuration) || 5,
          max_attempts: Number(maxAttempts) || 3,
          verification_required: Boolean(verificationRequired),
        },
      }

      let resRoutine: Routine
      if (routine?.id) {
        const res = await updateRoutine(routine.id, payload)
        resRoutine = res.routine
        notify("Routine updated successfully!")
      } else {
        const res = await createRoutine(payload)
        resRoutine = res.routine
        notify("Routine created successfully!")
      }

      onSaved(resRoutine)
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to save routine. Check backend connection.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div
        className="dialog-backdrop"
        role="presentation"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div
          className="routine-builder-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="builder-title"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "1.25rem",
            maxWidth: "680px",
            width: "94vw",
            padding: "1.75rem",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.45)",
            color: "var(--foreground)",
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
            <div>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "var(--primary)",
                  textTransform: "uppercase",
                }}
              >
                Smart Routine Builder
              </span>
              <h2 id="builder-title" style={{ fontSize: "1.35rem", margin: "0.15rem 0 0", fontWeight: 700 }}>
                {routine ? "Edit Routine" : "Create New Routine"}
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "var(--muted-foreground)",
                cursor: "pointer",
                padding: "4px",
              }}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Quick Preset Templates (if creating new) */}
          {!routine && (
            <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: "4px" }}>
                <Sparkles size={14} style={{ color: "var(--primary)" }} /> Templates:
              </span>
              <button
                type="button"
                className="button button-secondary"
                style={{ padding: "0.25rem 0.65rem", fontSize: "0.78rem" }}
                onClick={() => loadTemplate("prayer")}
              >
                Morning Prayer
              </button>
              <button
                type="button"
                className="button button-secondary"
                style={{ padding: "0.25rem 0.65rem", fontSize: "0.78rem" }}
                onClick={() => loadTemplate("deep_work")}
              >
                Deep Work Sprint
              </button>
              <button
                type="button"
                className="button button-secondary"
                style={{ padding: "0.25rem 0.65rem", fontSize: "0.78rem" }}
                onClick={() => loadTemplate("evening")}
              >
                Evening Rest
              </button>
            </div>
          )}

          {/* Navigation Tabs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "0.4rem",
              background: "var(--muted)",
              padding: "4px",
              borderRadius: "0.75rem",
              marginBottom: "1.25rem",
            }}
          >
            {[
              { key: "details", label: "Details", icon: Sliders },
              { key: "steps", label: `Steps (${steps.length})`, icon: Layers },
              { key: "schedule", label: "Schedule", icon: Calendar },
              { key: "alarm", label: "Alarm", icon: Bell },
            ].map(({ key, label, icon: TabIcon }) => (
              <button
                key={key}
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "0.55rem 0.5rem",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  borderRadius: "0.5rem",
                  border: "none",
                  background: tab === key ? "var(--card)" : "transparent",
                  color: tab === key ? "var(--primary)" : "var(--muted-foreground)",
                  boxShadow: tab === key ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
                  cursor: "pointer",
                }}
                onClick={() => setTab(key as any)}
              >
                <TabIcon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Error notice */}
          {error && (
            <div
              style={{
                padding: "0.65rem 0.85rem",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "0.6rem",
                color: "#f87171",
                fontSize: "0.85rem",
                marginBottom: "1rem",
              }}
            >
              {error}
            </div>
          )}

          {/* Tab 1: Details */}
          <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}>
            {tab === "details" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <label className="lp-field">
                  <span>Routine Name *</span>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Morning Prayer & Contemplation"
                  />
                </label>

                <label className="lp-field">
                  <span>Description / Intention</span>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Why this routine matters and what it helps you achieve..."
                    style={{
                      background: "var(--muted)",
                      border: "1px solid var(--border)",
                      borderRadius: "0.5rem",
                      padding: "0.6rem",
                      color: "inherit",
                    }}
                  />
                </label>

                <div className="lp-grid-two">
                  <label className="lp-field">
                    <span>Category</span>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="lp-field">
                    <span>Priority</span>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </label>

                  <label className="lp-field">
                    <span>Estimated Duration (minutes)</span>
                    <input
                      type="number"
                      min={1}
                      max={720}
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                    />
                  </label>

                  <label className="lp-field">
                    <span>Accent Color</span>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        style={{ width: "42px", height: "38px", border: "none", borderRadius: "6px", cursor: "pointer", background: "transparent" }}
                      />
                      <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>{color}</span>
                    </div>
                  </label>
                </div>

                <label className="lp-switch">
                  <span>Enable Routine</span>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                  />
                </label>
              </div>
            )}

            {/* Tab 2: Multi-step Builder */}
            {tab === "steps" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
                    Build ordered repeatable steps. Required steps cannot be skipped without override.
                  </p>
                  <button
                    type="button"
                    className="button button-primary"
                    style={{ padding: "0.35rem 0.75rem", fontSize: "0.82rem" }}
                    onClick={addStep}
                  >
                    <Plus size={15} /> Add Step
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {steps.map((step, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "var(--muted)",
                        border: "1px solid var(--border)",
                        borderRadius: "0.75rem",
                        padding: "0.85rem 1rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary)" }}>
                          STEP {idx + 1}
                        </span>
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          <button
                            type="button"
                            className="lp-icon-action"
                            disabled={idx === 0}
                            onClick={() => moveStep(idx, "up")}
                            title="Move step up"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            className="lp-icon-action"
                            disabled={idx === steps.length - 1}
                            onClick={() => moveStep(idx, "down")}
                            title="Move step down"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            className="lp-icon-action"
                            onClick={() => removeStep(idx)}
                            title="Delete step"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.5rem" }}>
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => updateStep(idx, { title: e.target.value })}
                          placeholder="Step title"
                          style={{
                            background: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "0.5rem",
                            padding: "0.5rem 0.75rem",
                            color: "inherit",
                          }}
                        />
                        <input
                          type="text"
                          value={step.description || ""}
                          onChange={(e) => updateStep(idx, { description: e.target.value })}
                          placeholder="Step details or guidance (optional)"
                          style={{
                            background: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "0.5rem",
                            padding: "0.45rem 0.75rem",
                            color: "inherit",
                            fontSize: "0.82rem",
                          }}
                        />
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "120px 1fr 140px",
                          gap: "0.5rem",
                          marginTop: "0.5rem",
                          alignItems: "center",
                        }}
                      >
                        <label style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                          Duration (m):
                          <input
                            type="number"
                            min={1}
                            value={step.estimated_duration}
                            onChange={(e) => updateStep(idx, { estimated_duration: Number(e.target.value) })}
                            style={{
                              width: "100%",
                              padding: "0.35rem 0.5rem",
                              borderRadius: "0.4rem",
                              border: "1px solid var(--border)",
                              background: "var(--card)",
                              color: "inherit",
                            }}
                          />
                        </label>

                        <label style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                          Verification:
                          <select
                            value={step.verification_type}
                            onChange={(e) => updateStep(idx, { verification_type: e.target.value as any })}
                            style={{
                              width: "100%",
                              padding: "0.35rem 0.5rem",
                              borderRadius: "0.4rem",
                              border: "1px solid var(--border)",
                              background: "var(--card)",
                              color: "inherit",
                            }}
                          >
                            <option value="self">Self confirmation</option>
                            <option value="camera">Live Camera Proof</option>
                            <option value="upload">Gallery Photo Upload</option>
                            <option value="timer">Timer countdown</option>
                            <option value="counter">Repetition counter</option>
                            <option value="checklist">Checklist</option>
                          </select>
                        </label>

                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", cursor: "pointer", marginTop: "14px" }}>
                          <input
                            type="checkbox"
                            checked={step.required}
                            onChange={(e) => updateStep(idx, { required: e.target.checked })}
                          />
                          <span>Required step</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Scheduling */}
            {tab === "schedule" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <label className="lp-field">
                  <span>Recurrence Pattern</span>
                  <select
                    value={recurrenceType}
                    onChange={(e) => setRecurrenceType(e.target.value as any)}
                  >
                    <option value="daily">Daily</option>
                    <option value="selected_weekdays">Selected Weekdays</option>
                    <option value="weekly">Weekly</option>
                    <option value="one_time">One-Time Activity</option>
                  </select>
                </label>

                {recurrenceType === "selected_weekdays" && (
                  <div>
                    <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)", display: "block", marginBottom: "0.4rem" }}>
                      Select Active Weekdays
                    </span>
                    <div className="lp-days">
                      {WEEKDAYS.map((day, idx) => (
                        <button
                          key={day}
                          type="button"
                          aria-pressed={selectedWeekdays.includes(idx)}
                          className={selectedWeekdays.includes(idx) ? "selected" : ""}
                          onClick={() => toggleWeekday(idx)}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="lp-grid-two">
                  <label className="lp-field">
                    <span>Local Start Time (Timezone aware)</span>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </label>

                  <label className="lp-field">
                    <span>Reminder Offset (minutes before)</span>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={reminderOffset}
                      onChange={(e) => setReminderOffset(Number(e.target.value))}
                    />
                  </label>
                </div>

                <div className="lp-grid-two">
                  <label className="lp-field">
                    <span>Start Date (Optional)</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </label>

                  <label className="lp-field">
                    <span>End Date (Optional)</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </label>
                </div>

                <label className="lp-switch">
                  <span>Schedule Enabled</span>
                  <input
                    type="checkbox"
                    checked={scheduleEnabled}
                    onChange={(e) => setScheduleEnabled(e.target.checked)}
                  />
                </label>
              </div>
            )}

            {/* Tab 4: Alarm Settings */}
            {tab === "alarm" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div
                  style={{
                    background: "rgba(116, 199, 195, 0.1)",
                    border: "1px solid rgba(116, 199, 195, 0.2)",
                    borderRadius: "0.75rem",
                    padding: "0.85rem 1rem",
                    fontSize: "0.82rem",
                    color: "var(--foreground)",
                  }}
                >
                  <strong style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--primary)" }}>
                    <Bell size={16} /> Foreground Alarm Simulator (Browser Prototype)
                  </strong>
                  <p style={{ margin: "4px 0 0", color: "var(--muted-foreground)" }}>
                    Web browsers cannot guarantee background phone waking or volume override. These settings are persisted in your database and are simulated right now in the foreground for future Android alarms.
                  </p>
                </div>

                <label className="lp-switch">
                  <span>Enable Alarm Reminders</span>
                  <input
                    type="checkbox"
                    checked={alarmEnabled}
                    onChange={(e) => setAlarmEnabled(e.target.checked)}
                  />
                </label>

                <label className="lp-field">
                  <span>Alarm Sound</span>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <select
                      value={alarmSound}
                      onChange={(e) => setAlarmSound(e.target.value)}
                      style={{ flex: 1 }}
                    >
                      {SOUND_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => {
                        soundManager.preview(alarmSound as any)
                        notify(`Playing audio preview of "${alarmSound.replace('_', ' ')}"`)
                      }}
                      title="Listen to sound preview"
                    >
                      <Volume2 size={16} /> Preview
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => setTestSimulatorOpen(true)}
                      title="Test alarm simulation"
                    >
                      Full Sim
                    </button>
                  </div>
                </label>

                <div className="lp-grid-two">
                  <label className="lp-field">
                    <span>Repeat Interval (minutes)</span>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={repeatInterval}
                      onChange={(e) => setRepeatInterval(Number(e.target.value))}
                    />
                  </label>

                  <label className="lp-field">
                    <span>Snooze Duration (minutes)</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={snoozeDuration}
                      onChange={(e) => setSnoozeDuration(Number(e.target.value))}
                    />
                  </label>

                  <label className="lp-field">
                    <span>Max Reminder Attempts</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={maxAttempts}
                      onChange={(e) => setMaxAttempts(Number(e.target.value))}
                    />
                  </label>

                  <div style={{ marginTop: "1.25rem" }}>
                    <label className="lp-switch">
                      <span>Require Step Verification</span>
                      <input
                        type="checkbox"
                        checked={verificationRequired}
                        onChange={(e) => setVerificationRequired(e.target.checked)}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid var(--border)",
              paddingTop: "1rem",
              marginTop: "1rem",
            }}
          >
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {tab !== "details" && (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    if (tab === "steps") setTab("details")
                    if (tab === "schedule") setTab("steps")
                    if (tab === "alarm") setTab("schedule")
                  }}
                >
                  Previous
                </button>
              )}
              {tab !== "alarm" ? (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    if (tab === "details") setTab("steps")
                    if (tab === "steps") setTab("schedule")
                    if (tab === "schedule") setTab("alarm")
                  }}
                >
                  Next
                </button>
              ) : null}
              <button
                type="button"
                className="button button-primary"
                onClick={handleSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : routine ? "Update Routine" : "Create Routine"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Foreground Alarm Simulator Modal */}
      <AlarmSimulatorModal
        isOpen={testSimulatorOpen}
        routineTitle={title || "Routine Alarm Preview"}
        sound={alarmSound}
        repeatInterval={repeatInterval}
        snoozeDuration={snoozeDuration}
        onClose={() => setTestSimulatorOpen(false)}
      />
    </>
  )
}
