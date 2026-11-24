"use client"

import { useEffect, useState } from "react"
import {
  CheckCircle2,
  Circle,
  Clock,
  Play,
  Pause,
  SkipForward,
  AlertTriangle,
  X,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Timer,
  Check,
  Camera,
  Upload,
  Waves,
  Volume2,
  VolumeX,
  Plus,
  Minus,
  ListChecks,
  Eye,
} from "lucide-react"
import {
  type TaskOccurrence,
  type RoutineStep,
  type StepCompletion,
  completeStep,
  skipStep,
  completeOccurrence,
  pauseOccurrence,
  startOccurrence,
  submitStructuredEvidence,
} from "@/lib/api"
import { soundManager } from "@/lib/audio-manager"
import { CameraCaptureModal } from "@/components/camera-capture-modal"

interface TaskExecutionModalProps {
  occurrence: TaskOccurrence
  onClose: () => void
  onUpdated: (updated: TaskOccurrence) => void
  notify: (msg: string) => void
}

export function TaskExecutionModal({
  occurrence: initialOccurrence,
  onClose,
  onUpdated,
  notify,
}: TaskExecutionModalProps) {
  const [occurrence, setOccurrence] = useState<TaskOccurrence>(initialOccurrence)
  const [secondsElapsed, setSecondsElapsed] = useState(0)
  const [isRunning, setIsRunning] = useState(occurrence.status === "in_progress")
  const [overrideModalStep, setOverrideModalStep] = useState<RoutineStep | null>(null)
  const [overrideReason, setOverrideReason] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Phase 05: Verification & Audio States
  const [activeCameraStep, setActiveCameraStep] = useState<RoutineStep | null>(null)
  const [activeAudioHandle, setActiveAudioHandle] = useState<{ stop: () => void } | null>(null)
  const [audioPlayingStepId, setAudioPlayingStepId] = useState<number | null>(null)
  const [stepTimerSeconds, setStepTimerSeconds] = useState<Record<number, number>>({})
  const [stepTimerActive, setStepTimerActive] = useState<Record<number, boolean>>({})
  const [stepCounters, setStepCounters] = useState<Record<number, number>>({})

  // Cleanup audio on modal close
  useEffect(() => {
    return () => {
      if (activeAudioHandle) {
        activeAudioHandle.stop()
      }
    }
  }, [activeAudioHandle])

  // Step Timer Interval
  useEffect(() => {
    const activeIds = Object.keys(stepTimerActive).filter((k) => stepTimerActive[Number(k)])
    if (activeIds.length === 0) return

    const timer = window.setInterval(() => {
      setStepTimerSeconds((prev) => {
        const next = { ...prev }
        activeIds.forEach((idStr) => {
          const id = Number(idStr)
          next[id] = (next[id] || 0) + 1
        })
        return next
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [stepTimerActive])

  // Toggle audio playback for Wudu / step ambient
  const handleToggleAudio = (stepId: number, soundKey: "flowing_water" | "gentle_chime" = "flowing_water") => {
    if (audioPlayingStepId === stepId) {
      if (activeAudioHandle) activeAudioHandle.stop()
      setActiveAudioHandle(null)
      setAudioPlayingStepId(null)
    } else {
      if (activeAudioHandle) activeAudioHandle.stop()
      const handle = soundManager.play(soundKey, { loop: true })
      setActiveAudioHandle(handle)
      setAudioPlayingStepId(stepId)
    }
  }

  // Handle structured counter verification
  const handleCompleteCounter = async (step: RoutineStep) => {
    if (!step.id) return
    const count = stepCounters[step.id] || 1
    try {
      setIsSubmitting(true)
      const res = await submitStructuredEvidence(occurrence.id, step.id, "counter", { count })
      setOccurrence(res.occurrence)
      onUpdated(res.occurrence)
      notify(`Counter recorded (${count}) for "${step.title}"`)
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit counter verification")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle structured timer verification
  const handleCompleteTimer = async (step: RoutineStep) => {
    if (!step.id) return
    const elapsed = stepTimerSeconds[step.id] || 0
    try {
      setIsSubmitting(true)
      const res = await submitStructuredEvidence(occurrence.id, step.id, "timer", { elapsed_seconds: elapsed })
      setOccurrence(res.occurrence)
      onUpdated(res.occurrence)
      setStepTimerActive((prev) => ({ ...prev, [step.id!]: false }))
      notify(`Timer session verified (${elapsed}s) for "${step.title}"`)
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit timer verification")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Timer
  useEffect(() => {
    let interval: number | undefined
    if (isRunning) {
      interval = window.setInterval(() => {
        setSecondsElapsed((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning])

  const steps: RoutineStep[] = occurrence.routine?.steps || []
  const completions: StepCompletion[] = occurrence.step_completions || []

  const getStepStatus = (stepId?: number) => {
    if (!stepId) return "pending"
    const comp = completions.find((c) => c.routine_step_id === stepId)
    return comp ? comp.status : "pending"
  }

  // Active step is first pending step
  const activeStep = steps.find((s) => getStepStatus(s.id) === "pending")

  const handleStart = async () => {
    try {
      setIsSubmitting(true)
      const res = await startOccurrence(occurrence.id)
      setOccurrence(res.occurrence)
      onUpdated(res.occurrence)
      setIsRunning(true)
      notify("Routine started")
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to start routine")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePauseResume = async () => {
    if (isRunning) {
      try {
        const res = await pauseOccurrence(occurrence.id)
        setOccurrence(res.occurrence)
        onUpdated(res.occurrence)
        setIsRunning(false)
        notify("Routine paused")
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to pause")
      }
    } else {
      handleStart()
    }
  }

  const handleCompleteStep = async (step: RoutineStep) => {
    if (!step.id) return
    try {
      setIsSubmitting(true)
      setErrorMessage("")
      const res = await completeStep(occurrence.id, step.id)
      setOccurrence(res.occurrence)
      onUpdated(res.occurrence)
      notify(`Step completed: ${step.title}`)
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to mark step complete")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkipStep = async (step: RoutineStep, override = false) => {
    if (!step.id) return
    try {
      setIsSubmitting(true)
      setErrorMessage("")
      const res = await skipStep(occurrence.id, step.id, override, overrideReason)
      setOccurrence(res.occurrence)
      onUpdated(res.occurrence)
      setOverrideModalStep(null)
      setOverrideReason("")
      notify(override ? `Step overridden: ${step.title}` : `Step skipped: ${step.title}`)
    } catch (err: any) {
      if (err.data?.requires_override) {
        setOverrideModalStep(step)
      } else {
        setErrorMessage(err.message || "Failed to skip step")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCompleteRoutine = async (force = false) => {
    try {
      setIsSubmitting(true)
      setErrorMessage("")
      const res = await completeOccurrence(occurrence.id, force)
      setOccurrence(res.occurrence)
      onUpdated(res.occurrence)
      setIsRunning(false)
      notify("Routine completed successfully! Well done.")
      window.setTimeout(() => onClose(), 1500)
    } catch (err: any) {
      if (err.data?.incomplete_required_steps) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage(err.message || "Failed to complete routine")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s < 10 ? "0" : ""}${s}`
  }

  const isCompleted = occurrence.status === "completed" || occurrence.status === "partially_completed"

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="task-execution-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="execution-dialog-title"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "1.25rem",
          maxWidth: "560px",
          width: "92vw",
          padding: "1.75rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.45)",
          color: "var(--foreground)",
          position: "relative",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "var(--primary)",
                  textTransform: "uppercase",
                }}
              >
                Task Execution Engine · {occurrence.routine?.category || "Routine"}
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: isCompleted ? "rgba(116, 199, 195, 0.2)" : "var(--muted)",
                  color: isCompleted ? "var(--primary)" : "var(--muted-foreground)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                {occurrence.status.replace("_", " ")}
              </span>
            </div>
            <h2 id="execution-dialog-title" style={{ fontSize: "1.35rem", margin: 0, fontWeight: 700 }}>
              {occurrence.routine?.title}
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

        {/* Timer Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--muted)",
            padding: "0.75rem 1rem",
            borderRadius: "0.75rem",
            marginBottom: "1.25rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Timer size={18} style={{ color: "var(--primary)" }} />
            <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>Elapsed time:</span>
            <strong style={{ fontFamily: "monospace", fontSize: "1.1rem" }}>{formatSeconds(secondsElapsed)}</strong>
          </div>
          {!isCompleted && (
            <button
              type="button"
              className="button button-secondary"
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
              onClick={handlePauseResume}
              disabled={isSubmitting}
            >
              {isRunning ? (
                <>
                  <Pause size={14} /> Pause
                </>
              ) : (
                <>
                  <Play size={14} /> Resume
                </>
              )}
            </button>
          )}
        </div>

        {/* Error / Notice Alert */}
        {errorMessage && (
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "0.6rem",
              color: "#f87171",
              fontSize: "0.85rem",
              marginBottom: "1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{errorMessage}</span>
            <button
              type="button"
              style={{
                fontSize: "0.75rem",
                textDecoration: "underline",
                background: "none",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                paddingLeft: "0.5rem",
              }}
              onClick={() => handleCompleteRoutine(true)}
            >
              Force Finish Anyway
            </button>
          </div>
        )}

        {/* Steps List */}
        <div style={{ flex: 1, overflowY: "auto", marginBottom: "1.25rem", paddingRight: "4px" }}>
          <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", margin: "0 0 0.5rem" }}>
            ROUTINE STEPS ({steps.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {steps.map((step, idx) => {
              const status = getStepStatus(step.id)
              const isStepCompleted = status === "completed" || status === "overridden"
              const isStepSkipped = status === "skipped"
              const isActive = activeStep?.id === step.id && !isCompleted

              return (
                <div
                  key={step.id || idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.75rem",
                    border: isActive
                      ? "1px solid var(--primary)"
                      : "1px solid var(--border)",
                    background: isActive
                      ? "rgba(116, 199, 195, 0.08)"
                      : isStepCompleted
                      ? "rgba(255, 255, 255, 0.02)"
                      : "transparent",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
                    <button
                      type="button"
                      style={{
                        background: "none",
                        border: "none",
                        color: isStepCompleted
                          ? "var(--primary)"
                          : isStepSkipped
                          ? "var(--muted-foreground)"
                          : "var(--muted-foreground)",
                        cursor: isCompleted ? "default" : "pointer",
                        padding: 0,
                        display: "flex",
                      }}
                      onClick={() => !isCompleted && handleCompleteStep(step)}
                      disabled={isCompleted || isSubmitting}
                      title={isStepCompleted ? "Completed" : "Click to mark complete"}
                    >
                      {isStepCompleted ? (
                        <CheckCircle2 size={20} />
                      ) : isStepSkipped ? (
                        <SkipForward size={20} />
                      ) : (
                        <Circle size={20} />
                      )}
                    </button>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: "0.92rem",
                            textDecoration: isStepCompleted ? "line-through" : "none",
                            color: isStepCompleted
                              ? "var(--muted-foreground)"
                              : "var(--foreground)",
                          }}
                        >
                          {step.title}
                        </span>
                        {step.required && (
                          <span
                            style={{
                              fontSize: "0.68rem",
                              background: "rgba(244, 63, 94, 0.15)",
                              color: "#fb7185",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              fontWeight: 600,
                            }}
                          >
                            Required
                          </span>
                        )}
                      </div>
                      {step.description && (
                        <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                          {step.description}
                        </p>
                      )}

                      {/* Ambient Audio Cue (e.g. Wudu Water) */}
                      {step.id && (step.title.toLowerCase().includes("wudu") || (step.description && step.description.toLowerCase().includes("wudu"))) && (
                        <button
                          type="button"
                          onClick={() => handleToggleAudio(step.id!, "flowing_water")}
                          style={{
                            marginTop: "6px",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            border: "1px solid rgba(56, 189, 248, 0.3)",
                            background: audioPlayingStepId === step.id ? "rgba(56, 189, 248, 0.2)" : "rgba(56, 189, 248, 0.05)",
                            color: "#38bdf8",
                            fontSize: "0.72rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            cursor: "pointer",
                          }}
                        >
                          <Waves size={12} /> {audioPlayingStepId === step.id ? "Pause Water Sound" : "Play Water Sound"}
                        </button>
                      )}
                    </div>
                  </div>

                  {!isCompleted && status === "pending" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      {/* Step-specific verification triggers */}
                      {((step.verification_type as string) === "camera" || (step.verification_type as string) === "upload" || (step.verification_type as string) === "photo") ? (
                        <button
                          type="button"
                          className="button button-primary"
                          style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          onClick={() => setActiveCameraStep(step)}
                          disabled={isSubmitting}
                        >
                          <Camera size={13} /> Photo Proof
                        </button>
                      ) : step.verification_type === "timer" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ fontSize: "0.8rem", color: "#38bdf8", fontWeight: 600 }}>
                            {stepTimerSeconds[step.id!] || 0}s
                          </span>
                          <button
                            type="button"
                            className="button button-subtle"
                            style={{ padding: "0.25rem 0.4rem", fontSize: "0.75rem" }}
                            onClick={() => setStepTimerActive(prev => ({ ...prev, [step.id!]: !prev[step.id!] }))}
                          >
                            {stepTimerActive[step.id!] ? <Pause size={12} /> : <Play size={12} />}
                          </button>
                          <button
                            type="button"
                            className="button button-primary"
                            style={{ padding: "0.35rem 0.6rem", fontSize: "0.78rem" }}
                            onClick={() => handleCompleteTimer(step)}
                            disabled={isSubmitting}
                          >
                            Verify
                          </button>
                        </div>
                      ) : step.verification_type === "counter" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <button
                            type="button"
                            className="button button-subtle"
                            style={{ padding: "0.2rem 0.4rem" }}
                            onClick={() => setStepCounters(prev => ({ ...prev, [step.id!]: Math.max(0, (prev[step.id!] || 0) - 1) }))}
                          >
                            <Minus size={12} />
                          </button>
                          <span style={{ minWidth: "20px", textAlign: "center", fontSize: "0.82rem", fontWeight: 600 }}>
                            {stepCounters[step.id!] || 0}
                          </span>
                          <button
                            type="button"
                            className="button button-subtle"
                            style={{ padding: "0.2rem 0.4rem" }}
                            onClick={() => setStepCounters(prev => ({ ...prev, [step.id!]: (prev[step.id!] || 0) + 1 }))}
                          >
                            <Plus size={12} />
                          </button>
                          <button
                            type="button"
                            className="button button-primary"
                            style={{ padding: "0.35rem 0.6rem", fontSize: "0.78rem", marginLeft: "2px" }}
                            onClick={() => handleCompleteCounter(step)}
                            disabled={isSubmitting}
                          >
                            Submit
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="button button-primary"
                          style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                          onClick={() => handleCompleteStep(step)}
                          disabled={isSubmitting}
                        >
                          <Check size={14} /> Done
                        </button>
                      )}

                      <button
                        type="button"
                        className="button button-secondary"
                        style={{ padding: "0.35rem 0.5rem", fontSize: "0.8rem" }}
                        onClick={() => handleSkipStep(step, false)}
                        disabled={isSubmitting}
                        title={step.required ? "Required step (requires override)" : "Skip optional step"}
                      >
                        <SkipForward size={14} /> Skip
                      </button>
                    </div>
                  )}

                  {status === "overridden" && (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "#f59e0b",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <ShieldAlert size={14} /> Overridden
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
          <div>
            {isCompleted ? (
              <span style={{ color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={18} /> Routine finished!
              </span>
            ) : (
              <span style={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>
                {completions.filter((c) => c.status === "completed" || c.status === "overridden").length} of {steps.length} steps completed
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="button button-secondary" onClick={onClose}>
              Close
            </button>
            {!isCompleted && (
              <button
                type="button"
                className="button button-primary"
                onClick={() => handleCompleteRoutine(false)}
                disabled={isSubmitting}
              >
                <CheckCircle2 size={16} /> Complete Routine
              </button>
            )}
          </div>
        </div>

        {/* Override Required Step Dialog */}
        {overrideModalStep && (
          <div
            className="dialog-backdrop"
            style={{ zIndex: 110 }}
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOverrideModalStep(null)
            }}
          >
            <div
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "1rem",
                padding: "1.5rem",
                maxWidth: "420px",
                width: "90vw",
                color: "var(--foreground)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <AlertTriangle size={20} style={{ color: "#f59e0b" }} />
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Override Required Step</h3>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)", margin: "0 0 1rem" }}>
                <strong>&quot;{overrideModalStep.title}&quot;</strong> is marked as a required step. Please provide a reason to override and skip it.
              </p>
              <label style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                Reason for override (optional):
              </label>
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Traveling, excused, time limitation..."
                style={{
                  width: "100%",
                  padding: "0.6rem 0.8rem",
                  margin: "0.35rem 0 1.25rem",
                  background: "var(--muted)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  color: "inherit",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setOverrideModalStep(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => handleSkipStep(overrideModalStep, true)}
                  disabled={isSubmitting}
                >
                  Confirm Override
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Camera Capture & Verification Modal */}
        {activeCameraStep && (
          <CameraCaptureModal
            occurrence={occurrence}
            stepId={activeCameraStep.id!}
            stepTitle={activeCameraStep.title}
            allowGallery={true}
            onClose={() => setActiveCameraStep(null)}
            onSuccess={(evidence, updatedOcc) => {
              setOccurrence(updatedOcc)
              onUpdated(updatedOcc)
              setActiveCameraStep(null)
            }}
            notify={notify}
          />
        )}
      </div>
    </div>
  )
}
