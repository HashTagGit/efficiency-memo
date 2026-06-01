# Comparative Summary: TimeTracker & PawPal

> **Purpose**: Cross-project patterns and actionable recommendations for EfficiencyMemo  
> **Date**: June 2026

---

## 1. Cross-Project Patterns

Despite fundamentally different tech stacks (Python/Qt vs Electron/React) and target platforms (Windows desktop vs cross-platform desktop), TimeTracker and PawPal converge on several architectural and UX patterns:

### 1.1 Local-First Data with Simple Persistence

Both projects avoid external services entirely:
- **TimeTracker**: SQLite in `%LOCALAPPDATA%`, WAL mode, raw SQL queries
- **PawPal**: electron-store (JSON file), typed store schema

Neither project has authentication, cloud sync, or API dependencies at runtime. This aligns with EfficiencyMemo's new direction (local Supabase CLI). The shared lesson: **keep the data layer dead simple until user demand proves otherwise**.

### 1.2 Monolithic State Ownership

Both projects centralize state in a single process/module:
- **TimeTracker**: `MainWindow` class coordinates all UI interactions; `TrackerDB` is the single data access point
- **PawPal**: Main process owns all state; renderers receive snapshots via IPC; no two-way binding

EfficiencyMemo already follows this pattern through Supabase as the single source of truth + React Server Components for data fetching. The alignment validates the architecture.

### 1.3 Timer-Driven UX

Both projects are fundamentally timer-driven:
- **TimeTracker**: User-controlled start/stop timer + QTimer for UI updates
- **PawPal**: System-controlled interval timers (`setTimeout`/`setInterval`) for reminders

CoreHour sits at the intersection: user-controlled sessions (like TimeTracker) but could benefit from automated reminders (like PawPal).

### 1.4 Category/Tag-Based Organization

Both projects classify activities:
- **TimeTracker**: 8 hardcoded categories (Work, Study, Meal, Fun, Commute, Exercise, Rest, Other) with customizable colors
- **PawPal**: No categories, but distinct reminder types (break, hydration, focus) — effectively a 3-category system

CoreHour's tag system is more flexible than either. The lesson: **constrained taxonomies (8 categories or 3 types) are easier to visualize and reason about than fully freeform tags**. Consider offering default tag suggestions alongside custom tags.

### 1.5 Stats as Daily Achievement

Both projects frame statistics as daily accomplishments:
- **TimeTracker**: "Today you tracked X hours across Y categories"
- **PawPal**: "Today: 3 breaks, 5 waters, 45 min focus"

EfficiencyMemo's Charger-Reminder already has a daily-summary mindset ("Your device was at X% when you started"). CoreHour could adopt a similar daily achievement display.

---

## 2. Top 5 Actionable Recommendations

### Recommendation 1: Stats History with Auto-Rollover (Source: PawPal)

**What**: Implement daily stat archiving with automatic date-boundary detection. When `todayKey()` changes, save yesterday's stats to a `stats_history` table and reset today's counters.

**Why**: CoreHour currently tracks sessions but lacks historical aggregation. Charger-Reminder stores device snapshots but doesn't compute daily summaries. Adopting PawPal's `statsStore.ts` pattern gives both tools persistent daily records with zero user action.

**How**: Create a shared `StatsHistory` utility in `packages/shared/` that:
1. Computes `todayKey()` as `YYYY-MM-DD`
2. On app load, checks if stored stats have a different date
3. If different, archives yesterday to `stats_history` (Supabase table or localStorage)
4. Returns fresh empty stats for today

**Effort**: Low (~50 lines of TypeScript + one database migration)  
**Impact**: High (enables weekly/monthly trend views)

---

### Recommendation 2: Calendar-Driven CoreHour Navigation (Source: TimeTracker)

**What**: Make CoreHour's calendar a first-class navigation hub. Clicking a date shows all sessions, tags, and time totals for that day. Each calendar cell shows a color indicator of tracked volume.

**Why**: TimeTracker's calendar-centric design makes time review intuitive and fast. CoreHour currently shows today's sessions only — users can't easily browse past days or see patterns across weeks.

**How**:
1. Add a month-grid calendar component to CoreHour's main view
2. Query sessions grouped by date from Supabase
3. Color-code each cell by total minutes tracked (light green = low, dark green = high)
4. Click a date → expand below to show that day's check-ins
5. Add "This Week" / "This Month" aggregate views

**Effort**: Medium (new calendar component + grouped query logic)  
**Impact**: High (transforms CoreHour from a "today-only" timer to a time-journal)

---

### Recommendation 3: Configurable Break Reminders in CoreHour (Source: PawPal)

**What**: Add optional break reminders to CoreHour sessions. When a user has been tracking on a tag for N minutes, show a gentle notification with snooze and mute-for-today options.

**Why**: PawPal proves that gentle reminders drive consistent breaks without being annoying. CoreHour sessions can run for hours — users often forget to step away. A reminder system makes CoreHour a wellness tool, not just a productivity tracker.

**How**:
1. Add settings: break interval (default 45 min), snooze duration (default 10 min), mute-for-today toggle
2. When a session starts, schedule a browser notification (Notification API) for the interval
3. Show a small in-app toast with "Take a break", "Snooze 10 min", "Mute today" actions
4. Track breaks taken in session stats

