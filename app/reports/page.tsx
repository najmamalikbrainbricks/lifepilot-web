"use client"

import { useState, useEffect } from "react"
import {
  BarChart3,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Camera,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Eye,
  Trash2,
  X,
  Activity,
  Award,
} from "lucide-react"
import {
  type AccountabilitySummary,
  type AccountabilityHistoryItem,
  fetchAccountabilitySummary,
  fetchAccountabilityHistory,
  fetchEvidenceBlob,
  deleteEvidence,
  ensureAuthenticatedUser,
} from "@/lib/api"
import { useLifePilot } from "@/components/lifepilot-context"

export default function ReportsPage() {
  const { notify } = useLifePilot()
  const [summary, setSummary] = useState<AccountabilitySummary | null>(null)
  const [history, setHistory] = useState<AccountabilityHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Evidence preview state
  const [previewEvidenceId, setPreviewEvidenceId] = useState<number | null>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError("")
    try {
      await ensureAuthenticatedUser()
      const [sumRes, histRes] = await Promise.all([
        fetchAccountabilitySummary(),
        fetchAccountabilityHistory(30),
      ])
      setSummary(sumRes)
      setHistory(histRes.history || [])
    } catch (err: any) {
      console.warn("Error loading accountability reports:", err)
      setError(err.message || "Failed to load accountability reports from API")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Open secure evidence preview
  const handleOpenPreview = async (evidenceId: number) => {
    setPreviewEvidenceId(evidenceId)
    setPreviewLoading(true)
    try {
      const blob = await fetchEvidenceBlob(evidenceId)
      const url = URL.createObjectURL(blob)
      setPreviewImageUrl(url)
    } catch (err: any) {
      notify(err.message || "Failed to load proof image")
      setPreviewEvidenceId(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleClosePreview = () => {
    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl)
    }
    setPreviewEvidenceId(null)
    setPreviewImageUrl(null)
  }

  const handleDeleteEvidence = async (evidenceId: number) => {
    try {
      await deleteEvidence(evidenceId)
      notify("Evidence proof removed")
      handleClosePreview()
      loadData()
    } catch (err: any) {
      notify(err.message || "Failed to delete evidence")
    }
  }

  const metrics = summary?.metrics || {
    total_scheduled: 0,
    completed_routines: 0,
    missed_routines: 0,
    verified_completions: 0,
    self_reported_completions: 0,
    average_delay_minutes: 0,
    completion_rate: 100,
  }

  return (
    <div className="reports-page flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>ACCOUNTABILITY &amp; INTEGRITY</p>
          <h1 style={{ fontSize: "1.75rem", margin: "4px 0 0" }}>Your Progress &amp; Evidence</h1>
          <p style={{ margin: "2px 0 0", color: "rgba(255, 255, 255, 0.6)", fontSize: "0.85rem" }}>
            Real recorded routine execution, multi-step proof submissions, and alarm punctuality metrics.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="button button-subtle"
          style={{ fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh Reports
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="surface-card" style={{ padding: "14px 18px" }}>
          <div className="flex items-center justify-between">
            <p className="eyebrow" style={{ margin: 0, fontSize: "0.68rem" }}>COMPLETION RATE</p>
            <Award size={16} style={{ color: "#74c7c3" }} />
          </div>
          <div className="flex items-baseline gap-2" style={{ marginTop: "6px" }}>
            <strong style={{ fontSize: "1.6rem", color: "#74c7c3" }}>
              {metrics.completion_rate}%
            </strong>
            <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
              ({metrics.completed_routines} / {metrics.total_scheduled})
            </span>
          </div>
        </div>

        <div className="surface-card" style={{ padding: "14px 18px" }}>
          <div className="flex items-center justify-between">
            <p className="eyebrow" style={{ margin: 0, fontSize: "0.68rem" }}>VERIFIED PROOFS</p>
            <ShieldCheck size={16} style={{ color: "#38bdf8" }} />
          </div>
          <div className="flex items-baseline gap-2" style={{ marginTop: "6px" }}>
            <strong style={{ fontSize: "1.6rem", color: "#38bdf8" }}>
              {metrics.verified_completions}
            </strong>
            <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
              camera/timer/counter
            </span>
          </div>
        </div>

        <div className="surface-card" style={{ padding: "14px 18px" }}>
          <div className="flex items-center justify-between">
            <p className="eyebrow" style={{ margin: 0, fontSize: "0.68rem" }}>SELF-REPORTED</p>
            <CheckCircle2 size={16} style={{ color: "#a855f7" }} />
          </div>
          <div className="flex items-baseline gap-2" style={{ marginTop: "6px" }}>
            <strong style={{ fontSize: "1.6rem", color: "#c084fc" }}>
              {metrics.self_reported_completions}
            </strong>
            <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
              confirmed
            </span>
          </div>
        </div>

        <div className="surface-card" style={{ padding: "14px 18px" }}>
          <div className="flex items-center justify-between">
            <p className="eyebrow" style={{ margin: 0, fontSize: "0.68rem" }}>AVERAGE START DELAY</p>
            <Clock size={16} style={{ color: metrics.average_delay_minutes > 15 ? "#f87171" : "#74c7c3" }} />
          </div>
          <div className="flex items-baseline gap-2" style={{ marginTop: "6px" }}>
            <strong style={{ fontSize: "1.6rem", color: metrics.average_delay_minutes > 15 ? "#f87171" : "#fff" }}>
              {metrics.average_delay_minutes}m
            </strong>
            <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
              after scheduled
            </span>
          </div>
        </div>
      </div>

      {/* Category Breakdown & Proof Gallery */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Category Breakdown (1 col) */}
        <section className="surface-card lg:col-span-1" style={{ padding: "18px" }}>
          <h2 style={{ fontSize: "1.05rem", margin: "0 0 4px" }}>Activity Breakdown</h2>
          <p style={{ margin: "0 0 14px", fontSize: "0.78rem", color: "rgba(255,255,255,0.5)" }}>
            Distribution of completed routines by life category.
          </p>

          {!summary?.category_breakdown || summary.category_breakdown.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", padding: "20px 0", textAlign: "center" }}>
              No completed activities recorded in this period.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {summary.category_breakdown.map((item, idx) => (
                <div key={idx} style={{ padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: "6px" }}>
                  <div className="flex items-center justify-between" style={{ fontSize: "0.85rem" }}>
                    <strong style={{ color: "#fff" }}>{item.category}</strong>
                    <span style={{ color: "#74c7c3", fontWeight: 600 }}>{item.count} sessions</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>
                    <span>Estimated: {item.estimated_minutes}m</span>
                    <span>Actual: {Math.round(item.actual_seconds / 60)}m</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Proof Submissions Gallery (2 cols) */}
        <section className="surface-card lg:col-span-2" style={{ padding: "18px" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: "12px" }}>
            <div>
              <h2 style={{ fontSize: "1.05rem", margin: "0 0 4px" }}>Recent Verification Evidence</h2>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "rgba(255,255,255,0.5)" }}>
                Photographic, timer, and counter proofs captured during routine steps.
              </p>
            </div>
            <span style={{ fontSize: "0.75rem", color: "#38bdf8" }}>
              Private MySQL Storage
            </span>
          </div>

          {!summary?.recent_evidence || summary.recent_evidence.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>
              No photographic or structured proof submissions recorded yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {summary.recent_evidence.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "8px",
                    padding: "10px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "6px",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      style={{
                        fontSize: "0.68rem",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        background: "rgba(56, 189, 248, 0.15)",
                        color: "#38bdf8",
                        textTransform: "uppercase",
                      }}
                    >
                      {ev.evidence_type}
                    </span>

                    {ev.has_image && (
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(ev.id)}
                        className="lp-icon-action"
                        title="View photo proof"
                        style={{ padding: "2px" }}
                      >
                        <Eye size={14} />
                      </button>
                    )}
                  </div>

                  <div>
                    <strong style={{ fontSize: "0.82rem", color: "#fff", display: "block" }}>
                      {ev.step_title}
                    </strong>
                    <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }}>
                      {ev.routine_title}
                    </span>
                  </div>

                  <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.4)" }}>
                    {new Date(ev.submitted_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Chronological Task & Alarm History Table */}
      <section className="surface-card" style={{ padding: "20px" }}>
        <div className="flex items-center justify-between pb-4 border-b border-[rgba(255,255,255,0.08)]">
          <div>
            <h2 style={{ fontSize: "1.15rem", margin: 0 }}>Task Execution &amp; Alarm Audit Log</h2>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
              Detailed audit trail of scheduled times, actual start times, alarm reminders, and verification results.
            </p>
          </div>
          <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)" }}>
            Showing last {history.length} events
          </span>
        </div>

        {history.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
            No task occurrences logged yet. Completed and missed routines will appear here.
          </div>
        ) : (
          <div style={{ overflowX: "auto", marginTop: "14px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", textAlign: "left" }}>
                  <th style={{ padding: "10px 12px" }}>Routine</th>
                  <th style={{ padding: "10px 12px" }}>Scheduled</th>
                  <th style={{ padding: "10px 12px" }}>Started</th>
                  <th style={{ padding: "10px 12px" }}>Delay</th>
                  <th style={{ padding: "10px 12px" }}>Reminders</th>
                  <th style={{ padding: "10px 12px" }}>Steps</th>
                  <th style={{ padding: "10px 12px" }}>Proof Status</th>
                  <th style={{ padding: "10px 12px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <td style={{ padding: "12px" }}>
                      <strong style={{ color: "#fff" }}>{row.routine_title}</strong>
                      <span style={{ marginLeft: "8px", fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>
                        {row.category}
                      </span>
                    </td>
                    <td style={{ padding: "12px", color: "rgba(255,255,255,0.8)" }}>
                      {row.scheduled_due_at}
                    </td>
                    <td style={{ padding: "12px", color: "rgba(255,255,255,0.8)" }}>
                      {row.started_at || "—"}
                    </td>
                    <td style={{ padding: "12px" }}>
                      {row.delay_minutes > 0 ? (
                        <span style={{ color: row.delay_minutes > 15 ? "#f87171" : "#eab308" }}>
                          +{row.delay_minutes}m
                        </span>
                      ) : (
                        <span style={{ color: "#74c7c3" }}>On time</span>
                      )}
                    </td>
                    <td style={{ padding: "12px", color: "rgba(255,255,255,0.7)" }}>
                      {row.reminders_count > 0 ? `${row.reminders_count} alerts` : "None"}
                    </td>
                    <td style={{ padding: "12px", color: "rgba(255,255,255,0.7)" }}>
                      {row.completed_steps} / {row.steps_count}
                    </td>
                    <td style={{ padding: "12px" }}>
                      {row.is_verified ? (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            background: "rgba(56, 189, 248, 0.15)",
                            color: "#38bdf8",
                            fontWeight: 600,
                          }}
                        >
                          Verified Proof
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
                          Self-Reported
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          background:
                            row.status === "completed"
                              ? "rgba(116, 199, 195, 0.15)"
                              : row.status === "missed"
                              ? "rgba(239, 68, 68, 0.15)"
                              : "rgba(255,255,255,0.1)",
                          color:
                            row.status === "completed"
                              ? "#74c7c3"
                              : row.status === "missed"
                              ? "#f87171"
                              : "#fff",
                          fontWeight: 600,
                          textTransform: "capitalize",
                        }}
                      >
                        {row.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Secure Evidence Preview Modal */}
      {previewEvidenceId && (
        <div className="lp-modal-backdrop" onClick={handleClosePreview}>
          <div
            className="lp-modal-content surface-card"
            style={{ maxWidth: 500, padding: 0, overflow: "hidden", borderRadius: 12 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="preview-title"
          >
            <div className="lp-modal-header" style={{ padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2">
                <span className="icon-tile icon-tile-cyan" style={{ width: 28, height: 28 }}>
                  <ShieldCheck size={16} />
                </span>
                <h3 id="preview-title" style={{ margin: 0, fontSize: "1rem" }}>
                  Verification Evidence #{previewEvidenceId}
                </h3>
              </div>
              <button type="button" onClick={handleClosePreview} className="icon-action" aria-label="Close preview">
                <X size={18} />
              </button>
            </div>

            <div style={{ background: "#050b14", minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {previewLoading ? (
                <div style={{ color: "rgba(255,255,255,0.6)", padding: "40px" }}>
                  <RefreshCw size={24} className="spin" style={{ margin: "0 auto 8px" }} />
                  <p style={{ margin: 0, fontSize: "0.85rem" }}>Loading private image from server...</p>
                </div>
              ) : previewImageUrl ? (
                <img
                  src={previewImageUrl}
                  alt="Proof inspection"
                  style={{ width: "100%", maxHeight: 400, objectFit: "contain", background: "#000" }}
                />
              ) : (
                <p style={{ color: "rgba(255,255,255,0.5)" }}>Could not load proof image</p>
              )}
            </div>

            <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <button
                type="button"
                onClick={() => handleDeleteEvidence(previewEvidenceId)}
                className="button button-subtle"
                style={{ color: "#f87171", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <Trash2 size={14} /> Delete Evidence
              </button>
              <button
                type="button"
                onClick={handleClosePreview}
                className="button button-primary"
                style={{ fontSize: "0.82rem" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
