"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
  Database,
  UploadCloud,
  Sparkles,
  AlertCircle,
  RefreshCw,
  MapPin,
  Compass,
} from "lucide-react"
import { useLifePilot } from "@/components/lifepilot-context"
import { DEFAULT_SETTINGS, SETTINGS_KEY, type PersonalSettings, type WorkShift } from "@/lib/lifepilot"
import { PageHeader } from "@/components/lifepilot-ui"
import {
  importBrowserData,
  updatePreferences,
  ensureAuthenticatedUser,
  fetchPrayerSettings,
  updatePrayerSettings,
  type MigrationSummary,
  type PrayerSetting,
} from "@/lib/api"

const sections = ["About you", "Goals", "Work shifts", "Prayer", "Sleep & fitness", "Focus & alerts", "Review"]
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const options = [
  "Five daily prayers",
  "Tahajjud",
  "Better sleep",
  "Walking",
  "Workout",
  "Agency growth",
  "Study",
  "Daily discipline",
]

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="lp-field"><span>{label}</span>{children}</label>
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="lp-switch"><span>{label}</span><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)}/></label>
}

function ShiftEditor({ shift, onChange, onDelete }: { shift: WorkShift; onChange: (next: WorkShift) => void; onDelete: () => void }) {
  return <div className="lp-shift"><div className="lp-shift-title"><strong>{shift.name || "New work shift"}</strong><button type="button" className="lp-icon-action" aria-label="Remove shift" onClick={onDelete}><Trash2 size={16}/></button></div><div className="lp-grid-two"><Field label="Job / commitment"><input value={shift.name} onChange={event => onChange({ ...shift, name: event.target.value })} placeholder="Onboarding job"/></Field><Field label="Schedule type"><select value={shift.fixed ? "fixed" : "flexible"} onChange={event => onChange({ ...shift, fixed: event.target.value === "fixed" })}><option value="fixed">Fixed</option><option value="flexible">Flexible</option></select></Field><Field label="Start time"><input type="time" value={shift.start} onChange={event => onChange({ ...shift, start: event.target.value })}/></Field><Field label="End time"><input type="time" value={shift.end} onChange={event => onChange({ ...shift, end: event.target.value })}/></Field></div><span className="lp-field-label">Working days</span><div className="lp-days">{days.map((day, index) => <button key={day} type="button" aria-pressed={shift.days.includes(index)} className={shift.days.includes(index) ? "selected" : ""} onClick={() => onChange({ ...shift, days: shift.days.includes(index) ? shift.days.filter(n => n !== index) : [...shift.days, index].sort() })}>{day}</button>)}</div>{shift.end < shift.start && <small className="lp-hint">Overnight shift — finishes the next day.</small>}</div>
}

