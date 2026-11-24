"use client"

import { useState, useEffect } from "react"
import {
  Sparkles,
  Clock,
  Calendar,
  X,
  Check,
  ArrowRight,
  AlertCircle,
  HelpCircle,
} from "lucide-react"
import { type SlotSuggestion, fetchSlotSuggestions } from "@/lib/api"

interface SlotSuggestionModalProps {
  initialDuration?: number
  initialDate?: string
  conflictMessage?: string
  onSelectSlot: (slot: SlotSuggestion, date: string) => void
  onClose: () => void
}

export function SlotSuggestionModal({
  initialDuration = 30,
  initialDate = new Date().toISOString().slice(0, 10),
  conflictMessage,
  onSelectSlot,
  onClose,
}: SlotSuggestionModalProps) {
  const [duration, setDuration] = useState(initialDuration)
  const [date, setDate] = useState(initialDate)
  const [suggestions, setSuggestions] = useState<SlotSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadSlots = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetchSlotSuggestions(duration, date)
      setSuggestions(res.suggestions || [])
    } catch (err: any) {
      setError(err.message || "Failed to calculate available slots")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSlots()
  }, [duration, date])

  const durationOptions = [15, 20, 30, 45, 60, 90]

  return (
    <div className="lp-modal-backdrop" onClick={onClose}>
      <div
        className="lp-modal-content surface-card"
        style={{ maxWidth: 560 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="suggestion-modal-title"
      >
        <div className="lp-modal-header">
          <div className="flex items-center gap-2">
            <span className="icon-tile icon-tile-cyan">
              <Sparkles size={18} />
            </span>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>INTELLIGENT SCHEDULER</p>
              <h2 id="suggestion-modal-title" style={{ margin: 0, fontSize: "1.15rem" }}>
                Conflict-Free Slot Recommendations
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
          {conflictMessage && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                padding: "10px 12px",
                background: "rgba(234, 179, 8, 0.1)",
                border: "1px solid rgba(234, 179, 8, 0.25)",
                borderRadius: "6px",
                color: "#fde047",
                fontSize: "0.85rem",
                marginBottom: "16px",
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Conflict to resolve:</strong> {conflictMessage}
              </div>
            </div>
          )}

          {/* Controls: Date & Duration */}
          <div className="lp-grid-two" style={{ gap: "12px", marginBottom: "16px" }}>
            <label className="lp-field">
              <span className="flex items-center gap-1" style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)" }}>
                <Calendar size={13} /> Select Date
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
              />
            </label>

            <div>
              <span className="flex items-center gap-1" style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>
                <Clock size={13} /> Target Duration
              </span>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {durationOptions.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDuration(mins)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid",
                      borderColor: duration === mins ? "#74c7c3" : "rgba(255,255,255,0.12)",
                      background: duration === mins ? "rgba(116, 199, 195, 0.15)" : "transparent",
                      color: duration === mins ? "#74c7c3" : "rgba(255,255,255,0.7)",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                    }}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Suggestions List */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: "10px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff" }}>
                Recommended Open Intervals ({suggestions.length})
              </span>
              <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>
                Respects work shifts, prayer blocks &amp; sleep
              </span>
            </div>

            {loading ? (
              <div style={{ padding: "30px 0", textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
                Finding open windows...
              </div>
            ) : error ? (
              <div style={{ padding: "16px", color: "#f87171", fontSize: "0.85rem" }}>
                {error}
              </div>
            ) : suggestions.length === 0 ? (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "8px",
                  border: "1px dashed rgba(255,255,255,0.1)",
                }}
              >
                <p style={{ margin: 0, color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>
                  No clear slots of {duration} minutes available on {date}.
                </p>
                <small style={{ color: "rgba(255,255,255,0.4)" }}>
                  Try reducing the duration or checking a different date.
                </small>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "320px", overflowY: "auto" }}>
                {suggestions.map((slot, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      onSelectSlot(slot, date)
                      onClose()
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(116, 199, 195, 0.4)"
                      e.currentTarget.style.background = "rgba(116, 199, 195, 0.06)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)"
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)"
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong style={{ color: "#fff", fontSize: "0.95rem" }}>
                          {slot.start_time} - {slot.end_time}
                        </strong>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            padding: "1px 6px",
                            borderRadius: "10px",
                            background: "rgba(116, 199, 195, 0.15)",
                            color: "#74c7c3",
                          }}
                        >
                          Score: {slot.score}
                        </span>
                      </div>
                      <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
                        {slot.reason}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="button button-subtle"
                      style={{
                        padding: "6px 12px",
                        fontSize: "0.8rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        color: "#74c7c3",
                      }}
                    >
                      Choose <ArrowRight size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lp-modal-footer" style={{ padding: "12px 20px", display: "flex", justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} className="button button-subtle" style={{ fontSize: "0.85rem" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
