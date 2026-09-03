import { describe, expect, it } from "vitest";
import { parseHolidayCalendar } from "../calendar";

describe("Pause & Hydrate holiday calendar import", () => {
  it("reads holiday and make-up workday events from ICS", () => {
    const calendar = parseHolidayCalendar([
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "DTSTART;VALUE=DATE:20270101",
      "DTEND;VALUE=DATE:20270102",
      "SUMMARY:元旦 假期",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "DTSTART;VALUE=DATE:20270103",
      "DTEND;VALUE=DATE:20270104",
      "SUMMARY:元旦 补班",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n"), 2027);
    expect(calendar).toEqual({ year: 2027, holidays: ["2027-01-01"], workdays: ["2027-01-03"] });
  });
});
