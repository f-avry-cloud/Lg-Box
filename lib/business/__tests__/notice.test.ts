import { describe, expect, it } from "vitest";

import { computeNoticeEndDate, daysUntil } from "@/lib/business/notice";

describe("computeNoticeEndDate", () => {
  it("adds the notice period in days to the request date", () => {
    const requestDate = new Date(Date.UTC(2026, 0, 1));
    const end = computeNoticeEndDate(requestDate, 30);
    expect(end.toISOString().slice(0, 10)).toBe("2026-01-31");
  });

  it("handles a zero-day notice period", () => {
    const requestDate = new Date(Date.UTC(2026, 0, 1));
    const end = computeNoticeEndDate(requestDate, 0);
    expect(end.toISOString().slice(0, 10)).toBe("2026-01-01");
  });

  it("rolls over into the next month/year correctly", () => {
    const requestDate = new Date(Date.UTC(2025, 11, 20));
    const end = computeNoticeEndDate(requestDate, 30);
    expect(end.toISOString().slice(0, 10)).toBe("2026-01-19");
  });
});

describe("daysUntil", () => {
  it("returns a positive number for a future date", () => {
    const from = new Date(Date.UTC(2026, 0, 1));
    const target = new Date(Date.UTC(2026, 0, 11));
    expect(daysUntil(target, from)).toBe(10);
  });

  it("returns a negative number for a past date", () => {
    const from = new Date(Date.UTC(2026, 0, 15));
    const target = new Date(Date.UTC(2026, 0, 1));
    expect(daysUntil(target, from)).toBe(-14);
  });

  it("returns zero for the same day", () => {
    const from = new Date(Date.UTC(2026, 0, 1));
    expect(daysUntil(from, from)).toBe(0);
  });
});
