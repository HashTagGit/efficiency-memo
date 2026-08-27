# Review uncertain focus time explicitly

CoreHour pauses when it detects a long scheduler gap or supported system-idle interval and asks the user how much of that span to include. Scheduler gaps start uncounted; system-idle spans start counted, so one adjustment model can keep, trim, or discard either case without rewriting check-ins. Only reason, duration, counted seconds, and detection time are persisted with active-session progress. Windows uses the native last-input clock; other platforms retain scheduler-gap detection until a reliable native idle adapter is implemented.
