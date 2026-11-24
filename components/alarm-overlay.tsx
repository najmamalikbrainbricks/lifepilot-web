"use client"

import { useState, useEffect, useRef } from "react"
import {
  Bell,
  Clock,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  Waves,
} from "lucide-react"
import {
  type TaskOccurrence,
  fetchDueAlarms,
  triggerAlarm,
  acknowledgeAlarm,
  snoozeAlarm,
  emergencyStopAlarms,
} from "@/lib/api"
import { soundManager, type AlarmSoundType } from "@/lib/audio-manager"

interface AlarmOverlayProps {
  onStartRoutine: (occurrence: TaskOccurrence) => void
  notify: (msg: string) => void
}

export function AlarmOverlay({ onStartRoutine, notify }: AlarmOverlayProps) {
  const [activeAlarm, setActiveAlarm] = useState<TaskOccurrence | null>(null)
  const [ringSeconds, setRingSeconds] = useState(0)
  const [muted, setMuted] = useState(false)
  const [snoozeMinutes, setSnoozeMinutes] = useState(5)
  const [submitting, setSubmitting] = useState(false)
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false)

  const audioHandleRef = useRef<{ stop: () => void } | null>(null)
  const timerRef = useRef<number | null>(null)

  // Periodic check for due alarms while app is active
  useEffect(() => {
    let isChecking = false

    const checkAlarms = async () => {
      if (isChecking || activeAlarm) return
      isChecking = true
      try {
        const res = await fetchDueAlarms()
        if (res.due_alarms && res.due_alarms.length > 0) {
          const topAlarm = res.due_alarms[0]
          activateAlarm(topAlarm)
        }
      } catch (err) {
        // Silent catch for background polling
      } finally {
        isChecking = false
      }
    }

    // Check immediately and then every 20 seconds
    checkAlarms()
    const interval = window.setInterval(checkAlarms, 20_000)

    return () => {
      window.clearInterval(interval)
    }
  }, [activeAlarm])

  // Activate an alarm
  const activateAlarm = async (occ: TaskOccurrence) => {
    setActiveAlarm(occ)
    setRingSeconds(0)

    // Call API to mark ringing
    try {
      await triggerAlarm(occ.id)
    } catch {}

    // Determine sound rule
    const rule = occ.routine?.alarm_rule || occ.routine?.alarmRule
    const soundKey: AlarmSoundType = (rule?.sound as AlarmSoundType) || "flowing_water"

    // Start audio playback
    if (!muted) {
      if (audioHandleRef.current) {
        audioHandleRef.current.stop()
      }
      audioHandleRef.current = soundManager.play(soundKey, { loop: true })
    }

    // Start ring duration stopwatch
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = window.setInterval(() => {
      setRingSeconds((s) => s + 1)
    }, 1000)
  }

  // Cleanup audio & timer
  const stopAudio = () => {
    if (audioHandleRef.current) {
      audioHandleRef.current.stop()
      audioHandleRef.current = null
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  // Handle Mute toggle
  const toggleMute = () => {
    if (muted) {
      setMuted(false)
      const rule = activeAlarm?.routine?.alarm_rule || activeAlarm?.routine?.alarmRule
      const soundKey = (rule?.sound as AlarmSoundType) || "flowing_water"
      audioHandleRef.current = soundManager.play(soundKey, { loop: true })
    } else {
      setMuted(true)
      if (audioHandleRef.current) {
        audioHandleRef.current.stop()
        audioHandleRef.current = null
      }
    }
  }

  // Handle Acknowledge & Start Routine
  const handleAcknowledge = async () => {
    if (!activeAlarm) return
    setSubmitting(true)
    stopAudio()

    try {
      const res = await acknowledgeAlarm(activeAlarm.id)
      notify(`Alarm acknowledged for "${activeAlarm.routine?.title}"`)
      const occurrenceToRun = res.occurrence || activeAlarm
      setActiveAlarm(null)
      onStartRoutine(occurrenceToRun)
    } catch (err: any) {
      notify(err.message || "Failed to acknowledge alarm")
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Snooze
  const handleSnooze = async () => {
    if (!activeAlarm) return
    setSubmitting(true)
    stopAudio()

    try {
      await snoozeAlarm(activeAlarm.id, snoozeMinutes)
      notify(`Alarm snoozed for ${snoozeMinutes} minutes`)
      setActiveAlarm(null)
    } catch (err: any) {
      notify(err.message || "Failed to snooze alarm")
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Emergency Stop
  const handleEmergencyStop = async () => {
    setSubmitting(true)
    stopAudio()
    try {
      const res = await emergencyStopAlarms()
      notify(`Emergency Stop: Silenced ${res.stopped_count} alarm(s)`)
      setActiveAlarm(null)
      setShowEmergencyConfirm(false)
    } catch (err: any) {
      notify(err.message || "Emergency stop failed")
    } finally {
      setSubmitting(false)
    }
  }

  if (!activeAlarm) return null

  const activeRule = activeAlarm.routine?.alarm_rule || activeAlarm.routine?.alarmRule
  const soundName = activeRule?.sound || "flowing_water"
  const firstStep = activeAlarm.routine?.steps?.[0]
  const maxAttempts = activeRule?.max_attempts || 3
  const currentAttempt = (activeAlarm.alarm_attempts || 0) + 1

  return (
    <div
      className="alarm-overlay-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(5, 11, 20, 0.94)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        className="surface-card alarm-card animate-pulse-subtle"
        style={{
          maxWidth: 480,
          width: "100%",
          padding: "24px",
          border: "1px solid rgba(116, 199, 195, 0.4)",
          boxShadow: "0 0 50px rgba(116, 199, 195, 0.2)",
          borderRadius: 16,
          background: "linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 16, 30, 0.98) 100%)",
          position: "relative",
        }}
        role="alertdialog"
        aria-labelledby="alarm-title"
      >
        {/* Top Controls Bar */}
        <div className="flex items-center justify-between" style={{ marginBottom: "16px" }}>
          <div className="flex items-center gap-2">
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(116, 199, 195, 0.2)",
                color: "#74c7c3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bell size={18} />
            </span>
            <span style={{ fontSize: "0.78rem", color: "#74c7c3", fontWeight: 600, textTransform: "uppercase" }}>
              Routine Alarm Active · Ringing {ringSeconds}s
            </span>
          </div>

          <button
            type="button"
            onClick={toggleMute}
            className="icon-action"
            title={muted ? "Unmute audio" : "Mute audio"}
            style={{ color: muted ? "#f87171" : "#fff" }}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>

        {/* Main Routine Title & Info */}
        <div style={{ textAlign: "center", margin: "16px 0 20px" }}>
          <p className="eyebrow" style={{ color: "#38bdf8", margin: "0 0 4px" }}>
            {activeAlarm.routine?.category || "ROUTINE"}
          </p>
          <h2 id="alarm-title" style={{ fontSize: "1.6rem", margin: "0 0 8px", color: "#fff" }}>
            {activeAlarm.routine?.title}
          </h2>

          <div className="flex items-center justify-center gap-2" style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.6)" }}>
            <Clock size={13} />
            <span>Scheduled for {new Date(activeAlarm.due_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            <span>•</span>
            <span>Attempt {currentAttempt} of {maxAttempts}</span>
          </div>
        </div>

        {/* Next Step Preview */}
        {firstStep && (
          <div
            style={{
              padding: "12px 14px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            <div className="flex items-center justify-between" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}>
              <span>FIRST STEP AHEAD</span>
              <span>{firstStep.estimated_duration} min</span>
            </div>
            <strong style={{ color: "#fff", fontSize: "0.95rem" }}>
              {firstStep.title}
            </strong>
            {firstStep.description && (
              <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "rgba(255,255,255,0.7)" }}>
                {firstStep.description}
              </p>
            )}
          </div>
        )}

        {/* Sound Active indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            fontSize: "0.78rem",
            color: "rgba(255,255,255,0.5)",
            marginBottom: "20px",
          }}
        >
          {soundName === "flowing_water" ? (
            <Waves size={14} style={{ color: "#38bdf8" }} />
          ) : (
            <Sparkles size={14} style={{ color: "#74c7c3" }} />
          )}
          <span>Sound: {soundName.replace("_", " ")}</span>
        </div>

        {/* Actions Grid */}
        <div className="flex flex-col gap-3">
          {/* Acknowledge Button */}
          <button
            type="button"
            onClick={handleAcknowledge}
            disabled={submitting}
            className="button button-primary"
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "0.95rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              borderRadius: "8px",
            }}
          >
            <Play size={16} fill="#0f172a" /> Acknowledge &amp; Start Routine
          </button>

          {/* Snooze Row */}
          <div className="flex items-center gap-2">
            <select
              value={snoozeMinutes}
              onChange={(e) => setSnoozeMinutes(parseInt(e.target.value, 10))}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "6px",
                padding: "8px 12px",
                color: "#fff",
                fontSize: "0.85rem",
                flex: "0 0 110px",
              }}
            >
              <option value={3}>3 min</option>
              <option value={5}>5 min</option>
              <option value={10}>10 min</option>
              <option value={15}>15 min</option>
            </select>

            <button
              type="button"
              onClick={handleSnooze}
              disabled={submitting}
              className="button button-subtle"
              style={{
                flex: 1,
                padding: "8px 14px",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <RotateCcw size={14} /> Snooze Reminder
            </button>
          </div>

          {/* Emergency Stop Toggle */}
          {!showEmergencyConfirm ? (
            <button
              type="button"
              onClick={() => setShowEmergencyConfirm(true)}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.4)",
                fontSize: "0.78rem",
                cursor: "pointer",
                padding: "6px",
                textAlign: "center",
              }}
            >
              Emergency Stop
            </button>
          ) : (
            <div
              style={{
                padding: "8px 12px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: "0.78rem", color: "#fca5a5" }}>Silence all alarms?</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmergencyConfirm(false)}
                  style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEmergencyStop}
                  disabled={submitting}
                  style={{
                    background: "#ef4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "3px 8px",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                  }}
                >
                  Confirm Stop
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Browser Limitations Notice */}
        <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px dashed rgba(255,255,255,0.08)", fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", textAlign: "center" }}>
          In-browser foreground alarm experience. Keep this tab open for live acoustic reminders.
        </div>
      </div>
    </div>
  )
}