**Effort**: Medium (~150 lines: settings UI + notification logic + stats counter)  
**Impact**: High (adds wellness dimension, differentiates from generic timers)

---

### Recommendation 4: Randomized UX Copy (Source: PawPal)

**What**: Replace static loading, empty state, and success messages with a pool of 3-5 randomized variants per message, selected via `pick()`.

**Why**: PawPal's randomized speech bubbles make an automated reminder system feel warm and alive. EfficiencyMemo's tool gallery has many repetitive UI states (loading spinners, empty states, success toasts) that feel mechanical. Randomization is a zero-cost way to add personality.

**How**:
1. Create a `packages/shared/src/ux-copy.ts` with message pools:
   ```ts
   const LOADING_MESSAGES = ["Crunching numbers...", "Almost there...", "Waking up the tools..."];
   export const pickLoading = () => pick(LOADING_MESSAGES);
   ```
2. Replace static strings in `Suspense` fallbacks, empty state components, and toast notifications
3. Keep pools small (3-5 variants) — enough for variety, not enough to be confusing

**Effort**: Very Low (~30 lines of constants + string replacements)  
**Impact**: Medium (disproportionate UX improvement per line of code)

---

### Recommendation 5: Settings Normalization on Load (Source: PawPal)

**What**: Every user preference stored in localStorage or Supabase should pass through a `normalizeSettings()` function that fills defaults, validates types, and handles missing/legacy values.

**Why**: PawPal's `normalizeSettings()` prevents crashes from corrupted or outdated settings. As EfficiencyMemo's tool gallery grows, user preferences will accumulate. A single normalization function per settings domain prevents an entire class of bugs.

**How**:
1. Create `normalizeCoreHourSettings(raw: Partial<CoreHourSettings>): CoreHourSettings`  
   Falls back to `DEFAULT_CORE_HOUR_SETTINGS`, validates number ranges, resolves enum-like values
2. Apply on every settings read from localStorage or Supabase
3. Add TypeScript `satisfies` check to ensure DEFAULT and normalized types match

**Effort**: Low (~30 lines per settings domain, 3 domains = ~90 lines)  
**Impact**: Medium (prevents silent bugs, makes settings migration safe)

---

## 3. Integration Priority Matrix

| # | Recommendation | Effort | Impact | Priority | Dependencies |
|---|---------------|--------|--------|----------|-------------|
| 1 | Stats History Auto-Rollover | Low | High | **P0 — Do First** | Database migration for stats_history table |
| 4 | Randomized UX Copy | Very Low | Medium | **P1 — Quick Win** | None (pure frontend) |
| 5 | Settings Normalization | Low | Medium | **P1 — Foundation** | None (add to existing settings reads) |
| 2 | Calendar-Driven Navigation | Medium | High | **P2 — Major Feature** | Rec #1 (needs stats history for calendar color coding) |
| 3 | Break Reminders | Medium | High | **P2 — Major Feature** | Browser Notification API support check |

### Effort vs Impact Visualization

```
Impact
  HIGH │  [1] Stats Auto-Rollover    [2] Calendar Nav
       │                              [3] Break Reminders
       │
 MEDIUM │  [4] Randomized Copy
       │  [5] Settings Normalization
       │
   LOW │
       └──────────────────────────────────────────
           VERY LOW    LOW        MEDIUM     HIGH
                        Effort
```

---

## 4. Patterns to Avoid

Both projects exhibit patterns that EfficiencyMemo should consciously avoid:

| Anti-Pattern | Source | Why Avoid | EfficiencyMemo Alternative |
|-------------|--------|-----------|---------------------------|
| Monolithic single-file architecture | TimeTracker | Untestable, unmaintainable at scale | Feature-folder structure (`features/core-hour/`, `features/charger-reminder/`) |
| Raw SQL inline strings | TimeTracker | No type safety, no migration tracking | Supabase client + typed queries |
| Platform-specific code (ctypes, osascript) | Both | Not portable to web | Web APIs (Notification, Service Worker, IndexedDB) |
| No automated UI tests | Both | Regression risk on every change | Playwright E2E + Vitest component tests |
| Full-state snapshots on every change | PawPal | Performance cost as state grows | Targeted Supabase real-time subscriptions |
| macOS-first features with Windows fallback | PawPal | Feature disparity frustrates users | Web-first: if it works in one browser, it works in all |

---

## 5. Conclusion

TimeTracker and PawPal represent two ends of the productivity-tool spectrum: **utilitarian time tracking** (TimeTracker) and **delightful wellness nudging** (PawPal). EfficiencyMemo's tool gallery sits between them — CoreHour is the tracker, and the overall "gallery" concept could incorporate the wellness angle.

**The single most impactful takeaway**: PawPal's stat history pattern (auto-rollover on date change) is a 50-line utility that enables weeks of downstream features (calendar heatmaps, weekly trends, achievement badges). Implement it first, then build the calendar and reminder features on top of it.

**The single easiest win**: Randomized UX copy takes 30 minutes to implement and makes the entire tool gallery feel more polished. Do it this sprint.

**The long-term vision**: CoreHour + break reminders + calendar heatmap = a time-journal that combines TimeTracker's analytical depth with PawPal's user-friendly personality. That's a uniquely valuable tool that neither reference project delivers alone.
