import { describe, it, expect, vi } from "vitest";
import {
  formatDate,
  formatDateForInput,
  isWeekday,
  getNextWeekday,
  normalizeDate,
  isSameDay,
} from "./dates";

describe("Date Utilities", () => {
  // ============================================================
  // formatDate
  // ============================================================
  describe("formatDate", () => {
    it("should format a Date object to Spanish locale string", () => {
      const date = new Date(2024, 11, 15); // December 15, 2024
      const result = formatDate(date);
      // Spanish locale: "15 de diciembre de 2024"
      expect(result).toContain("15");
      expect(result).toContain("diciembre");
      expect(result).toContain("2024");
    });

    it("should parse and format ISO string dates", () => {
      const result = formatDate("2024-06-20");
      expect(result).toContain("20");
      expect(result).toContain("junio");
      expect(result).toContain("2024");
    });

    it("should handle edge case: first day of year", () => {
      const result = formatDate(new Date(2024, 0, 1));
      expect(result).toContain("1");
      expect(result).toContain("enero");
      expect(result).toContain("2024");
    });

    it("should handle edge case: last day of year", () => {
      const result = formatDate(new Date(2024, 11, 31));
      expect(result).toContain("31");
      expect(result).toContain("diciembre");
      expect(result).toContain("2024");
    });

    it("should handle leap year date", () => {
      const result = formatDate(new Date(2024, 1, 29)); // Feb 29, 2024
      expect(result).toContain("29");
      expect(result).toContain("febrero");
    });
  });

  // ============================================================
  // formatDateForInput
  // ============================================================
  describe("formatDateForInput", () => {
    it("should format date as yyyy-MM-dd for HTML input", () => {
      const date = new Date(2024, 5, 15); // June 15, 2024
      expect(formatDateForInput(date)).toBe("2024-06-15");
    });

    it("should pad single digit months with leading zero", () => {
      const date = new Date(2024, 0, 5); // January 5, 2024
      expect(formatDateForInput(date)).toBe("2024-01-05");
    });

    it("should pad single digit days with leading zero", () => {
      const date = new Date(2024, 11, 3); // December 3, 2024
      expect(formatDateForInput(date)).toBe("2024-12-03");
    });

    it("should handle end of year correctly", () => {
      const date = new Date(2024, 11, 31);
      expect(formatDateForInput(date)).toBe("2024-12-31");
    });
  });

  // ============================================================
  // isWeekday
  // ============================================================
  describe("isWeekday", () => {
    it("should return true for Monday", () => {
      const monday = new Date(2024, 11, 9); // Monday Dec 9, 2024
      expect(isWeekday(monday)).toBe(true);
    });

    it("should return true for Tuesday", () => {
      const tuesday = new Date(2024, 11, 10);
      expect(isWeekday(tuesday)).toBe(true);
    });

    it("should return true for Wednesday", () => {
      const wednesday = new Date(2024, 11, 11);
      expect(isWeekday(wednesday)).toBe(true);
    });

    it("should return true for Thursday", () => {
      const thursday = new Date(2024, 11, 12);
      expect(isWeekday(thursday)).toBe(true);
    });

    it("should return true for Friday", () => {
      const friday = new Date(2024, 11, 13);
      expect(isWeekday(friday)).toBe(true);
    });

    it("should return false for Saturday", () => {
      const saturday = new Date(2024, 11, 14);
      expect(isWeekday(saturday)).toBe(false);
    });

    it("should return false for Sunday", () => {
      const sunday = new Date(2024, 11, 15);
      expect(isWeekday(sunday)).toBe(false);
    });
  });

  // ============================================================
  // getNextWeekday
  // ============================================================
  describe("getNextWeekday", () => {
    it("should return Monday when called on Friday", () => {
      const friday = new Date(2024, 11, 13); // Friday Dec 13, 2024
      const result = getNextWeekday(friday);
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(16);
    });

    it("should return Monday when called on Saturday", () => {
      const saturday = new Date(2024, 11, 14);
      const result = getNextWeekday(saturday);
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(16);
    });

    it("should return Monday when called on Sunday", () => {
      const sunday = new Date(2024, 11, 15);
      const result = getNextWeekday(sunday);
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(16);
    });

    it("should return Tuesday when called on Monday", () => {
      const monday = new Date(2024, 11, 9);
      const result = getNextWeekday(monday);
      expect(result.getDay()).toBe(2); // Tuesday
      expect(result.getDate()).toBe(10);
    });

    it("should return next day when called mid-week (Wednesday -> Thursday)", () => {
      const wednesday = new Date(2024, 11, 11);
      const result = getNextWeekday(wednesday);
      expect(result.getDay()).toBe(4); // Thursday
      expect(result.getDate()).toBe(12);
    });

    it("should return date at start of day (00:00:00)", () => {
      const result = getNextWeekday(new Date(2024, 11, 10, 14, 30, 45));
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });

    it("should handle year boundary (Dec 31 Friday -> Jan 3 Monday)", () => {
      const decFriday = new Date(2027, 11, 31); // Friday Dec 31, 2027
      const result = getNextWeekday(decFriday);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(3);
      expect(result.getFullYear()).toBe(2028);
    });

    it("should use current date when no argument provided", () => {
      const mockDate = new Date(2024, 11, 10, 12, 0, 0); // Tuesday
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      const result = getNextWeekday();
      expect(result.getDay()).toBe(3); // Wednesday

      vi.useRealTimers();
    });
  });

  // ============================================================
  // normalizeDate
  // ============================================================
  describe("normalizeDate", () => {
    it("should remove time components from Date object", () => {
      const dateWithTime = new Date(2024, 5, 15, 14, 30, 45, 123);
      const result = normalizeDate(dateWithTime);

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it("should parse ISO string and normalize", () => {
      const result = normalizeDate("2024-08-20T15:45:30.000Z");
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
    });

    it("should preserve date components", () => {
      const date = new Date(2024, 7, 25, 23, 59, 59);
      const result = normalizeDate(date);

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(7); // August
      expect(result.getDate()).toBe(25);
    });

    it("should handle date-only string", () => {
      const result = normalizeDate("2024-12-25");
      expect(result.getDate()).toBe(25);
      expect(result.getMonth()).toBe(11); // December
    });
  });

  // ============================================================
  // isSameDay
  // ============================================================
  describe("isSameDay", () => {
    it("should return true for same date with different times", () => {
      const date1 = new Date(2024, 5, 15, 9, 0, 0);
      const date2 = new Date(2024, 5, 15, 18, 30, 45);
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it("should return false for different dates", () => {
      const date1 = new Date(2024, 5, 15);
      const date2 = new Date(2024, 5, 16);
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it("should return false for same day different month", () => {
      const date1 = new Date(2024, 5, 15);
      const date2 = new Date(2024, 6, 15);
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it("should return false for same day different year", () => {
      const date1 = new Date(2024, 5, 15);
      const date2 = new Date(2025, 5, 15);
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it("should handle string date comparison", () => {
      expect(isSameDay("2024-06-15", "2024-06-15")).toBe(true);
      expect(isSameDay("2024-06-15", "2024-06-16")).toBe(false);
    });

    it("should handle mixed Date and string comparison", () => {
      const date = new Date(2024, 5, 15, 12, 0, 0);
      expect(isSameDay(date, "2024-06-15")).toBe(true);
      expect(isSameDay("2024-06-15", date)).toBe(true);
    });

    it("should handle edge case: midnight vs end of day", () => {
      const midnight = new Date(2024, 5, 15, 0, 0, 0);
      const endOfDay = new Date(2024, 5, 15, 23, 59, 59);
      expect(isSameDay(midnight, endOfDay)).toBe(true);
    });

    it("should handle edge case: 11:59 PM vs 12:00 AM next day", () => {
      const lateNight = new Date(2024, 5, 15, 23, 59, 59);
      const earlyMorning = new Date(2024, 5, 16, 0, 0, 0);
      expect(isSameDay(lateNight, earlyMorning)).toBe(false);
    });
  });
});
