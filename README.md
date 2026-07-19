# Rasm — Daily Routine Tracker

A small, offline-friendly web app for tracking daily religious, educational, health, financial (or any) routines — categories, tasks with timestamps and importance, daily/weekly/monthly progress, and a calendar you can look back through.

All data is stored **only in your phone's browser storage** (localStorage). Nothing is sent anywhere — there is no backend, no account, no server.

## Hosting on GitHub Pages

1. Create a new GitHub repo (e.g. `routine-tracker`).
2. Upload all the files in this folder (`index.html`, `style.css`, `app.js`, `manifest.json`, `sw.js`, `icon.svg`) to the repo root.
3. Go to **Settings → Pages**, set Source to your main branch, root folder.
4. Your app will be live at `https://<your-username>.github.io/routine-tracker/`.
5. Open that link on your phone and use **"Add to Home Screen"** (Android Chrome: menu → Add to Home screen; iOS Safari: Share → Add to Home Screen) so it behaves like an installed app.

## Important things to know

- **Data is per-browser, per-device.** If you switch phones, reinstall the browser, or clear site data, your history is gone unless you've exported a backup. Use **Manage → Backup → Export JSON** regularly, and **Import JSON** to restore it.
- **Attachments share the same ~5–10MB storage budget as everything else.** Notes and links cost almost nothing. Images are auto-resized to keep them small. Audio/video files are capped at 3MB each here, but even a few of those can fill up the available space — if you see a "storage is full" message, delete a few attachments (images/audio/video first) or export a backup and do a full reset, then re-add what you need. For anything long (a full recitation, a long lecture), a Link is far more reliable than uploading the file.
- **Notifications/alarms have real limits.** Browsers can only remind you while the app tab is open, or (on Android, once installed to the home screen) while it's running in the background. iOS Safari is much stricter about background notifications even for installed web apps. For anything as important as prayer times, keep this as a *helper*, not your only alarm — pair it with your phone's built-in clock/alarm app.
- Tasks recur on the days of the week you choose (default: every day). A task only starts counting from the day you created it, so adding a new habit today won't retroactively mark earlier days as "missed."
- Deleting a category deletes its tasks. Deleting a task doesn't delete past history for it — it just stops being scheduled going forward.

## Features included

- Categories with custom name, emoji icon, and color (Religious, Educational, Health, Financial, or anything you add)
- Tasks with optional time, importance (low/medium/high), an independent reminder toggle, and custom day-of-week repeat
- **Subtasks** — break a task into steps (e.g. Fajr → Azkar). Checking every subtask automatically marks the parent task done; tapping the parent's own checkbox toggles all its subtasks at once.
- **Attachments** — tap the 📎 icon on any task or subtask to attach a note, image, audio clip, video clip, or link right there (e.g. put the text of Ayat al-Kursi, or a recitation audio, on the "Azkar" subtask itself). See the storage note below.
- **Today** view: a progress ring for the day, a streak counter, a "week at a glance" bead row, and your tasks grouped by category
- **Calendar** view: tap any past date to see exactly what was scheduled and what you completed, including subtask detail
- **Insights** view: this week's beads, a 30-day bar chart, a per-category completion breakdown, best streak, 30-day average, and perfect-day count
- **Manage** view: edit/add/delete categories and tasks, enable notifications, export/import a JSON backup, and a full data reset
- Light/dark theme toggle
- Installable as a home-screen app (PWA) with basic offline caching
- **Custom ring background** — in Manage → Ring background, upload your own photo to replace the default view behind the daily progress ring. Change or remove it anytime; it only updates when you choose to.
- **Real moon phase** — when no custom photo is set, the ring shows the actual current moon phase (New, Waxing Crescent, First Quarter, Waxing Gibbous, Full, Waning Gibbous, Last Quarter, Waning Crescent), computed offline from today's date — no internet or photo needed, and it updates on its own every day. A small label names the phase under the ring.
- A small geometric mark (two overlapping squares forming an 8-point star, echoing the app's section dividers) as the logo, used both as the home-screen icon and the in-app header mark

## Ideas for later (not built yet, but easy to layer on)

- **Notes per day** — a short journal entry alongside the checklist, for context on why a day went well or badly.
- **Sub-tasks / checklists inside a task** — e.g. "Exercise" broken into warm-up / main set / stretch.
- **Weighted importance in the daily %** — right now every task counts equally toward today's ring; you could make "high importance" tasks count for more.
- **Monthly goals separate from daily tasks** — e.g. "read 4 books this month" tracked independently of the daily checklist.
- **Reordering tasks** within a category by drag, instead of always sorting by time.
- **A "grace" mode for travel/illness days** — mark a whole day as excluded from streaks instead of it breaking your streak.
- **Cloud sync** — if you ever want your data to follow you across devices, that would require adding a small backend or something like Firebase; the current version deliberately avoids that to keep it simple and fully private.

## A few thoughts on your original spec

- You described "importance" and "notification/alarm" as one feature — I split them into two: **importance** (low/medium/high, shown as a colored flag, useful for future features like weighting) and a separate **reminder toggle** (bell icon) for anything you actually want a notification for. A task can be high-importance with no reminder, or low-importance with one — felt more flexible than tying them together.
- I added **day-of-week repeat** per task (not in your original list) since prayer times, weekday-only habits (like work-related financial logging), and Friday-specific tasks (Jumu'ah) don't all belong on every single day.
- I added **export/import backup** because "all data in phone storage" is fragile by nature — one accidental "clear browsing data" tap and months of history are gone otherwise.
- The 0–100% completion, streaks, and calendar all came from your ask to "track progress overtime" — I made a specific choice that a day only counts as part of a streak if it had at least one task scheduled, so days before you had any habits set up (or rest days with nothing scheduled) don't unfairly break things.
