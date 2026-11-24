"use client"

import { useState } from "react"
import {
  Compass,
  X,
  Check,
  Trash2,
  AlertCircle,
  Clock,
  Calendar,
} from "lucide-react"
import {
  type PrayerOverride,
  savePrayerOverride,
  deletePrayerOverride,
} from "@/lib/api"

interface PrayerOverrideModalProps {
  currentDate: string
  existingOverride?: PrayerOverride | null
  onClose: () => void
  onSaved: () => void
  notify: (msg: string) => void
}

export function PrayerOverrideModal({
  currentDate,
  existingOverride,
  onClose,
  onSaved,
  notify,
}: PrayerOverrideModalProps) {
  const [fajr, setFajr] = useState(existingOverride?.fajr || "")
  const [dhuhr, setDhuhr] = useState(existingOverride?.dhuhr || "")
  const [asr, setAsr] = useState(existingOverride?.asr || "")
  const [maghrib, setMaghrib] = useState(existingOverride?.maghrib || "")
  const [isha, setIsha] = useState(existingOverride?.isha || "")
  const [note, setNote] = useState(existingOverride?.note || "Local Mosque Jamaat Timetable")
  const [isDefault, setIsDefault] = useState(!existingOverride?.date)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      await savePrayerOverride({
        date: isDefault ? null : currentDate,
        fajr: fajr.trim() || undefined,
        dhuhr: dhuhr.trim() || undefined,
        asr: asr.trim() || undefined,
        maghrib: maghrib.trim() || undefined,
        isha: isha.trim() || undefined,
        note: note.trim() || undefined,
      })

      notify("Mosque prayer timetable override saved")
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to save mosque timetable")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setSubmitting(true)
    setError("")

    try {
      await deletePrayerOverride(existingOverride?.id, isDefault ? undefined : currentDate)
      notify("Mosque prayer timetable override removed")
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to delete override")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="lp-modal-backdrop" onClick={onClose}>
      <div
        className="lp-modal-content surface-card"
        style={{ maxWidth: 520 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="override-modal-title"
      >
        <div className="lp-modal-header">
          <div className="flex items-center gap-2">
            <span className="icon-tile icon-tile-cyan">
              <Compass size={18} />
            </span>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>MOSQUE / JAMAAT TIMETABLE</p>
              <h2 id="override-modal-title" style={{ margin: 0, fontSize: "1.15rem" }}>
                Prayer Time Overrides
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

        <form onSubmit={handleSubmit}>
          <div className="lp-modal-body" style={{ padding: "16px 20px" }}>
            <p style={{ margin: "0 0 16px", fontSize: "0.82rem", color: "rgba(255,255,255,0.7)" }}>
              If your local mosque follows fixed jamaat times different from astronomical calculations, enter them below. Leave blank to retain calculated times.
            </p>

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

            {/* Scope: Date specific or global default */}
            <div style={{ marginBottom: "16px" }}>
              <label className="lp-switch" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={!isDefault}
                  onChange={(e) => setIsDefault(!e.target.checked)}
                />
                <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.85)" }}>
                  Apply only to {currentDate} (unchecked = apply to all days)
                </span>
              </label>
            </div>

            {/* Prayers grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
              <label className="lp-field">
                <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)" }}>Fajr</span>
                <input
                  type="time"
                  value={fajr}
                  onChange={(e) => setFajr(e.target.value)}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    color: "#fff",
                  }}
                />
              </label>

              <label className="lp-field">
                <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)" }}>Dhuhr</span>
                <input
                  type="time"
                  value={dhuhr}
                  onChange={(e) => setDhuhr(e.target.value)}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    color: "#fff",
                  }}
                />
              </label>

              <label className="lp-field">
                <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)" }}>Asr</span>
                <input
                  type="time"
                  value={asr}
                  onChange={(e) => setAsr(e.target.value)}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    color: "#fff",
                  }}
                />
              </label>

              <label className="lp-field">
                <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)" }}>Maghrib</span>
                <input
                  type="time"
                  value={maghrib}
                  onChange={(e) => setMaghrib(e.target.value)}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    color: "#fff",
                  }}
                />
              </label>

              <label className="lp-field" style={{ gridColumn: "span 2" }}>
                <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)" }}>Isha</span>
                <input
                  type="time"
                  value={isha}
                  onChange={(e) => setIsha(e.target.value)}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    color: "#fff",
                  }}
                />
              </label>
            </div>

            <label className="lp-field" style={{ marginBottom: "12px" }}>
              <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)" }}>Mosque Name / Notes</span>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Masjid Al-Rahman Jamaat Timetable"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "6px",
                  padding: "8px 10px",
                  color: "#fff",
                }}
              />
            </label>
          </div>

          <div className="lp-modal-footer" style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {existingOverride ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="button button-subtle"
                style={{ color: "#f87171", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <Trash2 size={14} /> Remove Overrides
              </button>
            ) : <span />}

            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="button button-subtle" style={{ fontSize: "0.85rem" }}>
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="button button-primary" style={{ fontSize: "0.85rem" }}>
                {submitting ? "Saving..." : "Save Timetable"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
