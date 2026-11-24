/**
 * LifePilot API Client & Types
 * Connects Next.js Frontend to Laravel REST API (/api/v1)
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api/v1"

const TOKEN_KEY = "lifepilot_api_token"

export interface User {
  id: number
  name: string
  email: string
  timezone: string
  locale: string
  status: string
  preference?: UserPreference
  goals?: Goal[]
  work_shifts?: WorkShift[]
  created_at?: string
  updated_at?: string
}

export interface UserPreference {
  id?: number
  user_id?: number
  theme: "dark" | "light"
  time_format: "12h" | "24h"
  reminder_preferences?: {
    interval_minutes?: number
    strict_mode?: boolean
    prayers_enabled?: boolean
    wudu_reminders?: boolean
    tahajjud_enabled?: boolean
    prayer_method?: string
    prayer_proof?: string
  }
  sleep_goal: number
  bedtime: string
  wake_time: string
  focus_goal: number
  focus_category: string
  activity_preferences?: {
    step_goal?: number
    workout_days?: number
  }
}

export interface Goal {
  id: number
  user_id?: number
  title: string
  category?: string
  target?: number
  unit?: string
  priority?: number
  active: boolean
  created_at?: string
}

export interface WorkShift {
  id: number
  user_id?: number
  job_name: string
  start_time: string
  end_time: string
  days_of_week: number[]
  fixed_or_flexible: "fixed" | "flexible"
  overnight: boolean
  enabled: boolean
  created_at?: string
}

export interface RoutineStep {
  id?: number
  routine_id?: number
  title: string
  description?: string
  sort_order: number
  estimated_duration: number
  required: boolean
  verification_type: "self" | "checklist" | "photo" | "timer" | "counter" | "camera" | "upload" | "multi"
  verification_rule?: StepVerificationRule
}

export interface RoutineSchedule {
  id?: number
  routine_id?: number
  recurrence_type: "one_time" | "daily" | "selected_weekdays" | "weekly"
  selected_weekdays?: number[]
  local_start_time: string
  timezone?: string
  start_date?: string
  end_date?: string
  reminder_offset?: number
  enabled: boolean
}

export interface AlarmRule {
  id?: number
  routine_id?: number
  enabled: boolean
  sound: "flowing_water" | "gentle_chime" | "temple_bell" | "gentle_breeze" | "digital" | string
  repeat_interval: number
  max_attempts: number
  snooze_duration: number
  verification_required: boolean
  escalation_preference?: string
}

export interface Routine {
  id: number
  user_id?: number
  title: string
  description?: string
  category: "Spiritual" | "Health" | "Fitness" | "Work" | "Business" | "Study" | "Personal" | "Sleep" | "Custom" | string
  priority: "low" | "medium" | "high" | "urgent"
  estimated_duration: number
  icon?: string
  color?: string
  enabled: boolean
  archived_at?: string | null
  steps?: RoutineStep[]
  schedules?: RoutineSchedule[]
  alarm_rule?: AlarmRule | null
  alarmRule?: AlarmRule | null
  stats?: {
    total_occurrences: number
    completed_occurrences: number
  }
  created_at?: string
  updated_at?: string
}

export interface StepCompletion {
  id: number
  occurrence_id: number
  routine_step_id: number
  step?: RoutineStep
  status: "pending" | "completed" | "skipped" | "overridden"
  completed_at?: string | null
  notes?: string | null
}

export interface TaskOccurrence {
  id: number
  routine_id: number
  schedule_id?: number | null
  due_at: string
  original_due_at?: string | null
  rescheduled_at?: string | null
  reschedule_reason?: string | null
  is_rescheduled?: boolean
  started_at?: string | null
  completed_at?: string | null
  status:
    | "scheduled"
    | "ready"
    | "due"
    | "ringing"
    | "acknowledged"
    | "snoozed"
    | "preparation"
    | "in_progress"
    | "awaiting_verification"
    | "completed"
    | "partially_completed"
    | "skipped"
    | "missed"
    | "cancelled"
  actual_duration?: number | null
  snoozed_until?: string | null
  alarm_attempts?: number
  ringing_started_at?: string | null
  acknowledged_at?: string | null
  notes?: string | null
  routine?: Routine
  schedule?: RoutineSchedule
  step_completions?: StepCompletion[]
  evidence_submissions?: EvidenceSubmission[]
  progress?: {
    total_steps: number
    completed_steps: number
    percentage: number
  }
}

export interface DailyReport {
  date: string
  date_formatted: string
  timezone: string
  summary: {
    total_routines: number
    completed: number
    pending: number
    missed: number
    completion_percent: number
    focus_goal_minutes: number
    focus_category: string
  }
  current_task: TaskOccurrence | null
  next_task: TaskOccurrence | null
  occurrences: TaskOccurrence[]
}

export interface MigrationSummary {
  imported_routines: number
  skipped_routines: number
  imported_shifts: number
  skipped_shifts: number
  imported_goals: number
  skipped_goals: number
  settings_updated: boolean
  errors: string[]
}

// Token helpers
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TOKEN_KEY, token)
  }
}

export function removeStoredToken() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(TOKEN_KEY)
  }
}

// Low-level fetch wrapper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken()
  const headers = new Headers(options.headers || {})

  headers.set("Accept", "application/json")
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json")
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const url = `${API_BASE_URL}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let errorData: any = {}
    try {
      errorData = await response.json()
    } catch {
      errorData = { message: `HTTP Error ${response.status}: ${response.statusText}` }
    }
    const error = new Error(errorData.message || `Request failed with status ${response.status}`)
    ;(error as any).status = response.status
    ;(error as any).data = errorData
    throw error
  }

  return response.json()
}

// Auth API
export async function register(data: { name: string; email: string; password: string; timezone?: string }) {
  const res = await apiRequest<{ token: string; user: User }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  })
  if (res.token) setStoredToken(res.token)
  return res
}

export async function login(data: { email: string; password: string }) {
  const res = await apiRequest<{ token: string; user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  })
  if (res.token) setStoredToken(res.token)
  return res
}

export async function fetchMe(): Promise<{ user: User }> {
  return apiRequest<{ user: User }>("/me")
}

export async function logout(): Promise<void> {
  try {
    await apiRequest("/auth/logout", { method: "POST" })
  } finally {
    removeStoredToken()
  }
}

// Auto-login helper for seamless local testing
export async function ensureAuthenticatedUser(): Promise<User | null> {
  try {
    const token = getStoredToken()
    if (token) {
      try {
        const { user } = await fetchMe()
        return user
      } catch {
        removeStoredToken()
      }
    }
    // Attempt automatic login with seeded development account
    const { user } = await login({
      email: "alex@lifepilot.io",
      password: "password123",
    })
    return user
  } catch (err) {
    console.warn("Backend auth unavailable or offline:", err)
    return null
  }
}

// Routines API
export async function fetchRoutines(filters?: { status?: string; category?: string; search?: string }) {
  const params = new URLSearchParams()
  if (filters?.status) params.set("status", filters.status)
  if (filters?.category) params.set("category", filters.category)
  if (filters?.search) params.set("search", filters.search)

  const query = params.toString() ? `?${params.toString()}` : ""
  return apiRequest<{ routines: Routine[]; meta: { total: number; active_count: number; paused_count: number; archived_count: number } }>(`/routines${query}`)
}

export async function fetchRoutine(id: number) {
  return apiRequest<{ routine: Routine }>(`/routines/${id}`)
}

export async function createRoutine(payload: {
  title: string
  description?: string
  category: string
  priority?: string
  estimated_duration?: number
  icon?: string
  color?: string
  enabled?: boolean
  steps?: Partial<RoutineStep>[]
  schedule?: Partial<RoutineSchedule>
  alarm_rule?: Partial<AlarmRule>
}) {
  return apiRequest<{ message: string; routine: Routine }>("/routines", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateRoutine(id: number, payload: Partial<Routine> & {
  steps?: Partial<RoutineStep>[]
  schedule?: Partial<RoutineSchedule>
  alarm_rule?: Partial<AlarmRule>
  archived?: boolean
}) {
  return apiRequest<{ message: string; routine: Routine }>(`/routines/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteRoutine(id: number) {
  return apiRequest<{ message: string }>(`/routines/${id}`, {
    method: "DELETE",
  })
}

export async function archiveRoutine(id: number) {
  return apiRequest<{ message: string; routine: Routine }>(`/routines/${id}/archive`, {
    method: "POST",
  })
}

export async function unarchiveRoutine(id: number) {
  return apiRequest<{ message: string; routine: Routine }>(`/routines/${id}/unarchive`, {
    method: "POST",
  })
}

// Routine Steps API
export async function reorderRoutineSteps(routineId: number, stepIds: number[]) {
  return apiRequest<{ message: string; steps: RoutineStep[] }>(`/routines/${routineId}/steps/reorder`, {
    method: "POST",
    body: JSON.stringify({ step_ids: stepIds }),
  })
}

// Alarm Rule API
export async function saveAlarmRule(routineId: number, rule: Partial<AlarmRule>) {
  return apiRequest<{ message: string; alarm_rule: AlarmRule }>(`/routines/${routineId}/alarm-rule`, {
    method: "POST",
    body: JSON.stringify(rule),
  })
}

// Task Occurrences & Execution Engine API
export async function fetchOccurrences(date?: string) {
  const query = date ? `?date=${encodeURIComponent(date)}` : ""
  return apiRequest<{ date: string; occurrences: TaskOccurrence[] }>(`/occurrences${query}`)
}

export async function fetchOccurrence(id: number) {
  return apiRequest<{ occurrence: TaskOccurrence }>(`/occurrences/${id}`)
}

export async function startOccurrence(id: number) {
  return apiRequest<{ message: string; occurrence: TaskOccurrence }>(`/occurrences/${id}/start`, {
    method: "POST",
  })
}

export async function completeStep(occurrenceId: number, stepId: number, notes?: string) {
  return apiRequest<{ message: string; completion: StepCompletion; occurrence: TaskOccurrence }>(
    `/occurrences/${occurrenceId}/steps/${stepId}/complete`,
    {
      method: "POST",
      body: JSON.stringify({ notes }),
    }
  )
}

export async function skipStep(occurrenceId: number, stepId: number, override?: boolean, reason?: string) {
  return apiRequest<{ message: string; completion: StepCompletion; occurrence: TaskOccurrence }>(
    `/occurrences/${occurrenceId}/steps/${stepId}/skip`,
    {
      method: "POST",
      body: JSON.stringify({ override, reason }),
    }
  )
}

export async function completeOccurrence(id: number, force?: boolean, notes?: string) {
  return apiRequest<{ message: string; occurrence: TaskOccurrence }>(`/occurrences/${id}/complete`, {
    method: "POST",
    body: JSON.stringify({ force, notes }),
  })
}

export async function skipOccurrence(id: number, notes?: string) {
  return apiRequest<{ message: string; occurrence: TaskOccurrence }>(`/occurrences/${id}/skip`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  })
}

export async function pauseOccurrence(id: number) {
  return apiRequest<{ message: string; occurrence: TaskOccurrence }>(`/occurrences/${id}/pause`, {
    method: "POST",
  })
}

// Daily Report API
export async function fetchDailyReport(): Promise<DailyReport> {
  return apiRequest<DailyReport>("/reports/daily")
}

// Profile & Preferences API
export async function fetchPreferences(): Promise<{ preference: UserPreference }> {
  return apiRequest<{ preference: UserPreference }>("/preferences")
}

export async function updatePreferences(pref: Partial<UserPreference>): Promise<{ message: string; preference: UserPreference }> {
  return apiRequest<{ message: string; preference: UserPreference }>("/preferences", {
    method: "PUT",
    body: JSON.stringify(pref),
  })
}

export async function fetchGoals(): Promise<{ goals: Goal[] }> {
  return apiRequest<{ goals: Goal[] }>("/goals")
}

export async function createGoal(goal: Partial<Goal>): Promise<{ message: string; goal: Goal }> {
  return apiRequest<{ message: string; goal: Goal }>("/goals", {
    method: "POST",
    body: JSON.stringify(goal),
  })
}

export async function deleteGoal(id: number): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/goals/${id}`, {
    method: "DELETE",
  })
}

export async function fetchWorkShifts(): Promise<{ work_shifts: WorkShift[] }> {
  return apiRequest<{ work_shifts: WorkShift[] }>("/work-shifts")
}

export async function createWorkShift(shift: Partial<WorkShift>): Promise<{ message: string; work_shift: WorkShift }> {
  return apiRequest<{ message: string; work_shift: WorkShift }>("/work-shifts", {
    method: "POST",
    body: JSON.stringify(shift),
  })
}

export async function deleteWorkShift(id: number): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/work-shifts/${id}`, {
    method: "DELETE",
  })
}

// Browser Data Migration API
export async function importBrowserData(payload: { settings?: any; tasks?: any[] }): Promise<{ message: string; summary: MigrationSummary }> {
  return apiRequest<{ message: string; summary: MigrationSummary }>("/migration/import", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

// ---------------------------------------------------------------------------
// Phase 04: Islamic Prayer Engine, Daily Planner & Intelligent Scheduling Types
// ---------------------------------------------------------------------------

export interface PrayerSetting {
  id: number
  user_id: number
  city: string
  country: string
  latitude: number
  longitude: number
  timezone: string
  calculation_method: string
  asr_method: "Standard" | "Hanafi" | string
  high_latitude_rule: string
  manual_adjustments: {
    fajr: number
    dhuhr: number
    asr: number
    maghrib: number
    isha: number
  }
  enabled_prayers: {
    fajr: boolean
    dhuhr: boolean
    asr: boolean
    maghrib: boolean
    isha: boolean
    tahajjud: boolean
  }
  tahajjud_preference: {
    enabled: boolean
    duration_minutes: number
    preparation_minutes: number
    offset_before_fajr: number
  }
}

export interface PrayerOverride {
  id: number
  user_id: number
  date?: string | null
  fajr?: string | null
  dhuhr?: string | null
  asr?: string | null
  maghrib?: string | null
  isha?: string | null
  note?: string | null
  created_at?: string
}

export interface PrayerCompletion {
  id: number
  user_id: number
  prayer_name: string
  date: string
  status: "completed" | "missed" | "excused"
  completed_at?: string | null
  on_time: boolean
  in_jamaat: boolean
  notes?: string | null
  created_at?: string
}

export interface PrayerTimesResponse {
  date: string
  date_formatted: string
  timezone: string
  location: {
    city: string
    country: string
    latitude: number
    longitude: number
  }
  method: {
    key: string
    name: string
    asr: string
  }
  calculated_times: {
    fajr: string
    sunrise: string
    dhuhr: string
    asr: string
    maghrib: string
    isha: string
  }
  adjusted_times: {
    fajr: string
    sunrise: string
    dhuhr: string
    asr: string
    maghrib: string
    isha: string
  }
  effective_times: {
    fajr: string
    sunrise: string
    dhuhr: string
    asr: string
    maghrib: string
    isha: string
  }
  overrides: {
    has_any: boolean
    by_prayer: Record<string, boolean>
    note?: string | null
  }
  tahajjud: {
    enabled: boolean
    last_third_start: string
    last_third_end: string
    midnight: string
    suggested_start: string
    duration_minutes: number
  }
  completions: Record<string, PrayerCompletion>
}

export interface TimelineBlock {
  id: string
  type: "sleep_morning" | "sleep_night" | "work_shift" | "prayer" | "focus_block" | "routine_occurrence"
  title: string
  category?: string
  start_time: string
  end_time: string
  start_datetime: string
  end_datetime: string
  duration_minutes: number
  priority: number
  color: string
  is_immovable: boolean
  // Specific block attributes
  shift_id?: number
  is_overnight?: boolean
  prayer_name?: string
  has_override?: boolean
  occurrence_id?: number
  routine_id?: number
  status?: string
  is_rescheduled?: boolean
  rescheduled_at?: string | null
  original_due_at?: string | null
  reschedule_reason?: string | null
  steps_count?: number
  completed_steps?: number
}

export interface ScheduleConflict {
  block1: {
    id: string
    title: string
    type: string
    start_time: string
    end_time: string
    is_immovable: boolean
  }
  block2: {
    id: string
    title: string
    type: string
    start_time: string
    end_time: string
    is_immovable: boolean
  }
  overlap_start: string
  overlap_end: string
  overlap_minutes: number
  severity: "critical" | "warning"
  message: string
}

export interface FreeSlot {
  start_time: string
  end_time: string
  start_datetime: string
  end_datetime: string
  duration_minutes: number
}

export interface SlotSuggestion {
  start_time: string
  end_time: string
  start_datetime: string
  duration_minutes: number
  score: number
  reason: string
}

export interface DailyTimelineResponse {
  date: string
  date_formatted: string
  timezone: string
  timeline_blocks: TimelineBlock[]
  conflicts: ScheduleConflict[]
  free_slots: FreeSlot[]
  prayer_summary: {
    fajr: string
    dhuhr: string
    asr: string
    maghrib: string
    isha: string
    tahajjud?: string | null
  }
  stats: {
    total_routines: number
    completed_routines: number
    conflicts_count: number
    free_minutes: number
  }
}

export interface WeeklyCalendarDay {
  date: string
  day_name: string
  day_number: number
  is_today: boolean
  routines_count: number
  completed_count: number
  conflicts_count: number
  free_minutes: number
  work_shifts: TimelineBlock[]
  prayers: Record<string, string>
  occurrences: TimelineBlock[]
}

export interface WeeklyCalendarResponse {
  week_start: string
  week_end: string
  timezone: string
  days: WeeklyCalendarDay[]
}

export interface MonthlyCalendarDay {
  date: string
  day: number
  day_name: string
  is_today: boolean
  total_tasks: number
  completed_tasks: number
  missed_tasks: number
  prayers_completed: number
  completion_percent: number
}

export interface MonthlyCalendarResponse {
  year: number
  month: number
  month_name: string
  timezone: string
  days: MonthlyCalendarDay[]
}

export interface ProtectedTimeBlock {
  id: number
  user_id?: number
  title: string
  category?: string
  start_time: string
  end_time: string
  days_of_week?: number[]
  enabled: boolean
  created_at?: string
}

// ---------------------------------------------------------------------------
// Phase 04 API Methods
// ---------------------------------------------------------------------------

// Prayers API
export async function fetchPrayerTimes(date?: string): Promise<PrayerTimesResponse> {
  const query = date ? `?date=${encodeURIComponent(date)}` : ""
  return apiRequest<PrayerTimesResponse>(`/prayers/times${query}`)
}

export async function fetchPrayerSettings(): Promise<{ settings: PrayerSetting; supported_methods: Record<string, { name: string; fajr_angle?: number; isha_angle?: number; isha_interval?: number }> }> {
  return apiRequest<{ settings: PrayerSetting; supported_methods: Record<string, any> }>("/prayers/settings")
}

export async function updatePrayerSettings(settings: Partial<PrayerSetting>): Promise<{ message: string; settings: PrayerSetting }> {
  return apiRequest<{ message: string; settings: PrayerSetting }>("/prayers/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  })
}

export async function savePrayerOverride(override: Partial<PrayerOverride>): Promise<{ message: string; override: PrayerOverride }> {
  return apiRequest<{ message: string; override: PrayerOverride }>("/prayers/overrides", {
    method: "POST",
    body: JSON.stringify(override),
  })
}

export async function deletePrayerOverride(id?: number, date?: string): Promise<{ message: string }> {
  const endpoint = id ? `/prayers/overrides/${id}` : `/prayers/overrides${date ? `?date=${encodeURIComponent(date)}` : ""}`
  return apiRequest<{ message: string }>(endpoint, {
    method: "DELETE",
  })
}

export async function recordPrayerCompletion(
  prayerName: string,
  date: string,
  status: "completed" | "missed" | "excused",
  options?: { completed_at?: string; on_time?: boolean; in_jamaat?: boolean; notes?: string }
): Promise<{ message: string; completion: PrayerCompletion }> {
  return apiRequest<{ message: string; completion: PrayerCompletion }>("/prayers/completions", {
    method: "POST",
    body: JSON.stringify({
      prayer_name: prayerName,
      date,
      status,
      ...options,
    }),
  })
}

export async function fetchPrayerHistory(month?: number, year?: number): Promise<{
  month: number
  year: number
  total_completed: number
  total_missed: number
  completions: PrayerCompletion[]
}> {
  const params = new URLSearchParams()
  if (month) params.set("month", month.toString())
  if (year) params.set("year", year.toString())
  const query = params.toString() ? `?${params.toString()}` : ""
  return apiRequest(`/prayers/history${query}`)
}

// Planner API
export async function fetchDailyTimeline(date?: string): Promise<DailyTimelineResponse> {
  const query = date ? `?date=${encodeURIComponent(date)}` : ""
  return apiRequest<DailyTimelineResponse>(`/planner/daily${query}`)
}

export async function fetchWeeklyCalendar(date?: string): Promise<WeeklyCalendarResponse> {
  const query = date ? `?date=${encodeURIComponent(date)}` : ""
  return apiRequest<WeeklyCalendarResponse>(`/planner/weekly${query}`)
}

export async function fetchMonthlyCalendar(year?: number, month?: number): Promise<MonthlyCalendarResponse> {
  const params = new URLSearchParams()
  if (year) params.set("year", year.toString())
  if (month) params.set("month", month.toString())
  const query = params.toString() ? `?${params.toString()}` : ""
  return apiRequest<MonthlyCalendarResponse>(`/planner/monthly${query}`)
}

export async function fetchConflicts(date?: string): Promise<{
  date: string
  timezone: string
  conflicts_count: number
  conflicts: ScheduleConflict[]
}> {
  const query = date ? `?date=${encodeURIComponent(date)}` : ""
  return apiRequest(`/planner/conflicts${query}`)
}

export async function fetchSlotSuggestions(durationMinutes: number, date?: string): Promise<{
  date: string
  required_duration_minutes: number
  suggestions_count: number
  suggestions: SlotSuggestion[]
}> {
  return apiRequest("/planner/suggestions", {
    method: "POST",
    body: JSON.stringify({
      duration_minutes: durationMinutes,
      date,
    }),
  })
}

export async function rescheduleOccurrence(
  occurrenceId: number,
  newDueAt: string,
  reason?: string
): Promise<{ message: string; occurrence: TaskOccurrence }> {
  return apiRequest<{ message: string; occurrence: TaskOccurrence }>(`/planner/occurrences/${occurrenceId}/reschedule`, {
    method: "POST",
    body: JSON.stringify({
      new_due_at: newDueAt,
      reason,
    }),
  })
}

export async function resetOccurrenceReschedule(
  occurrenceId: number
): Promise<{ message: string; occurrence: TaskOccurrence }> {
  return apiRequest<{ message: string; occurrence: TaskOccurrence }>(`/planner/occurrences/${occurrenceId}/reset-reschedule`, {
    method: "POST",
  })
}

// Protected Time Blocks API
export async function fetchProtectedBlocks(): Promise<{ protected_blocks: ProtectedTimeBlock[] }> {
  return apiRequest<{ protected_blocks: ProtectedTimeBlock[] }>("/protected-time-blocks")
}

export async function createProtectedBlock(block: Partial<ProtectedTimeBlock>): Promise<{ message: string; protected_block: ProtectedTimeBlock }> {
  return apiRequest<{ message: string; protected_block: ProtectedTimeBlock }>("/protected-time-blocks", {
    method: "POST",
    body: JSON.stringify(block),
  })
}

export async function updateProtectedBlock(id: number, block: Partial<ProtectedTimeBlock>): Promise<{ message: string; protected_block: ProtectedTimeBlock }> {
  return apiRequest<{ message: string; protected_block: ProtectedTimeBlock }>(`/protected-time-blocks/${id}`, {
    method: "PUT",
    body: JSON.stringify(block),
  })
}

export async function deleteProtectedBlock(id: number): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/protected-time-blocks/${id}`, {
    method: "DELETE",
  })
}

// ---------------------------------------------------------------------------
// Phase 05: Smart Alarm Workflows, Evidence Verification & Accountability Types
// ---------------------------------------------------------------------------

export interface StepVerificationRule {
  id?: number
  routine_step_id: number
  verification_type: "self" | "camera" | "upload" | "checklist" | "timer" | "counter" | "multi"
  required: boolean
  minimum_duration?: number | null // in seconds
  minimum_count?: number | null
  allow_gallery: boolean
  fallback_type: string
  rule_configuration?: {
    checklist_items?: string[]
    sound?: string
    instructions?: string
    combination_rule?: "ALL" | "ANY"
  } | null
}

export interface EvidenceSubmission {
  id: number
  user_id: number
  occurrence_id: number
  routine_step_id: number
  evidence_type: "camera" | "upload" | "manual" | "checklist" | "timer" | "counter"
  storage_path?: string | null
  mime_type?: string | null
  file_size?: number | null
  verification_status: "pending" | "submitted" | "rule_satisfied" | "self_reported" | "rejected" | "deleted" | "overridden"
  validation_source: string
  metadata?: {
    width?: number
    height?: number
    sanitized?: boolean
    elapsed_seconds?: number
    count?: number
    notes?: string
    [key: string]: any
  } | null
  submitted_at: string
  reviewed_at?: string | null
  step?: RoutineStep
}

export interface AlarmEvent {
  id: number
  user_id: number
  occurrence_id: number
  alarm_rule_id?: number | null
  event_type: "due" | "ringing" | "acknowledged" | "snoozed" | "dismissed" | "auto_missed" | "emergency_stop"
  event_time: string
  metadata?: {
    attempt?: number
    snooze_minutes?: number
    ring_duration_seconds?: number
    reason?: string
    sound?: string
    routine_title?: string
  } | null
}

export interface TimerSession {
  id: number
  user_id: number
  occurrence_id: number
  routine_step_id?: number | null
  started_at: string
  paused_at?: string | null
  completed_at?: string | null
  elapsed_seconds: number
  status: "running" | "paused" | "completed" | "cancelled"
  target_duration_seconds?: number | null
  metadata?: any
}

export interface AccountabilityHistoryItem {
  id: number
  routine_title: string
  category: string
  priority: string
  scheduled_due_at: string
  started_at?: string | null
  completed_at?: string | null
  delay_minutes: number
  status: string
  is_verified: boolean
  alarm_acknowledgements: number
  reminders_count: number
  steps_count: number
  completed_steps: number
  evidence_items: {
    id: number
    type: string
    status: string
    source: string
    has_file: boolean
    submitted_at?: string
  }[]
  notes?: string | null
}

export interface AccountabilitySummary {
  period_start: string
  period_end: string
  timezone: string
  metrics: {
    total_scheduled: number
    completed_routines: number
    missed_routines: number
    verified_completions: number
    self_reported_completions: number
    average_delay_minutes: number
    completion_rate: number
  }
  category_breakdown: {
    category: string
    count: number
    estimated_minutes: number
    actual_seconds: number
  }[]
  recent_evidence: {
    id: number
    step_title: string
    routine_title: string
    evidence_type: string
    verification_status: string
    validation_source: string
    has_image: boolean
    file_size?: number | null
    metadata?: any
    submitted_at: string
  }[]
}

// ---------------------------------------------------------------------------
// Phase 05 API Methods
// ---------------------------------------------------------------------------

// Alarm Workflow Engine
export async function fetchDueAlarms(): Promise<{ count: number; due_alarms: TaskOccurrence[] }> {
  return apiRequest<{ count: number; due_alarms: TaskOccurrence[] }>("/alarms/due")
}

export async function triggerAlarm(occurrenceId: number): Promise<{ message: string; occurrence: TaskOccurrence }> {
  return apiRequest<{ message: string; occurrence: TaskOccurrence }>(`/alarms/${occurrenceId}/trigger`, {
    method: "POST",
  })
}

export async function acknowledgeAlarm(occurrenceId: number): Promise<{ message: string; occurrence: TaskOccurrence }> {
  return apiRequest<{ message: string; occurrence: TaskOccurrence }>(`/alarms/${occurrenceId}/acknowledge`, {
    method: "POST",
  })
}

export async function snoozeAlarm(occurrenceId: number, minutes?: number): Promise<{ message: string; occurrence: TaskOccurrence }> {
  return apiRequest<{ message: string; occurrence: TaskOccurrence }>(`/alarms/${occurrenceId}/snooze`, {
    method: "POST",
    body: JSON.stringify({ minutes }),
  })
}

export async function dismissAlarm(occurrenceId: number, reason?: string): Promise<{ message: string; occurrence: TaskOccurrence }> {
  return apiRequest<{ message: string; occurrence: TaskOccurrence }>(`/alarms/${occurrenceId}/dismiss`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  })
}

export async function emergencyStopAlarms(): Promise<{ message: string; stopped_count: number }> {
  return apiRequest<{ message: string; stopped_count: number }>("/alarms/emergency-stop", {
    method: "POST",
  })
}

// Evidence Verification Engine
export async function submitImageEvidence(
  occurrenceId: number,
  stepId: number,
  imageFile: Blob | File,
  source: string = "camera_capture",
  metadata?: any
): Promise<{ message: string; evidence: EvidenceSubmission; occurrence: TaskOccurrence }> {
  const formData = new FormData()
  formData.append("image", imageFile)
  formData.append("source", source)
  if (metadata) {
    formData.append("metadata", JSON.stringify(metadata))
  }

  return apiRequest(`/occurrences/${occurrenceId}/steps/${stepId}/evidence`, {
    method: "POST",
    body: formData,
  })
}

export async function submitStructuredEvidence(
  occurrenceId: number,
  stepId: number,
  evidenceType: string,
  data?: any
): Promise<{ message: string; evidence: EvidenceSubmission; occurrence: TaskOccurrence }> {
  return apiRequest(`/occurrences/${occurrenceId}/steps/${stepId}/evidence`, {
    method: "POST",
    body: JSON.stringify({
      evidence_type: evidenceType,
      data,
    }),
  })
}

export function getEvidenceFileUrl(evidenceId: number): string {
  const token = getStoredToken()
  return `${API_BASE_URL}/evidence/${evidenceId}${token ? `?api_token=${encodeURIComponent(token)}` : ""}`
}

export async function fetchEvidenceBlob(evidenceId: number): Promise<Blob> {
  const token = getStoredToken()
  const headers = new Headers()
  if (token) headers.set("Authorization", `Bearer ${token}`)
  const res = await fetch(`${API_BASE_URL}/evidence/${evidenceId}`, { headers })
  if (!res.ok) throw new Error(`Failed to load evidence (status: ${res.status})`)
  return res.blob()
}

export async function deleteEvidence(evidenceId: number): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/evidence/${evidenceId}`, {
    method: "DELETE",
  })
}

export async function fetchOccurrenceVerification(occurrenceId: number): Promise<{
  occurrence_id: number
  evidence_count: number
  submissions: EvidenceSubmission[]
}> {
  return apiRequest(`/occurrences/${occurrenceId}/verification`)
}

// Timer Sessions Engine
export async function startTimerSession(
  occurrenceId: number,
  stepId?: number,
  targetSeconds?: number,
  metadata?: any
): Promise<{ message: string; timer_session: TimerSession }> {
  return apiRequest("/timer-sessions", {
    method: "POST",
    body: JSON.stringify({
      occurrence_id: occurrenceId,
      routine_step_id: stepId,
      target_duration_seconds: targetSeconds,
      metadata,
    }),
  })
}

export async function pauseTimerSession(sessionId: number): Promise<{ message: string; timer_session: TimerSession }> {
  return apiRequest(`/timer-sessions/${sessionId}/pause`, {
    method: "POST",
  })
}

export async function resumeTimerSession(sessionId: number): Promise<{ message: string; timer_session: TimerSession }> {
  return apiRequest(`/timer-sessions/${sessionId}/resume`, {
    method: "POST",
  })
}

export async function completeTimerSession(sessionId: number): Promise<{ message: string; timer_session: TimerSession }> {
  return apiRequest(`/timer-sessions/${sessionId}/complete`, {
    method: "POST",
  })
}

// Accountability & Verification Reports
export async function fetchAccountabilityHistory(limit?: number): Promise<{ count: number; history: AccountabilityHistoryItem[] }> {
  const query = limit ? `?limit=${limit}` : ""
  return apiRequest(`/accountability/history${query}`)
}

export async function fetchAccountabilitySummary(startDate?: string, endDate?: string): Promise<AccountabilitySummary> {
  const params = new URLSearchParams()
  if (startDate) params.set("start_date", startDate)
  if (endDate) params.set("end_date", endDate)
  const query = params.toString() ? `?${params.toString()}` : ""
  return apiRequest<AccountabilitySummary>(`/accountability/summary${query}`)
}


