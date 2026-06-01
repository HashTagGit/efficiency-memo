# TimeTracker Analysis Report

> **Source**: [Evelyn-rgb-debug/TimeTracker](https://github.com/Evelyn-rgb-debug/TimeTracker)  
> **Analyzed**: Windows/ directory (main build target)  
> **Date**: June 2026

---

## 1. Project Overview

TimeTracker is a Windows desktop time-tracking application written in Python with PySide6 (Qt for Python). It packs a timer, calendar-based review, task logging, planning with recurrence, daily/monthly todo lists, and summary statistics into a single glass-style interface. The entire application lives in one 5,498-line `main.py` file — a monolithic design that couples UI, database, and business logic in a single module.

The application targets personal daily time tracking. Users launch a timer with a category + optional task note, stop it when done, and review their history via calendar views (month/week/day). It also supports "plans" — future or recurring entries that appear on their target dates — and daily/monthly todo checklists.

---

## 2. Architecture & Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Language | Python 3 | Single 5,498-line `main.py` |
| GUI Framework | PySide6 (Qt 6) | Custom-painted widgets, no `.ui` files |
| Database | SQLite (WAL mode) | Local file at `%LOCALAPPDATA%\TimeTrackerGlass\tracker.db` |
| Build/Packaging | PyInstaller | `.spec` files for OneDir and OneFile builds |
| Platform | Windows-only | Uses `ctypes` for blur, tool-window, single-instance, auto-start |

**Database Schema** (5 tables):
- `sessions` — completed time entries (start, end, duration, category, task_text)
- `plans` — future/recurring entries with `recurrence`, `is_all_day`, `recurrence_range_start/end`
- `app_state` — key-value store for window position, theme prefs, category order
- `daily_todos` — per-day checklists with `is_done` and `completed_ts`
- `month_todos` — per-month checklists

The `TrackerDB` class handles all persistence with raw SQL. There is no ORM, no migration framework — schema changes are done via `ALTER TABLE` in `_init()` with PRAGMA checks.

**Key Architectural Patterns**:
- **Monolithic single-file**: All classes (20+) defined in one module. Simple to distribute but hard to maintain or test in isolation.
- **Custom-painted UI**: Every widget is hand-drawn with `QPainter` — cards, gradient backgrounds, glass blur, calendar cells, donut charts. No QSS stylesheets are used for primary rendering.
- **Windows-native hacks**: `ctypes` calls for Acrylic/blur behind (`SetWindowCompositionAttribute`), tool-window style (hides from taskbar), single-instance mutex, and Start Menu auto-start via VBScript.
- **Recurrence engine**: A pure-Python function (`iter_plan_occurrences`) expands recurrence rules (weekly/monthly/yearly) into concrete date ranges, with proper handling of month-end edge cases (e.g., Jan 31 recurring monthly → Feb 28/29).

---

## 3. Feature Inventory

### 3.1 Core Timer
| Feature | Assessment | Notes |
|---------|-----------|-------|
| Start/Stop session with category + task text | **Adopt** | Core pattern for CoreHour. TimeTracker uses a single running session; CoreHour's tag-based check-ins are more flexible. |
| Running timer display (HH:MM:SS) | **Adopt** | Simple QLabel update via QTimer. Equivalent to React `useEffect` + `setInterval`. |
| Elapsed counter alongside timer | **Skip** | Nice-to-have but adds visual noise. CoreHour's design is cleaner. |

### 3.2 Calendar & Review
| Feature | Assessment | Notes |
|---------|-----------|-------|
| Month/week/day calendar navigation | **Adapt** | TimeTracker's calendar is custom-painted — beautiful but high-maintenance. EfficiencyMemo would use a React date-picker library with custom styling. |
| Click date → show sessions for that day | **Adopt** | Directly applicable to CoreHour: clicking a day in calendar shows that day's check-ins. |
| Category-colored cells | **Adapt** | TimeTracker colors each calendar cell based on dominant category. Useful as an at-a-glance heatmap. Could be a tooltip or mini-indicator. |
| Date picker with year/month quick-switch | **Adopt** | `JumpDateCalendar` widget has dropdown month/year selector. Standard UX pattern. |

### 3.3 Planning & Recurrence
| Feature | Assessment | Notes |
|---------|-----------|-------|
| Plan future sessions with recurrence | **Adapt** | Weekly/monthly/yearly recurrence is powerful but complex. For EfficiencyMemo, start simpler: daily todo templates or "copy yesterday" pattern. |
| Recurrence range (start/end dates) | **Adapt** | If recurrence is adopted, range boundaries are essential. TimeTracker's implementation is solid. |
| All-day vs timed plans | **Skip** | Useful for a planner, not for a time-tracker focus. |
| Plan → actual session conversion | **Skip** | TimeTracker keeps plans and sessions separate. This adds complexity without clear UX benefit for a productivity tool. |

### 3.4 Todo Lists
| Feature | Assessment | Notes |
|---------|-----------|-------|
| Daily todo checklists | **Adapt** | Simple checklist tied to a date. Could be a CoreHour sidebar enhancement. |
| Monthly todo checklists | **Skip** | Monthly scope too coarse for a timer-focused tool. |
| Completion tracking (is_done + completed_ts) | **Adopt** | Clean data model: boolean + timestamp. |

### 3.5 Statistics & Visualization
| Feature | Assessment | Notes |
|---------|-----------|-------|
| Category distribution (donut chart + bar chart) | **Adopt** | Custom-painted charts with gradient fills. EfficiencyMemo can achieve similar with CSS/SVG or a lightweight chart library. |
| Today/Week/Month summary stats | **Adopt** | CoreHour already has basic stats. TimeTracker's range selector (Today → This Week → This Month → Custom) is a clean pattern. |
| Work-summary view (total hours per category) | **Adapt** | Useful for CoreHour's stats page. Aggregate by tag instead of category. |

### 3.6 System Integration
| Feature | Assessment | Notes |
|---------|-----------|-------|
| System tray minimize/restore | **Adopt** | Already in the plan for EfficiencyMemo? TimeTracker uses `QSystemTrayIcon`. For web app: PWA or Electron wrapper needed. |
| Windows auto-start | **Skip** | Web apps don't benefit from OS-level auto-start. |
| Single-instance enforcement | **Skip** | Not relevant for web app. |
| Window position/state persistence | **Adopt** | Saves window geometry to `app_state`. For web apps: save UI state (sidebar collapsed, tab selected) to localStorage. |

---

## 4. Notable UX Patterns

### 4.1 Timer UX
TimeTracker's timer widget is clean and physical: a large circular display with category dropdown, task text input, and a single Start/Stop button. The running timer shows elapsed time in a prominent label. When stopped, a confirmation dialog saves the session with editable start/end times.

**Takeaway for CoreHour**: The "one session at a time" model is intentionally simple but limiting. CoreHour's tag-based check-in model ("I'm working on [tag]") is more fluid. Keep CoreHour's model but consider adding a prominent elapsed-time display like TimeTracker's.

### 4.2 Calendar as Navigation Hub
The calendar widget is the primary navigation mechanism. Users click a date to see all sessions and tasks for that day. The month view shows category-colored cells, providing an instant visual summary of time allocation.

**Takeaway for CoreHour**: Consider making the calendar a first-class navigation element, not just a date picker. Each date could show a colored indicator of tracked time volume.

### 4.3 Glass/Acrylic Design Language
TimeTracker uses Windows Acrylic blur (`SetWindowCompositionAttribute`) and custom gradient painting to create a frosted-glass aesthetic. Cards have rounded corners, subtle shadows, and translucent backgrounds. The design language is cohesive but platform-locked.

**Takeaway**: EfficiencyMemo already achieves this with CSS `backdrop-filter: blur()` and Tailwind. No technical takeaways — just validation that the translucent card aesthetic works well for productivity tools.

### 4.4 Category Color System
Eight default categories are mapped to a gradient between mint (#86E7DC) and purple (#6B71D9). The `blend()` function interpolates evenly. Users can customize colors via a color picker dialog.

**Takeaway**: EfficiencyMemo's tool gallery uses distinct colors per tool (green for CoreHour, blue for Charger-Reminder). TimeTracker's approach of blending between two theme colors provides a useful pattern for sub-category or tag colorization.

---

## 5. Technical Patterns Worth Reusing

| Pattern | File/Location | Applicability |
|---------|--------------|---------------|
| WAL mode SQLite | `TrackerDB.__init__` | Use WAL for any local SQLite in EfficiencyMemo for better concurrent read performance |
| Key-value app state table | `app_state` table | Simpler than a full config system for persisting UI state — could be a `ui_prefs` table |
| `iter_plan_occurrences` recurrence expansion | `main.py` ~L539-599 | Clean algorithm for expanding recurrence rules into date ranges. Could inspire a JS recurrence utility if needed. |
| `clamp_item_to_range` / `split_item_by_day` | `main.py` ~L386-437 | Robust date-range clipping logic — useful for timeline/calendar views that display partial-day sessions. |
| `fmt_hms` (seconds → HH:MM:SS) | `main.py` ~L162-167 | Trivial but always needed. EfficiencyMemo already has equivalent in `formatDuration()`. |
| Single-instance via named mutex | `ensure_single_instance()` | Not applicable to web, but the pattern is clean for any future Electron wrapper. |

---

## 6. Risks & Anti-Patterns

- **Monolithic architecture**: All 20+ classes in one file. No separation of concerns. Not testable. Do NOT replicate this pattern — EfficiencyMemo's feature-folder structure (`features/core-hour/`, `features/charger-reminder/`) is strictly superior.
- **No tests**: Zero test files in the repository. Any code adopted from TimeTracker needs fresh test coverage.
- **Raw SQL everywhere**: SQL queries are inline strings with no parameterization abstraction. Use EfficiencyMemo's Supabase client or a query builder instead.
- **Platform lock-in**: Heavy reliance on `ctypes`, Windows registry, and VBScript. None of these patterns transfer to a web app.
- **No state management abstraction**: UI state is scattered across widget instance variables. React's state management (hooks, context) is a cleaner approach.

---

## 7. Summary: Adopt / Adapt / Skip

| Category | Adopt | Adapt | Skip |
|----------|-------|-------|------|
| **Timer** | Start/Stop session model, elapsed display | — | "One session at a time" limitation |
| **Calendar** | Click-date-to-view-sessions, quick-switch month/year | Category-colored cells | Custom-painted calendar widget |
| **Planning** | — | Recurrence expansion algorithm | All-day plans, plan→session conversion |
| **Todo** | is_done + completed_ts data model | Daily checklist sidebar | Monthly todo lists |
| **Stats** | Category distribution charts, range selector | Aggregate-by-tag adaptation | Custom QPainter rendering |
| **System** | Window state persistence (→ localStorage) | — | Windows auto-start, single-instance, tray |
| **Architecture** | WAL mode SQLite, key-value config table | — | Monolithic single-file, raw SQL, platform hacks |

**Bottom line**: TimeTracker is a polished Windows utility with thoughtful UX but unsustainable architecture. Adopt its feature ideas (calendar-driven navigation, stats aggregation, recurrence patterns) while keeping EfficiencyMemo's modular React/Supabase architecture.
