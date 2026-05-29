"use client";

import { useMemo } from "react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysInMonth(month: number, year: number): number {
  if (!month) return 31;
  // Day 0 of the next month is the last day of this month. Use a leap-safe
  // year when none is picked yet so February shows 29.
  return new Date(year || 2024, month, 0).getDate();
}

/**
 * A clean date-of-birth picker laid out as Day / Month / Year (dd/mm/yyyy),
 * avoiding the locale-dependent and clunky native <input type="date">.
 * Emits a "YYYY-MM-DD" string (or "" until all three parts are chosen).
 */
export function DateOfBirthPicker({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  const [y, m, d] = value
    ? value.split("-").map((n) => Number(n))
    : [0, 0, 0];
  const year = y || 0;
  const month = m || 0;
  const day = d || 0;

  const currentYear = new Date().getUTCFullYear();
  const years = useMemo(
    () => Array.from({ length: 120 }, (_, i) => currentYear - i),
    [currentYear],
  );
  const days = useMemo(
    () => Array.from({ length: daysInMonth(month, year) }, (_, i) => i + 1),
    [month, year],
  );

  function emit(nd: number, nm: number, ny: number) {
    if (nd && nm && ny) {
      // Clamp the day to the chosen month (e.g. 31 → 30, or Feb 29/28).
      const dd = Math.min(nd, daysInMonth(nm, ny));
      onChange(`${ny}-${String(nm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`);
    } else {
      onChange("");
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2" id={id}>
      <select
        className="field"
        aria-label="Day"
        value={day || ""}
        onChange={(e) => emit(Number(e.target.value), month, year)}
      >
        <option value="">Day</option>
        {days.map((dd) => (
          <option key={dd} value={dd}>{dd}</option>
        ))}
      </select>
      <select
        className="field"
        aria-label="Month"
        value={month || ""}
        onChange={(e) => emit(day, Number(e.target.value), year)}
      >
        <option value="">Month</option>
        {MONTHS.map((label, i) => (
          <option key={label} value={i + 1}>{label}</option>
        ))}
      </select>
      <select
        className="field"
        aria-label="Year"
        value={year || ""}
        onChange={(e) => emit(day, month, Number(e.target.value))}
      >
        <option value="">Year</option>
        {years.map((yy) => (
          <option key={yy} value={yy}>{yy}</option>
        ))}
      </select>
    </div>
  );
}
