export const categories = ["Wellness", "Work", "Prayer", "Personal", "Rest"] as const
export type TaskStatus = "upcoming" | "in-progress" | "completed"
export type TaskCategory = "Wellness" | "Work" | "Prayer" | "Personal" | "Rest"
export interface User { id: string; name: string; jobs: string[]; workShift: { start: string; end: string } }
export interface Goal { id: string; title: string; targetMinutes: number; completedMinutes: number }
export interface RoutineStep { id: string; title: string; durationMinutes: number }
export interface Routine { id: string; title: string; steps: RoutineStep[] }
export interface Schedule { id: string; title: string; time: string; durationMinutes: number; category: TaskCategory; status: TaskStatus; note?: string }
export interface TaskOccurrence extends Schedule {}
export interface ActivitySession { id: string; title: string; startedAt: string; durationMinutes: number }
export interface DashboardSummary { completed: number; pending: number; focusMinutes: number; steps: number; sleepHours: number; completionPercent: number }

export const demoUser: User = { id: "demo-user", name: "Alex Morgan", jobs: ["Product designer", "Community mentor"], workShift: { start: "7:00 PM", end: "1:00 AM" } }
export const seedSchedules: Schedule[] = [
  { id: "stretch", title: "Morning stretch & reset", time: "7:00 AM", durationMinutes: 15, category: "Wellness", status: "completed" },
  { id: "breakfast", title: "Breakfast & plan the day", time: "7:30 AM", durationMinutes: 30, category: "Personal", status: "completed" },
  { id: "deep-work", title: "Creative deep work", time: "9:00 AM", durationMinutes: 90, category: "Work", status: "in-progress" },
  { id: "dhuhr", title: "Dhuhr prayer", time: "12:40 PM", durationMinutes: 15, category: "Prayer", status: "upcoming", note: "Illustrative demo time" },
  { id: "walk", title: "Afternoon walk", time: "2:30 PM", durationMinutes: 30, category: "Wellness", status: "upcoming" },
  { id: "asr", title: "Asr prayer", time: "4:15 PM", durationMinutes: 15, category: "Prayer", status: "upcoming", note: "Illustrative demo time" },
  { id: "work", title: "Work shift · Job 1", time: "7:00 PM", durationMinutes: 360, category: "Work", status: "upcoming" },
]
export const prayerTimes = [{ name: "Fajr", time: "5:18 AM" }, { name: "Dhuhr", time: "12:40 PM" }, { name: "Asr", time: "4:15 PM" }, { name: "Maghrib", time: "7:02 PM" }, { name: "Isha", time: "8:24 PM" }, { name: "Tahajjud", time: "Optional" }]
const STORAGE_KEY = "lifepilot-v1"
export function loadSchedules(): Schedule[] {
  if (typeof window === "undefined") return seedSchedules
  try { const raw = window.localStorage.getItem(STORAGE_KEY); if (!raw) return seedSchedules; const parsed: unknown = JSON.parse(raw); return Array.isArray(parsed) ? parsed as Schedule[] : seedSchedules } catch { return seedSchedules }
}
export function saveSchedules(schedules: Schedule[]) { if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules)) }


// Local-only personal settings. No server account or device permissions are implied.
export interface WorkShift { id: string; name: string; start: string; end: string; days: number[]; fixed: boolean }
export interface PersonalSettings {
  version: 1
  onboarded: boolean
  name: string
  language: "English" | "Urdu" | "Roman Urdu"
  timezone: string
  timeFormat: "12h" | "24h"
  goals: string[]
  shifts: WorkShift[]
  prayersEnabled: boolean
  tahajjudEnabled: boolean
  wuduReminders: boolean
  prayerMethod: string
  prayerProof: "self" | "photo" | "checklist"
  sleepGoalHours: number
  bedtime: string
  wakeTime: string
  stepGoal: number
  workoutDays: number
  focusGoalMinutes: number
  focusCategory: string
  reminderIntervalMinutes: number
  strictMode: boolean
}
export const DEFAULT_SETTINGS: PersonalSettings = {
  version: 1, onboarded: false, name: "", language: "English", timezone: "Asia/Karachi",
  timeFormat: "12h", goals: ["Five daily prayers", "Agency growth", "Better sleep"],
  shifts: [], prayersEnabled: true, tahajjudEnabled: true, wuduReminders: true,
  prayerMethod: "Manual / mosque timetable", prayerProof: "self", sleepGoalHours: 8,
  bedtime: "01:30", wakeTime: "09:30", stepGoal: 6000, workoutDays: 3,
  focusGoalMinutes: 60, focusCategory: "Agency", reminderIntervalMinutes: 5, strictMode: false,
}
export const SETTINGS_KEY = "lifepilot-settings-v1"
export function loadSettings(): PersonalSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return DEFAULT_SETTINGS
    const value = parsed as Partial<PersonalSettings>
    return { ...DEFAULT_SETTINGS, ...value, version: 1,
      shifts: Array.isArray(value.shifts) ? value.shifts : [],
      goals: Array.isArray(value.goals) ? value.goals : DEFAULT_SETTINGS.goals }
  } catch { return DEFAULT_SETTINGS }
}
