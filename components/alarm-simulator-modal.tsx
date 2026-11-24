"use client"

import { useEffect, useState } from "react"
import { Bell, Volume2, X, Play, Clock, Sparkles } from "lucide-react"
import { playAlarmSound } from "@/lib/audio-simulator"

interface AlarmSimulatorModalProps {
  isOpen: boolean
  routineTitle: string
  sound: string
  repeatInterval: number
  snoozeDuration: number
  onClose: () => void
  onStartRoutine?: () => void
}

export function AlarmSimulatorModal({
  isOpen,
  routineTitle,
  sound,
  repeatInterval,
  snoozeDuration,
  onClose,
  onStartRoutine,
}: AlarmSimulatorModalProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [snoozed, setSnoozed] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSnoozed(false)
      playAudio()
    }
  }, [isOpen])

  if (!isOpen) return null

  const playAudio = () => {
    setIsPlaying(true)
    playAlarmSound(sound)
    window.setTimeout(() => setIsPlaying(false), 2200)
  }

  const handleSnooze = () => {
    setSnoozed(true)
    window.setTimeout(() => {
      onClose()
    }, 1200)
  }

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="alarm-simulator-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="alarm-dialog-title"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "1.25rem",
          maxWidth: "460px",
          width: "92vw",
          padding: "1.75rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.45)",
          color: "var(--foreground)",
          position: "relative",
          animation: "scaleIn 0.2s ease-out",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "rgba(116, 199, 195, 0.15)",
                color: "var(--primary)",
              }}
            >
              <Bell size={22} className={isPlaying ? "animate-bounce" : ""} />
            </span>
            <div>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "var(--primary)",
                  textTransform: "uppercase",
                }}
              >
                Foreground Alarm Simulator
              </span>
              <h2 id="alarm-dialog-title" style={{ fontSize: "1.25rem", margin: "0.15rem 0 0", fontWeight: 700 }}>
                {routineTitle}
              </h2>
            </div>
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
            aria-label="Dismiss alarm"
          >
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            background: "var(--muted)",
            padding: "0.85rem 1rem",
            borderRadius: "0.75rem",
            fontSize: "0.85rem",
            color: "var(--muted-foreground)",
            marginBottom: "1.25rem",
            lineHeight: 1.45,
          }}
        >
          <p style={{ margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
            <Volume2 size={16} style={{ color: "var(--primary)", flexShrink: 0 }} />
            <span>
              Simulated audio: <strong>{sound.replace(/_/g, " ")}</strong>
            </span>
          </p>
          <p style={{ margin: "6px 0 0", fontSize: "0.78rem" }}>
            Browser preview only. Real background alerts and system volume override are designed for the upcoming native Android app.
          </p>
        </div>

        {snoozed ? (
          <div
            style={{
              padding: "1.25rem",
              background: "rgba(116, 199, 195, 0.1)",
              borderRadius: "0.75rem",
              textAlign: "center",
              marginBottom: "1rem",
              color: "var(--primary)",
            }}
          >
            <Clock size={24} style={{ margin: "0 auto 0.5rem" }} />
            <strong>Snoozed for {snoozeDuration} minutes</strong>
            <p style={{ fontSize: "0.82rem", margin: "4px 0 0" }}>Closing simulator...</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            <button
              type="button"
              className="button button-primary"
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "0.85rem",
                fontSize: "0.95rem",
              }}
              onClick={() => {
                if (onStartRoutine) onStartRoutine()
                onClose()
              }}
            >
              <Play size={18} />
              Start Routine Now
            </button>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <button
                type="button"
                className="button button-secondary"
                style={{ justifyContent: "center", padding: "0.7rem" }}
                onClick={playAudio}
              >
                <Volume2 size={16} />
                Replay Tone
              </button>
              <button
                type="button"
                className="button button-secondary"
                style={{ justifyContent: "center", padding: "0.7rem" }}
                onClick={handleSnooze}
              >
                <Clock size={16} />
                Snooze ({snoozeDuration}m)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