export function LifePilotProfile() {
  const { settings, settingsReady, updateSettings, notify, theme } = useLifePilot()
  const [draft, setDraft] = useState<PersonalSettings>(DEFAULT_SETTINGS)
  const [step, setStep] = useState(0)
  const [error, setError] = useState("")
  const [resetConfirm, setResetConfirm] = useState(false)

  // Migration states
  const [isMigrating, setIsMigrating] = useState(false)
  const [migrationSummary, setMigrationSummary] = useState<MigrationSummary | null>(null)
  const [migrationError, setMigrationError] = useState("")

  // Phase 04: Islamic Prayer Engine Settings State
  const [prayerSetting, setPrayerSetting] = useState<PrayerSetting | null>(null)
  const [prayerMethod, setPrayerMethod] = useState("Karachi")
  const [asrMethod, setAsrMethod] = useState("Hanafi")
  const [prayerCity, setPrayerCity] = useState("Karachi")
  const [prayerCountry, setPrayerCountry] = useState("Pakistan")
  const [prayerLat, setPrayerLat] = useState(24.8607)
  const [prayerLng, setPrayerLng] = useState(67.0011)
  const [tahajjudDuration, setTahajjudDuration] = useState(30)
  const [tahajjudOffset, setTahajjudOffset] = useState(45)
  const [manualAdj, setManualAdj] = useState({ fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 })
  const [detectingGps, setDetectingGps] = useState(false)

  useEffect(() => {
    if (settingsReady) setDraft(settings)
  }, [settings, settingsReady])

  useEffect(() => {
    const loadPrayerSettings = async () => {
      try {
        await ensureAuthenticatedUser()
        const res = await fetchPrayerSettings()
        if (res?.settings) {
          const ps = res.settings
          setPrayerSetting(ps)
          if (ps.calculation_method) setPrayerMethod(ps.calculation_method)
          if (ps.asr_method) setAsrMethod(ps.asr_method)
          if (ps.city) setPrayerCity(ps.city)
          if (ps.country) setPrayerCountry(ps.country)
          if (ps.latitude) setPrayerLat(Number(ps.latitude))
          if (ps.longitude) setPrayerLng(Number(ps.longitude))
          if (ps.manual_adjustments) {
            setManualAdj({
              fajr: Number(ps.manual_adjustments.fajr) || 0,
              dhuhr: Number(ps.manual_adjustments.dhuhr) || 0,
              asr: Number(ps.manual_adjustments.asr) || 0,
              maghrib: Number(ps.manual_adjustments.maghrib) || 0,
              isha: Number(ps.manual_adjustments.isha) || 0,
            })
          }
          if (ps.tahajjud_preference) {
            setTahajjudDuration(Number(ps.tahajjud_preference.duration_minutes) || 30)
            setTahajjudOffset(Number(ps.tahajjud_preference.offset_before_fajr) || 45)
          }
        }
      } catch (err) {
        console.warn("Could not load backend prayer settings:", err)
      }
    }
    loadPrayerSettings()
  }, [])

  const handleDetectGps = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      notify("Geolocation is not supported by your browser")
      return
    }
    setDetectingGps(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPrayerLat(parseFloat(pos.coords.latitude.toFixed(4)))
        setPrayerLng(parseFloat(pos.coords.longitude.toFixed(4)))
        setDetectingGps(false)
        notify(`Location detected: ${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°`)
      },
      (err) => {
        setDetectingGps(false)
        notify(`Location detection failed: ${err.message}`)
      },
      { timeout: 10000 }
    )
  }

  const change = <K extends keyof PersonalSettings>(key: K, value: PersonalSettings[K]) =>
    setDraft(current => ({ ...current, [key]: value }))

  const save = async () => {
    if (!draft.name.trim()) { setStep(0); setError("Please enter your name before finishing setup."); return }
    if (draft.shifts.some(s => !s.name.trim() || !s.days.length)) { setStep(2); setError("Every work shift needs a name and at least one day."); return }
    const next = { ...draft, onboarded: true, name: draft.name.trim() }

    // Save locally
    if (updateSettings(next)) {
      setDraft(next)
      setError("")
      notify("Your personal settings are saved.")

      // Also sync to backend API if reachable
      try {
        await ensureAuthenticatedUser()
        await updatePreferences({
          theme: (theme as "dark" | "light") || "dark",
          time_format: next.timeFormat,
          sleep_goal: next.sleepGoalHours,
          bedtime: next.bedtime,
          wake_time: next.wakeTime,
          focus_goal: next.focusGoalMinutes,
          focus_category: next.focusCategory,
          reminder_preferences: {
            interval_minutes: next.reminderIntervalMinutes,
            strict_mode: next.strictMode,
            prayers_enabled: next.prayersEnabled,
            wudu_reminders: next.wuduReminders,
            tahajjud_enabled: next.tahajjudEnabled,
            prayer_method: prayerMethod,
            prayer_proof: next.prayerProof,
          },
          activity_preferences: {
            step_goal: next.stepGoal,
            workout_days: next.workoutDays,
          },
        })

        // Save prayer engine settings to backend
        await updatePrayerSettings({
          city: prayerCity,
          country: prayerCountry,
          latitude: prayerLat,
          longitude: prayerLng,
          calculation_method: prayerMethod,
          asr_method: asrMethod,
          manual_adjustments: manualAdj,
          tahajjud_preference: {
            enabled: next.tahajjudEnabled,
            duration_minutes: tahajjudDuration,
            preparation_minutes: 10,
            offset_before_fajr: tahajjudOffset,
          },
          enabled_prayers: {
            fajr: next.prayersEnabled,
            dhuhr: next.prayersEnabled,
            asr: next.prayersEnabled,
            maghrib: next.prayersEnabled,
            isha: next.prayersEnabled,
            tahajjud: next.tahajjudEnabled,
          },
        })
      } catch (err) {
        console.warn("Backend sync optional fallback:", err)
      }
    } else {
      setError("Your settings could not be saved. Check browser storage.")
    }
  }

  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings,
      tasks: (() => {
        try { return JSON.parse(localStorage.getItem("lifepilot-v1") || "[]") } catch { return [] }
      })(),
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }))
    const a = document.createElement("a"); a.href = url; a.download = "lifepilot-backup.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    return payload
  }

  const handleMigrateToDatabase = async () => {
    try {
      setIsMigrating(true)
      setMigrationError("")
      notify("Exporting local backup and migrating to MySQL database...")

      // Step 1: Export local backup first (requirement)
      const payload = exportData()

      // Step 2: Ensure auth
      await ensureAuthenticatedUser()

      // Step 3: Call migration endpoint
      const res = await importBrowserData({
        settings: payload.settings,
        tasks: payload.tasks,
      })

      setMigrationSummary(res.summary)
      notify("Database migration complete! Review the summary below.")
    } catch (err: any) {
      setMigrationError(err.message || "Migration failed. Ensure Laravel backend is running.")
    } finally {
      setIsMigrating(false)
    }
  }

  const resetProfile = () => {
    try {
      localStorage.removeItem(SETTINGS_KEY)
      updateSettings({ ...DEFAULT_SETTINGS })
      setDraft(DEFAULT_SETTINGS)
      setStep(0)
      setResetConfirm(false)
      notify("Profile settings reset; existing tasks preserved.")
    } catch {
      setError("Reset failed.")
    }
  }

  if (!settingsReady) return <div className="lp-settings-card">Loading locally saved settings…</div>

  return <div className="lp-profile-page">
    <PageHeader
      eyebrow="PERSONALIZE YOUR LIFE"
      title={settings.onboarded ? "Your LifePilot" : "Welcome to LifePilot"}
      description="Build a routine that fits your life, backed by your local MySQL database."
      action={<Link href="/" className="lp-secondary-button"><ArrowLeft size={16}/> Dashboard</Link>}
    />

    <div className="lp-profile-hero">
      <div className="lp-profile-icon"><UserRound size={24}/></div>
      <div>
        <strong>{draft.name || "Your personal space"}</strong>
        <p>Private &amp; Secure · MySQL Database (lifepilot_db) &amp; Local Storage</p>
      </div>
      <ShieldCheck size={20}/>
    </div>

    <div className="lp-step-track" aria-label="Setup progress">
      {sections.map((name, index) => (
        <button
          key={name}
          type="button"
          onClick={() => { setError(""); setStep(index) }}
          className={step === index ? "active" : step > index ? "passed" : ""}
          aria-current={step === index ? "step" : undefined}
        >
          <span>{index < step ? <CheckCircle2 size={14}/> : index + 1}</span>
          <small>{name}</small>
        </button>
      ))}
    </div>

    <section className="lp-settings-card">
      <div className="lp-step-header">
        <span>STEP {step + 1} / {sections.length}</span>
        <h2>{sections[step]}</h2>
      </div>

      {step === 0 && (
        <div className="lp-form-stack">
          <Field label="What should we call you?">
            <input required value={draft.name} onChange={event => change("name", event.target.value)} placeholder="Your name" autoComplete="name"/>
          </Field>
          <div className="lp-grid-two">
            <Field label="Preferred language">
              <select value={draft.language} onChange={event => change("language", event.target.value as PersonalSettings["language"])}>
                <option>English</option><option>Urdu</option><option>Roman Urdu</option>
              </select>
            </Field>
            <Field label="Time format">
              <select value={draft.timeFormat} onChange={event => change("timeFormat", event.target.value as PersonalSettings["timeFormat"])}>
                <option value="12h">12-hour</option><option value="24h">24-hour</option>
              </select>
            </Field>
          </div>
          <Field label="Timezone (IANA)">
            <input value={draft.timezone} onChange={event => change("timezone", event.target.value)} placeholder="Asia/Karachi"/>
          </Field>
          <button type="button" className="lp-text-button" onClick={() => change("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone)}>
            Use device timezone
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="lp-form-stack">
          <p className="lp-hint">Choose as many goals as you like. You can update these any time.</p>
          <div className="lp-goals">
            {options.map(goal => (
              <label key={goal} className={draft.goals.includes(goal) ? "chosen" : ""}>
                <input type="checkbox" checked={draft.goals.includes(goal)} onChange={event => change("goals", event.target.checked ? [...draft.goals, goal] : draft.goals.filter(g => g !== goal))}/>
                {goal}
              </label>
            ))}
          </div>
          <Field label="Custom goal">
            <input placeholder="Add custom goal, then press Enter" onKeyDown={event => {
              if (event.key === "Enter") {
                event.preventDefault()
                const value = event.currentTarget.value.trim()
                if (value && !draft.goals.includes(value)) change("goals", [...draft.goals, value])
                event.currentTarget.value = ""
              }
            }}/>
          </Field>
          {draft.goals.filter(g => !options.includes(g)).map(goal => (
            <button key={goal} type="button" className="lp-secondary-button" onClick={() => change("goals", draft.goals.filter(g => g !== goal))}>
              {goal} <X size={14}/>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="lp-form-stack">
          <p className="lp-hint">Add all jobs, studies, or recurring commitments. Overnight shifts are supported.</p>
          {draft.shifts.map(shift => (
            <ShiftEditor key={shift.id} shift={shift} onChange={next => change("shifts", draft.shifts.map(item => item.id === shift.id ? next : item))} onDelete={() => change("shifts", draft.shifts.filter(item => item.id !== shift.id))}/>
          ))}
          <button type="button" className="lp-secondary-button" onClick={() => change("shifts", [...draft.shifts, { id: crypto.randomUUID(), name: "", start: "19:00", end: "01:00", days: [1,2,3,4,5], fixed: true }])}>
            <Plus size={16}/> Add a work shift
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="lp-form-stack">
          <Switch label="Enable five daily prayer tracking" checked={draft.prayersEnabled} onChange={value => change("prayersEnabled", value)}/>
          <Switch label="Include optional Tahajjud (Night Prayer)" checked={draft.tahajjudEnabled} onChange={value => change("tahajjudEnabled", value)}/>
          <Switch label="Remind me to prepare for Wudu" checked={draft.wuduReminders} onChange={value => change("wuduReminders", value)}/>

          <div className="lp-grid-two">
            <Field label="Astronomical calculation method">
              <select value={prayerMethod} onChange={e => setPrayerMethod(e.target.value)}>
                <option value="Karachi">Univ. of Islamic Sciences, Karachi (Fajr 18°, Isha 18°)</option>
                <option value="MWL">Muslim World League (MWL) (Fajr 18°, Isha 17°)</option>
                <option value="ISNA">Islamic Society of North America (ISNA) (Fajr 15°, Isha 15°)</option>
                <option value="Egypt">Egyptian General Authority of Survey (Fajr 19.5°, Isha 17.5°)</option>
                <option value="Makkah">Umm al-Qura University, Makkah (Fajr 18.5°, Isha 90m)</option>
                <option value="Tehran">Institute of Geophysics, Tehran (Fajr 17.7°, Isha 14°)</option>
                <option value="Jafari">Shia Ithna Ashari, Leva Institute (Fajr 16°, Isha 14°)</option>
              </select>
            </Field>

            <Field label="Asr calculation jurisprudence">
              <select value={asrMethod} onChange={e => setAsrMethod(e.target.value)}>
                <option value="Hanafi">Hanafi (Shadow factor 2x — occurs later)</option>
                <option value="Standard">Standard / Shafi&apos;i, Maliki, Hanbali (Shadow factor 1x)</option>
              </select>
            </Field>
          </div>

          {/* Location & GPS */}
          <div style={{ padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: "10px" }}>
              <div className="flex items-center gap-2">
                <MapPin size={16} style={{ color: "#74c7c3" }} />
                <strong style={{ fontSize: "0.9rem", color: "#fff" }}>Location &amp; Coordinates</strong>
              </div>
              <button
                type="button"
                onClick={handleDetectGps}
                disabled={detectingGps}
                className="button button-subtle"
                style={{ fontSize: "0.78rem", padding: "4px 10px", display: "flex", alignItems: "center", gap: "4px", color: "#74c7c3" }}
              >
                <Compass size={13} /> {detectingGps ? "Detecting..." : "Detect GPS"}
              </button>
            </div>

            <div className="lp-grid-two">
              <Field label="City">
                <input value={prayerCity} onChange={e => setPrayerCity(e.target.value)} placeholder="Karachi"/>
              </Field>
              <Field label="Country">
                <input value={prayerCountry} onChange={e => setPrayerCountry(e.target.value)} placeholder="Pakistan"/>
              </Field>
              <Field label="Latitude (°N)">
                <input type="number" step="0.0001" value={prayerLat} onChange={e => setPrayerLat(parseFloat(e.target.value) || 0)}/>
              </Field>
              <Field label="Longitude (°E)">
                <input type="number" step="0.0001" value={prayerLng} onChange={e => setPrayerLng(parseFloat(e.target.value) || 0)}/>
              </Field>
            </div>
          </div>

          {/* Tahajjud window preference */}
          {draft.tahajjudEnabled && (
            <div style={{ padding: "12px 14px", background: "rgba(14, 165, 233, 0.05)", borderRadius: "8px", border: "1px solid rgba(14, 165, 233, 0.2)" }}>
              <strong style={{ fontSize: "0.9rem", color: "#38bdf8", display: "block", marginBottom: "8px" }}>
                🌙 Tahajjud Planning Preferences
              </strong>
              <div className="lp-grid-two">
                <Field label="Tahajjud duration (minutes)">
                  <input type="number" min={10} max={120} step={5} value={tahajjudDuration} onChange={e => setTahajjudDuration(parseInt(e.target.value, 10) || 30)}/>
                </Field>
                <Field label="Wake offset before Fajr (minutes)">
                  <input type="number" min={15} max={180} step={5} value={tahajjudOffset} onChange={e => setTahajjudOffset(parseInt(e.target.value, 10) || 45)}/>
                </Field>
              </div>
              <small style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>
                Calculated using the last third of the night interval (Maghrib to next Fajr).
              </small>
            </div>
          )}

          {/* Manual minute adjustments */}
          <div style={{ padding: "12px 14px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <strong style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.85)", display: "block", marginBottom: "8px" }}>
              Manual Minute Adjustments (Fine-tuning offsets)
            </strong>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
              <Field label="Fajr (m)">
                <input type="number" value={manualAdj.fajr} onChange={e => setManualAdj({ ...manualAdj, fajr: parseInt(e.target.value, 10) || 0 })}/>
              </Field>
              <Field label="Dhuhr (m)">
                <input type="number" value={manualAdj.dhuhr} onChange={e => setManualAdj({ ...manualAdj, dhuhr: parseInt(e.target.value, 10) || 0 })}/>
              </Field>
              <Field label="Asr (m)">
                <input type="number" value={manualAdj.asr} onChange={e => setManualAdj({ ...manualAdj, asr: parseInt(e.target.value, 10) || 0 })}/>
              </Field>
              <Field label="Maghrib (m)">
                <input type="number" value={manualAdj.maghrib} onChange={e => setManualAdj({ ...manualAdj, maghrib: parseInt(e.target.value, 10) || 0 })}/>
              </Field>
              <Field label="Isha (m)">
                <input type="number" value={manualAdj.isha} onChange={e => setManualAdj({ ...manualAdj, isha: parseInt(e.target.value, 10) || 0 })}/>
              </Field>
            </div>
          </div>

          <Field label="Preferred completion proof method">
            <select value={draft.prayerProof} onChange={event => change("prayerProof", event.target.value as PersonalSettings["prayerProof"])}>
              <option value="self">Private self-confirmation</option>
              <option value="photo">Optional photo reminder</option>
              <option value="checklist">Checklist</option>
            </select>
          </Field>
        </div>
      )}

      {step === 4 && (
        <div className="lp-form-stack">
          <div className="lp-grid-two">
            <Field label="Sleep goal (hours)">
              <input type="number" min={4} max={12} step={0.5} value={draft.sleepGoalHours} onChange={event => change("sleepGoalHours", Number(event.target.value))}/>
            </Field>
            <Field label="Daily step goal">
              <input type="number" min={0} max={100000} step={500} value={draft.stepGoal} onChange={event => change("stepGoal", Number(event.target.value))}/>
            </Field>
            <Field label="Preferred bedtime">
              <input type="time" value={draft.bedtime} onChange={event => change("bedtime", event.target.value)}/>
            </Field>
            <Field label="Preferred wake-up">
              <input type="time" value={draft.wakeTime} onChange={event => change("wakeTime", event.target.value)}/>
            </Field>
          </div>
          <Field label="Workout days per week">
            <input type="number" min={0} max={7} value={draft.workoutDays} onChange={event => change("workoutDays", Number(event.target.value))}/>
          </Field>
          <p className="lp-hint">Sleep and steps are goals here, not live sensor data.</p>
        </div>
      )}

      {step === 5 && (
        <div className="lp-form-stack">
          <div className="lp-grid-two">
            <Field label="Daily focus goal (minutes)">
              <input type="number" min={5} max={720} value={draft.focusGoalMinutes} onChange={event => change("focusGoalMinutes", Number(event.target.value))}/>
            </Field>
            <Field label="Focus category">
              <input value={draft.focusCategory} onChange={event => change("focusCategory", event.target.value)}/>
            </Field>
          </div>
          <Field label="Reminder interval (minutes)">
            <input type="number" min={1} max={120} value={draft.reminderIntervalMinutes} onChange={event => change("reminderIntervalMinutes", Number(event.target.value))}/>
          </Field>
          <Switch label="Prefer strict accountability reminders" checked={draft.strictMode} onChange={value => change("strictMode", value)}/>
        </div>
      )}

      {step === 6 && (
        <div className="lp-review">
          <p><strong>Profile:</strong> {draft.name || "Not set"} · {draft.language} · {draft.timezone}</p>
          <p><strong>Goals:</strong> {draft.goals.join(", ") || "None selected"}</p>
          <p><strong>Work:</strong> {draft.shifts.length ? draft.shifts.map(s => `${s.name || "Unnamed"} (${s.start}–${s.end})`).join("; ") : "No shifts configured"}</p>
          <p><strong>Prayer:</strong> {draft.prayersEnabled ? "Enabled" : "Disabled"}; Tahajjud {draft.tahajjudEnabled ? "on" : "off"}</p>
          <p><strong>Sleep:</strong> {draft.sleepGoalHours} hours target</p>
          <p><strong>Activity:</strong> {draft.stepGoal.toLocaleString()} steps, {draft.workoutDays} workout days</p>
          <p><strong>Focus:</strong> {draft.focusGoalMinutes} minutes / day ({draft.focusCategory})</p>
          <p className="lp-hint">Saving synchronizes your profile preferences with the MySQL database and dashboard.</p>
        </div>
      )}

      {error && <p className="lp-error" role="alert">{error}</p>}

      <div className="lp-step-actions">
        <button className="lp-secondary-button" type="button" disabled={step === 0} onClick={() => { setError(""); setStep(step - 1) }}>
          <ArrowLeft size={16}/> Back
        </button>
        {step < 6 ? (
          <button className="lp-primary-button" type="button" onClick={() => { setError(""); setStep(step + 1) }}>
            Continue <ArrowRight size={16}/>
          </button>
        ) : (
          <button className="lp-primary-button" type="button" onClick={save}>
            <Save size={16}/> Save my routine
          </button>
        )}
      </div>
    </section>

    {/* Database Migration & Local Data Tools */}
    <div className="lp-data-tools">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <h3>Database &amp; Storage Management</h3>
          <p>Safely export your browser prototype data or import it into the MySQL database.</p>
        </div>
        <button
          type="button"
          className="button button-primary"
          style={{ gap: "6px" }}
          onClick={handleMigrateToDatabase}
          disabled={isMigrating}
        >
          {isMigrating ? <RefreshCw className="animate-spin" size={15} /> : <UploadCloud size={15} />}
          <span>{isMigrating ? "Migrating Data..." : "Migrate Local Data to Database"}</span>
        </button>
      </div>

      {migrationError && (
        <div style={{ padding: "0.75rem 1rem", background: "rgba(239, 68, 68, 0.15)", borderRadius: "0.5rem", color: "#f87171", margin: "1rem 0" }}>
          <AlertCircle size={16} style={{ display: "inline", marginRight: "6px" }} />
          {migrationError}
        </div>
      )}

      {/* Migration Review Summary */}
      {migrationSummary && (
        <div
          style={{
            background: "rgba(116, 199, 195, 0.1)",
            border: "1px solid rgba(116, 199, 195, 0.3)",
            borderRadius: "0.75rem",
            padding: "1rem 1.25rem",
            margin: "1rem 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--primary)", fontWeight: 700, marginBottom: "0.5rem" }}>
            <Sparkles size={18} />
            <span>Migration Successfully Completed &amp; Verified</span>
          </div>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", color: "var(--foreground)" }}>
            A backup file was exported to your downloads. Your existing browser records have been preserved and not deleted.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.5rem", fontSize: "0.82rem" }}>
            <div style={{ background: "var(--card)", padding: "0.5rem 0.75rem", borderRadius: "0.4rem" }}>
              <strong>{migrationSummary.imported_routines}</strong> Routines Imported
              {migrationSummary.skipped_routines > 0 && <small style={{ display: "block", color: "var(--muted-foreground)" }}>({migrationSummary.skipped_routines} skipped duplicate)</small>}
            </div>
            <div style={{ background: "var(--card)", padding: "0.5rem 0.75rem", borderRadius: "0.4rem" }}>
              <strong>{migrationSummary.imported_goals}</strong> Goals Imported
            </div>
            <div style={{ background: "var(--card)", padding: "0.5rem 0.75rem", borderRadius: "0.4rem" }}>
              <strong>{migrationSummary.imported_shifts}</strong> Shifts Imported
            </div>
            <div style={{ background: "var(--card)", padding: "0.5rem 0.75rem", borderRadius: "0.4rem" }}>
              <strong>{migrationSummary.settings_updated ? "Yes" : "No"}</strong> Settings Synced
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button className="lp-secondary-button" type="button" onClick={exportData}>
          <Download size={15}/> Export JSON backup
        </button>
        <button className="lp-secondary-button" type="button" onClick={() => setResetConfirm(true)}>
          <Trash2 size={15}/> Reset profile only
        </button>
      </div>

      {resetConfirm && (
        <div className="lp-confirm">
          <p>Reset saved profile preferences? Existing tasks will stay unchanged.</p>
          <button className="lp-secondary-button" onClick={() => setResetConfirm(false)}>Cancel</button>
          <button className="lp-danger-button" onClick={resetProfile}>Confirm reset</button>
        </div>
      )}
    </div>
  </div>
}
