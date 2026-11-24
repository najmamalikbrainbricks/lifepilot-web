"use client"

import { useState, useEffect } from "react"
import {
  Calendar,
  Clock,
  RotateCcw,
  Sparkles,
  AlertCircle,
  X,
  Check,
  ArrowRight,
  ShieldAlert,
} from "lucide-react"
import {
  type TaskOccurrence,
  type SlotSuggestion,
  rescheduleOccurrence,
  resetOccurrenceReschedule,
  fetchSlotSuggestions,
} from "@/lib/api"

interface RescheduleModalProps {
  occurrence: TaskOccurrence
  onClose: () => void
  onRescheduled: (updated: TaskOccurrence) => void
  notify: (msg: string) => void
}

export function RescheduleModal({
  occurrence,
  onClose,
  onRescheduled,
  notify,
}: RescheduleModalProps) {
  // Extract date and time from due_at
  const dueDate = new Date(occurrence.due_at)
  const initialDateStr = dueDate.toISOString().slice(0, 10)
  const initialTimeStr = dueDate.toTimeString().slice(0, 5)

  const [date, setDate] = useState(initialDateStr)
  const [time, setTime] = useState(initialTimeStr)
  const [reason, setReason] = useState(occurrence.reschedule_reason || "")
  const [submitting, setSubmitting] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<SlotSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [error, setError] = useState("")

  const duration = occurrence.routine?.estimated_duration || 30

  // Load smart suggestions for this occurrence's duration
  const loadSuggestions = async (targetDate: string) => {
    setLoadingSuggestions(true)
    try {
      const res = await fetchSlotSuggestions(duration, targetDate)
      setSuggestions(res.suggestions || [])
    } catch (err: any) {
      console.warn("Could not load slot suggestions:", err)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  useEffect(() => {
    if (showSuggestions) {
      loadSuggestions(date)
    }
  }, [showSuggestions, date])

  const handleApplySuggestion = (s: SlotSuggestion) => {
    setTime(s.start_time)
    setReason((prev) => prev || `Moved to smart slot (${s.reason})`)
    setShowSuggestions(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !time) {
      setError("Please select both a date and time")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const newDueAt = `${date}T${time}:00`
      const res = await rescheduleOccurrence(occurrence.id, newDueAt, reason.trim() || undefined)
      notify(`Rescheduled "${occurrence.routine?.title || "Task"}" to ${time}`)
      onRescheduled(res.occurrence)
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to reschedule task occurrence")
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = async () => {
    setSubmitting(true)
    setError("")
    try {
      const res = await resetOccurrenceReschedule(occurrence.id)
      notify(`Reset "${occurrence.routine?.title || "Task"}" to original schedule`)
      onRescheduled(res.occurrence)
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to reset schedule")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="lp-modal-backdrop" onClick={onClose}>
      <div
        className="lp-modal-content surface-card"
        style={{ maxWidth: 540 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="reschedule-title"
      >
        <div className="lp-modal-header">
          <div className="flex items-center gap-2">
            <span className="icon-tile icon-tile-cyan">
              <Clock size={18} />
            </span>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>SCHEDULE ADJUSTMENT</p>
              <h2 id="reschedule-title" style={{ margin: 0, fontSize: "1.15rem" }}>
                Reschedule Occurrence
              </h2>
            </div>
          </div>
          <button
            type="button"
            className="icon-action"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="lp-modal-body" style={{ padding: "16px 20px" }}>
          {/* Target Routine Info */}
          <div
            style={{
              padding: "12px 14px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "8px",
              marginBottom: "16px",
            }}
          >
            <div className="flex items-center justify-between">
              <strong style={{ color: "var(--foreground, #fff)" }}>
                {occurrence.routine?.title || "Task Occurrence"}
              </strong>
              <span
                style={{
                  fontSize: "0.75rem",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  background: "rgba(116, 199, 195, 0.15)",
                  color: "#74c7c3",
                }}
              >
                {occurrence.routine?.category || "Routine"} · {duration} min
              </span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "rgba(255, 255, 255, 0.6)" }}>
              Current time: <span style={{ color: "#fff" }}>{initialTimeStr}</span> on {initialDateStr}
              {occurrence.is_rescheduled && occurrence.original_due_at && (
                <span style={{ color: "#eab308", marginLeft: "8px" }}>
                  (Original: {occurrence.original_due_at})
                </span>
              )}
            </p>
            {occurrence.is_rescheduled && occurrence.reschedule_reason && (
              <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "rgba(255, 255, 255, 0.5)", fontStyle: "italic" }}>
                Reason: {occurrence.reschedule_reason}
              </p>
            )}
          </div>

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                borderRadius: "6px",
                color: "#f87171",
                fontSize: "0.85rem",
                marginBottom: "16px",
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="lp-grid-two" style={{ gap: "12px", marginBottom: "14px" }}>
              <label className="lp-field">
                <span className="flex items-center gap-1.5" style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)" }}>
                  <Calendar size={13} /> Target Date
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    color: "#fff",
                    fontSize: "0.9rem",
                    width: "100%",
                  }}
                  required
                />
              </label>

              <label className="lp-field">
                <span className="flex items-center gap-1.5" style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)" }}>
                  <Clock size={13} /> New Start Time
                </span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    color: "#fff",
                    fontSize: "0.9rem",
                    width: "100%",
                  }}
                  required
                />
              </label>
            </div>

            {/* Smart Slot Suggestions Toggle */}
            <div style={{ marginBottom: "14px" }}>
              <button
                type="button"
                onClick={() => setShowSuggestions(!showSuggestions)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "transparent",
                  border: "none",
                  color: "#74c7c3",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <Sparkles size={14} />
                {showSuggestions ? "Hide smart slot suggestions" : "Suggest conflict-free available slots"}
              </button>

              {showSuggestions && (
                <div
                  style={{
                    marginTop: "8px",
                    padding: "10px",
                    background: "rgba(116, 199, 195, 0.05)",
                    border: "1px solid rgba(116, 199, 195, 0.15)",
                    borderRadius: "8px",
                  }}
                >
                  <p style={{ margin: "0 0 8px", fontSize: "0.78rem", color: "rgba(255,255,255,0.7)" }}>
                    Conflict-free slots for {duration} min on {date}:
                  </p>

                  {loadingSuggestions ? (
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                      Analyzing schedule &amp; prayer windows...
                    </p>
                  ) : suggestions.length === 0 ? (
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                      No open slots found for this date.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {suggestions.slice(0, 4).map((s, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "between",
                            padding: "6px 10px",
                            background: "rgba(255,255,255,0.03)",
                            borderRadius: "6px",
                            cursor: "pointer",
                          }}
                          onClick={() => handleApplySuggestion(s)}
                        >
                          <div>
                            <strong style={{ color: "#fff", fontSize: "0.85rem" }}>
                              {s.start_time} - {s.end_time}
                            </strong>
                            <span style={{ marginLeft: "8px", fontSize: "0.75rem", color: "#74c7c3" }}>
                              {s.reason}
                            </span>
                          </div>
                          <span
                            style={{
                              marginLeft: "auto",
                              fontSize: "0.75rem",
                              color: "rgba(255,255,255,0.5)",
                              display: "flex",
                              alignItems: "center",
                              gap: "2px",
                            }}
                          >
                            Apply <ArrowRight size={12} />
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Reschedule Reason */}
            <label className="lp-field" style={{ marginBottom: "20px" }}>
              <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)" }}>
                Reason for Rescheduling (Optional)
              </span>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Work shift ran late, urgent client meeting"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  color: "#fff",
                  fontSize: "0.88rem",
                  width: "100%",
                }}
              />
            </label>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <div>
                {occurrence.is_rescheduled && (
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={submitting}
                    className="button button-subtle"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      color: "#eab308",
                      fontSize: "0.82rem",
                    }}
                  >
                    <RotateCcw size={14} />
                    Reset to original ({occurrence.original_due_at})
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="button button-subtle"
                  style={{ fontSize: "0.85rem" }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="button button-primary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.85rem",
                  }}
                >
                  {submitting ? "Saving..." : "Confirm Reschedule"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
