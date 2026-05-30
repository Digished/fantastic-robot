"use client";

import { useEffect, useState } from "react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function daysInMonth(month: number, year: number): number {
  if (!month) return 31;
  // Day 0 of the next month is the last day of this month. Use a leap-safe
  // year when none is picked yet so February shows 29.
  return new Date(year || 2024, month, 0).getDate();
}

/**
 * A clean date-of-birth picker laid out as Day / Month / Year (dd/mm/yyyy),
 * avoiding the locale-dependent native <input type="date">. Keeps its own
 * part-state so partial selections aren't lost, and emits a "YYYY-MM-DD" string
 * to the parent only once all three parts are chosen ("" otherwise).
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
  const [day, setDay] = useState(0);
  const [month, setMonth] = useState(0);
  const [year, setYear] = useState(0);

  // Sync from an externally provided value (edit/settings prefill).
  useEffect(() => {
    if (!value) return;
    const [y, m, d] = value.split("-").map((n) => Number(n));
    if (y) setYear(y);
    if (m) setMonth(m);
    if (d) setDay(d);
  }, [value]);

  const currentYear = new Date().getUTCFullYear();
  const years = Array.from({ length: 120 }, (_, i) => currentYear - i);
  const days = Array.from({ length: daysInMonth(month, year) }, (_, i) => i + 1);

  function update(nd: number, nm: number, ny: number) {
    // Clamp the day to the chosen month (e.g. 31 → 30, or Feb 29/28).
    const clamped = nd && nm ? Math.min(nd, daysInMonth(nm, ny)) : nd;
    setDay(clamped);
    setMonth(nm);
    setYear(ny);
    onChange(clamped && nm && ny ? `${ny}-${pad(nm)}-${pad(clamped)}` : "");
  }

  return (
    <div className="grid grid-cols-3 gap-2" id={id}>
      <select
        className="field"
        aria-label="Day"
        value={day || ""}
        onChange={(e) => update(Number(e.target.value), month, year)}
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
        onChange={(e) => update(day, Number(e.target.value), year)}
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
        onChange={(e) => update(day, month, Number(e.target.value))}
      >
        <option value="">Year</option>
        {years.map((yy) => (
          <option key={yy} value={yy}>{yy}</option>
        ))}
      </select>
    </div>
  );
}
