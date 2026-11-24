# LifePilot — Full-Stack Local Setup & Operation Guide

## 1. Overview
LifePilot has been upgraded from a frontend prototype into a database-backed, production-grade full-stack system:
- **Frontend**: Next.js App Router, React 19, TypeScript, Tailwind CSS (`http://localhost:3000`)
- **Backend**: Laravel REST API (`/api/v1`), Sanctum Authentication, Eloquent ORM (`http://127.0.0.1:8000`)
- **Database**: MySQL (`lifepilot_db`) on `127.0.0.1:3306`

---

## 2. Requirements
- PHP 8.3+ with `pdo_mysql`, `mbstring`, `openssl` (Included in XAMPP)
- MySQL / MariaDB (Running on XAMPP default port 3306)
- Node.js 22+ & npm/pnpm
- Composer 2.8+

---

## 3. Quick Start Commands

### Backend (`D:\xampp\htdocs\lifepilot_api`)
```powershell
cd D:\xampp\htdocs\lifepilot_api

# Run migrations (already executed on lifepilot_db)
php artisan migrate

# Seed sample data (Alex Morgan, Morning Prayer, Deep Work, Work Shifts, Occurrences)
php artisan db:seed

# Start Laravel backend server on port 8000
php artisan serve --host=127.0.0.1 --port=8000
```
API endpoint: `http://127.0.0.1:8000/api/v1`

Default Demo Credentials:
- **Email**: `alex@lifepilot.io`
- **Password**: `password123`

