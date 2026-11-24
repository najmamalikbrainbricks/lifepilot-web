"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import { loadSchedules, saveSchedules, seedSchedules, loadSettings, SETTINGS_KEY, DEFAULT_SETTINGS, type PersonalSettings, type Schedule, type TaskCategory } from "@/lib/lifepilot"

type LifePilotContextValue = {
  settings: PersonalSettings
  settingsReady: boolean
  updateSettings: (next: PersonalSettings) => boolean
  tasks: Schedule[]
  completedTasks: number
  completionPercent: number
  now: Date
  theme: "dark" | "light"
  setTheme: Dispatch<SetStateAction<"dark" | "light">>
  focusSecondsToday: number
  setFocusSecondsToday: Dispatch<SetStateAction<number>>
  toggleTask: (taskId: string) => void
  addTask: (task: { title: string; time: string; category: TaskCategory; durationMinutes: number }) => void
  notify: (message: string) => void
  openAddTask: () => void
  addTaskOpen: boolean
  closeAddTask: () => void
  notice: string
}

const LifePilotContext = createContext<LifePilotContextValue | null>(null)

export function LifePilotProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PersonalSettings>(DEFAULT_SETTINGS)
  const [settingsReady, setSettingsReady] = useState(false)
  const [tasks, setTasks] = useState<Schedule[]>(seedSchedules)
  const [tasksReady, setTasksReady] = useState(false)
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [themeReady, setThemeReady] = useState(false)
  const [focusSecondsToday, setFocusSecondsToday] = useState(0)
  const [focusReady, setFocusReady] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [notice, setNotice] = useState("")

  useEffect(() => {
    setSettings(loadSettings())
    setSettingsReady(true)
    setTasks(loadSchedules())
    setTasksReady(true)
    try {
      const savedFocus = Number(window.localStorage.getItem("lifepilot-focus-v1"))
      if (Number.isFinite(savedFocus) && savedFocus >= 0) setFocusSecondsToday(Math.min(savedFocus, 3600))
    } catch {}
    setFocusReady(true)
    const clock = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(clock)
  }, [])

  useEffect(() => {
    if (tasksReady) saveSchedules(tasks)
  }, [tasks, tasksReady])

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem("lifepilot-theme")
      if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme)
    } catch {}
    setThemeReady(true)
  }, [])

  useEffect(() => {
    if (!themeReady) return
    document.documentElement.classList.toggle("dark", theme === "dark")
    document.documentElement.classList.toggle("light", theme === "light")
    document.documentElement.style.colorScheme = theme
    try {
      window.localStorage.setItem("lifepilot-theme", theme)
    } catch {}
  }, [theme, themeReady])

  useEffect(() => {
    if (!focusReady) return
    try {
      window.localStorage.setItem("lifepilot-focus-v1", String(focusSecondsToday))
    } catch {}
  }, [focusSecondsToday, focusReady])

  const updateSettings = useCallback((next: PersonalSettings) => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
      setSettings(next)
      return true
    } catch {
      setNotice("Unable to save: browser storage is unavailable or full.")
      return false
    }
  }, [])

  const notify = useCallback((message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(""), 2600)
  }, [])

  const toggleTask = useCallback((taskId: string) => {
    setTasks(current => current.map(task => task.id === taskId
      ? { ...task, status: task.status === "completed" ? "upcoming" : "completed" }
      : task))
  }, [])

  const addTask = useCallback((task: { title: string; time: string; category: TaskCategory; durationMinutes: number }) => {
    const nextTask: Schedule = { ...task, id: crypto.randomUUID(), status: "upcoming" }
    const toMinutes = (value: string) => {
      const [time, meridiem] = value.split(" ")
      const [rawHours, rawMinutes] = time.split(":").map(Number)
      return ((rawHours % 12) + (meridiem.toUpperCase() === "PM" ? 12 : 0)) * 60 + rawMinutes
    }
    setTasks(current => [...current, nextTask].sort((a, b) => toMinutes(a.time) - toMinutes(b.time)))
    setAddTaskOpen(false)
    notify("Added to your day")
  }, [notify])

  const completedTasks = tasks.filter(task => task.status === "completed").length
  const value = useMemo<LifePilotContextValue>(() => ({
    settings,
    settingsReady,
    updateSettings,
    tasks,
    completedTasks,
    completionPercent: tasks.length ? Math.round(completedTasks / tasks.length * 100) : 0,
    now,
    theme,
    setTheme,
    focusSecondsToday,
    setFocusSecondsToday,
    toggleTask,
    addTask,
    notify,
    openAddTask: () => setAddTaskOpen(true),
    addTaskOpen,
    closeAddTask: () => setAddTaskOpen(false),
    notice,
  }), [settings, settingsReady, updateSettings, tasks, completedTasks, now, theme, focusSecondsToday, toggleTask, addTask, notify, addTaskOpen, notice])

  return <LifePilotContext.Provider value={value}>{children}</LifePilotContext.Provider>
}

export function useLifePilot() {
  const context = useContext(LifePilotContext)
  if (!context) throw new Error("useLifePilot must be used inside LifePilotProvider")
  return context
}