### Frontend (`D:\xampp\htdocs\lifepilot_work`)
```powershell
cd D:\xampp\htdocs\lifepilot_work

# Start Next.js development server
npx pnpm dev
# Or npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 4. Key Implemented Modules

### 1. Smart Routine Builder (`/routines`)
- **Routine Listing**: Active, paused, and archived routines with quick metrics, search, and category filters (Spiritual, Work, Health, Fitness, Business, Study, Personal, Sleep, Custom).
- **Multi-Step Builder**: Add unlimited ordered steps with title, description, duration, required/optional toggle, and verification type (`self`, `checklist`, `timer`, `photo`, `counter`). Includes step reordering (move up/down) and quick templates (Morning Prayer, Deep Work Sprint, Evening Rest).
- **Recurrence Engine**: One-time, Daily, Selected Weekdays, and Weekly recurrence with timezone preservation and idempotent occurrence generation.
- **Alarm Rule Configuration**: Configurable sounds (including Flowing Water for Wudu, Gentle Chime, Temple Bell, Breeze, Digital), intervals, snooze, attempts, and verification.
- **Foreground Alarm Simulator**: In-browser audio & visual simulation using the Web Audio API synthesizer.

### 2. Task Execution Engine
- Interactive runner supporting state transitions: `scheduled` → `ready` → `in_progress` → `completed` / `partially_completed` / `skipped`.
- Live elapsed stopwatch timer.
- Step-by-step completion checklist.
- Strict required-step enforcement: required steps cannot be bypassed without explicit user override.
- Full activity event logging (`routine_started`, `step_completed`, `routine_completed`).

### 3. Smart Daily Planner (`/planner`) — Milestone 04
- **Daily View**:
  - Time-based vertical timeline with chronological 24-hour flow.
  - Displays work shifts (with clear badge for overnight shifts, e.g. 19:00 to 01:00 carryover).
  - Prayer blocks (Fajr, Dhuhr, Asr, Maghrib, Isha, Tahajjud) with quick "Prayed / Mark Prayed" toggle.
  - Routine occurrences with status badges, direct execution runner launch, and single-occurrence reschedule.
  - Protected focus time blocks and sleep/rest periods.
  - Free-time open buffer slots calculation and visualization.
  - Real-time conflict detection banner with severity indicators and "Resolve with Smart Slot" one-click action.
- **Weekly View (7-Day Calendar)**:
  - Seven-day columns (Mon–Sun) showing daily workload progress, work shift visibility, prayer times, and conflict badges.
  - Click any day card to jump straight into its detailed daily timeline.
- **Monthly View (Consistency Matrix)**:
  - Calendar grid displaying daily routine completion percentages, missed task markers, and prayer logs.
  - Click any day cell to plan or review.
- **Single-Occurrence Rescheduling & Reset**:
  - Independent occurrence rescheduling without altering recurring routine schedule definitions.
  - Captures `original_due_at`, `rescheduled_at`, and `reschedule_reason`.
  - One-click reset restores occurrence back to its original recurring schedule time.

### 4. Islamic Prayer Time Engine & Tahajjud Scheduler
- **Astronomical Solar Algorithms (Meeus Equations)**:
  - Autonomous solar declination, equation of time, and hour angle calculations across 7 international calculation methods:
    1. *Karachi* (Univ. of Islamic Sciences, Karachi: Fajr 18°, Isha 18°)
    2. *MWL* (Muslim World League: Fajr 18°, Isha 17°)
    3. *ISNA* (Islamic Society of North America: Fajr 15°, Isha 15°)
    4. *Egypt* (Egyptian General Authority: Fajr 19.5°, Isha 17.5°)
    5. *Makkah* (Umm al-Qura University, Makkah: Fajr 18.5°, Isha 90 min)
    6. *Tehran* (Institute of Geophysics, Tehran: Fajr 17.7°, Isha 14°)
    7. *Jafari* (Shia Ithna Ashari, Leva Institute: Fajr 16°, Isha 14°)
- **Asr Shadow Factor Jurisprudence**:
  - Standard / Shafi'i, Maliki, Hanbali: shadow factor = 1.0x
  - Hanafi: shadow factor = 2.0x (occurs ~45–60 minutes later)
- **High-Latitude Rule**: Middle of the night rule.
- **Tahajjud Scheduler**:
  - Calculates true night interval from today's Maghrib to the following day's Fajr.
  - Computes solar midnight and last-third-of-night window `[Maghrib + (2/3 * NightDuration), Fajr]`.
  - Supports user-configurable wake offsets before Fajr (e.g., 45m) and planned duration.
- **Manual Minute Adjustments & Mosque Jamaat Overrides**:
  - Per-prayer minute adjustment offsets (+/- minutes).
  - Explicit mosque/jamaat timetable overrides for specific dates or ongoing defaults.
  - Clear visual distinction in UI: Calculated time vs. Adjusted time vs. Mosque Override.

### 5. Profile & Work Shift Integration (`/profile`)
- User preferences synced with backend: sleep goal, focus target, bedtime, wake time, timezone.
- Comprehensive Prayer Settings in Step 3:
  - Calculation method dropdown, Asr school selector, City/Country/Coordinates inputs.
  - "Detect GPS" button utilizing `navigator.geolocation`.
  - Tahajjud duration and wake offset configuration.
  - Manual minute fine-tuning adjustments for each prayer.
- Work shift management with automatic overnight boundary detection (e.g. 19:00 to 01:00).
- Goals management with priority ordering.

### 6. Safe Browser Data Migration
- Located in Profile settings under "Database & Storage Management".
- Automatically exports a backup JSON file (`lifepilot-backup.json`) before import.
- Safely validates and imports settings, goals, shifts, and prototype tasks into the MySQL database.
- Idempotent: Skips duplicates and returns a detailed import summary.
- Preserves local browser records without deleting them automatically.

### 7. Smart Alarm Workflow Engine (Phase 05)
- **Priority Queue & Due Alarm Polling**: Evaluates upcoming occurrences against exact UTC timestamps and quiet hours, ordering due alarms by priority (`urgent` > `high` > `medium` > `low`).
- **Foreground Alarm Overlay**: Fullscreen glassmorphic overlay rendered at the root shell frame (`lifepilot-app.tsx`). Includes ringing animation, ring duration stopwatch, attempt counter, sound mute/unmute, and one-click transition into the routine runner.
- **State Machine**: Supports 13 lifecycle states: `scheduled`, `ready`, `due`, `ringing`, `acknowledged`, `snoozed`, `preparation`, `in_progress`, `awaiting_verification`, `completed`, `partially_completed`, `missed`, `cancelled`.
- **Configurable Snooze & Auto-Miss Protection**: Quick snooze (3, 5, 10, 15 minutes) with configurable `max_attempts`. Automatically marks occurrences as `missed` when max attempts are exceeded to prevent infinite alarm loops.
- **Emergency Stop**: One-click emergency silence stops all active ringing alarms and logs `emergency_stop` audit events.

### 8. Web Audio API Sound Synthesizer (`lib/audio-manager.ts`)
- Zero external audio file dependencies — 100% synthesized in-browser:
  - **Flowing Water (Wudu stream)**: Multi-pole resonant filtered pink/brown noise modulated by a 0.35 Hz sine LFO for authentic running water ambiance during preparation and Wudu steps.
  - **Gentle Chime**: Harmonic bell frequency synthesis with exponential gain decay.
  - **Soft Temple Bell**: Deep resonant low-frequency gong with sustained sub-bass decay.
  - **Digital Pulse**: Crisp dual-tone electronic beep alert.
  - **Gentle Breeze**: Soft low-pass filtered atmospheric white noise.
- Features: Live sound preview button in Routine Builder, master volume control, looping playback, and cleanup on unmount.

### 9. Multi-Step Proof Verification & Mobile Camera Viewfinder
- **Verification Rule Engine**: Per-step verification modes:
  - `self`: Quick confirmation.
  - `camera`: Live WebRTC camera viewfinder capture.
  - `upload`: File upload from local gallery/storage.
  - `timer`: Minimum duration stopwatch enforcement.
  - `counter`: Repetition counter (e.g. 33 Dhikr / 20 pushups).
  - `checklist`: Multi-item checklist confirmation.
  - `multi`: Combined proof requirements.
- **Mobile-First Camera Viewfinder (`camera-capture-modal.tsx`)**:
  - WebRTC video stream requesting environment rear-facing camera (`facingMode: { ideal: "environment" }`).
  - Native canvas snapshot capture with review & retake controls.
  - Automatic fallback to file upload dialog if camera access is denied or unavailable.
  - Explicit hardware track cleanup (`track.stop()`) on modal close.
- **Honest Verification Guarantee**: Transparently records proof without fake AI claims (e.g., photo of prayer mat confirms mat setup, not spiritual validity).

### 10. Secure Evidence Upload & Private Storage System
- **Server-Side Security**:
  - MIME validation strictly limited to `image/jpeg`, `image/png`, `image/webp`.
  - 5MB maximum file size limit.
  - Image dimension checks (maximum 4096 x 4096 px) and decompression bomb protection.
  - Server-side image sanitization via PHP GD (`imagecreatefromstring` + re-encoding) to strip sensitive EXIF GPS metadata.
- **Private Storage**: Files stored in non-public storage directory (`storage/app/private/evidence/{user_id}/`). Zero public URL access.
- **Authenticated Streaming Endpoint**: `GET /api/v1/evidence/{id}` validates user ownership before streaming via `BinaryFileResponse`.

### 11. Timer Sessions Engine
- Dedicated timer sessions table (`timer_sessions`) tracking precise start, pause, resume, and completion timestamps.
- Accumulates elapsed seconds across pauses and links to routine occurrences and steps.

### 12. Accountability & Verification Reports (`/reports`)
- Comprehensive accountability dashboard:
  - **KPI Cards**: Completion rate %, Verified completions, Self-reported completions, Average delay minutes.
  - **Category Breakdown**: Punctuality and verification distribution across Spiritual, Health, Work, Fitness, etc.
  - **Recent Evidence Gallery**: Private image evidence cards with authenticated viewing and deletion.
  - **Chronological Audit History**: Full event log tracking alarm rings, acknowledgments, snoozes, timer runs, and verification proofs.

---

## 5. Automated Tests

### Backend Tests (PHPUnit / Pest)
```powershell
cd D:\xampp\htdocs\lifepilot_api
php artisan test
```
Result: **54 tests passed, 292 assertions, 0 errors**.
- Covers:
  - Authentication & ownership authorization (Sanctum)
  - Routine CRUD, multi-step builder, step reordering
  - Recurrence rules & idempotent task occurrence generation
  - Task execution state machine & required step enforcement
  - Alarm rules & data migration
  - Astronomical prayer engine (methods, Hanafi vs Standard Asr, manual offsets, mosque overrides, completions)
  - Daily timeline compilation, overnight shift handling, conflict detection, free slot suggestions, single-occurrence rescheduling and reset, weekly 7-day calendar, and monthly grid aggregation.
  - Alarm workflow queue, quiet hours, ringing trigger, acknowledge, snooze, max attempts auto-miss, and emergency stop.
  - Evidence upload, MIME/size validation, EXIF sanitization, authenticated streaming, deletion, and structured verification.
  - Timer sessions start, pause, resume, complete, and ownership isolation.
  - Accountability summary metrics and audit history timeline.

### Frontend Production Build
```powershell
cd D:\xampp\htdocs\lifepilot_work
& "node_modules\.bin\tsc.cmd" --noEmit
& "node_modules\.bin\next.cmd" build
```
Result: **100% clean TypeScript validation and static generation for all routes**.

---

## 6. Native Android Mobile App (`D:\xampp\htdocs\lifepilot_mobile`)

LifePilot Phase 06 introduces the native Android mobile application built with Flutter 3.50+, OpenJDK 17, Android SDK 36, and SQLite local offline storage, communicating with the Laravel REST API backend.

### Prerequisites
- **Flutter SDK**: `D:\flutter` (Flutter 3.50.1, Dart 3.14.0)
- **OpenJDK 17**: `D:\jdk` (Java 17.0.12)
- **Android SDK**: `C:\Users\NOMANC~1\AppData\Local\Android\Sdk` (API 34, 35, 36; NDK 28.2; CMake 3.22.1)
- **Gradle**: 9.5.0 Wrapper (`gradle-9.5.0-all.zip`)
- **Android Gradle Plugin (AGP)**: 9.3.1
- **Kotlin Gradle Plugin (KGP)**: 2.4.20 with built-in Kotlin

### Environment Configuration (PowerShell)
```powershell
$env:USERPROFILE = "C:\Users\NOMANC~1"
$env:JAVA_HOME = "D:\jdk"
$env:ANDROID_HOME = "C:\Users\NOMANC~1\AppData\Local\Android\Sdk"
$cleanPath = $env:PATH -replace "C:\\Users\\NomanComputer&Laptop", "C:\Users\NOMANC~1"
$env:PATH = "D:\flutter\bin;D:\jdk\bin;C:\Windows\System32;C:\Windows;C:\Windows\System32\WindowsPowerShell\v1.0;C:\Program Files\Git\cmd;C:\Users\NOMANC~1\AppData\Local\Android\Sdk\platform-tools;$cleanPath"
```

### Running on Android Emulator
When running on the official Android Studio emulator, `10.0.2.2:8000` automatically maps to the host machine's `127.0.0.1:8000` where Laravel is running:
```powershell
cd D:\xampp\htdocs\lifepilot_mobile
flutter run -d emulator-5554
```

To target a custom API host or physical device on the local Wi-Fi:
```powershell
flutter run --dart-define=API_URL=http://192.168.1.100:8000/api/v1
```

### Running Automated Mobile Tests
```powershell
cd D:\xampp\htdocs\lifepilot_mobile
powershell -ExecutionPolicy Bypass -File build_and_test.ps1
```
- **Automated Tests**: 6 passed, 0 failed across:
  - `test/auth_test.dart`: Token persistence, AES-256 secure storage, and user profile serialization.
  - `test/routine_test.dart`: Multi-step routine parsing, recurrence calculation, and alarm rule association.
  - `test/sync_queue_test.dart`: Task occurrence state transitions and offline sync queue idempotency.
  - `test/prayer_calc_test.dart`: Astronomical Meeus prayer calculation parsing and Tahajjud last-third window offsets.
- **Static Analysis**: `flutter analyze` reports 0 errors and 0 warnings.

### Assembling the Debug APK
```powershell
cd D:\xampp\htdocs\lifepilot_mobile
powershell -ExecutionPolicy Bypass -File build_apk.ps1
```
Output artifact generated at:
`D:\xampp\htdocs\lifepilot_mobile\build\app\outputs\flutter-apk\app-debug.apk` (162.3 MB)

### 22 Polished Screens Implemented
1. **Splash Screen**: Animated logo, session check, token validation.
2. **Welcome Screen**: Feature showcase, Midnight Flow onboarding.
3. **Login Screen**: Sanctum Bearer authentication, validation, error handling.
4. **Register Screen**: Account creation, timezone, and work-shift initialization.
5. **Main Shell Screen**: Persistent bottom navigation (5 tabs) + offline sync banner + global alarm receiver.
6. **Dashboard Screen**: Today's progress ring, next prayer card, upcoming routines, quick actions.
7. **Daily Planner Screen**: Timeline scroll, hourly grid, conflict badges, free slot finder.
8. **Weekly Planner Screen**: 7-day horizontal pager, routine occurrences per day.
9. **Monthly Planner Screen**: Calendar grid view with routine density indicators.
10. **Routine Library Screen**: Filter by category/priority, active toggle switches.
11. **Routine Builder Screen**: Step ordering, estimated duration, sound selection, camera verification toggle.
12. **Routine Detail Screen**: Step-by-step checklist, schedule summary, instant trigger.
13. **Multi-Step Execution Runner**: Step timer countdown, step completion logging, Wudu audio playback.
14. **Native Alarm Screen**: Fullscreen wake intent (`showWhenLocked="true"`), snooze (3/5/10/15m), acknowledge, emergency stop.
15. **Camera Evidence Screen**: Native viewfinder (`CameraLensDirection.back`), crosshair framing guide, flash control.
16. **Evidence Review Screen**: Photo preview, retake action, progress upload to `/api/v1/occurrences/{id}/steps/{stepId}/evidence`.
17. **Prayer Times Screen**: 5 daily prayer times, countdown to next prayer, Qibla compass direction indicator.
18. **Tahajjud Setup Screen**: Night calculation (Maghrib to Fajr), last-third calculation, wake offset slider (15m-60m).
19. **Focus Timer Screen**: Circular progress countdown/stopwatch, preset selectors (25m, 45m, 60m), session logger.
20. **Reports & Analytics Screen**: Routine completion rates, prayer adherence bar chart, weekly focus hours.
21. **User Profile Screen**: Avatar, shift schedules, target sleep hours, logout with account data purge.
22. **Settings Screen**: Theme selection, notification toggles, sound selector, offline sync management.

