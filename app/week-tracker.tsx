"use client";

import { Check, Clock3, Wifi } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const COPENHAGEN_TIME_ZONE = "Europe/Copenhagen";
const RANGE_START_UTC = Date.UTC(2026, 7, 31);
const TOTAL_WEEKS = 52;

type ClockState = {
  now: Date;
  synced: boolean;
};

type WeekStatus = "complete" | "current" | "future";

function isoWeekNumber(date: Date) {
  const value = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((value.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
}

function copenhagenDateSerial(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: COPENHAGEN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return Date.UTC(pick("year"), pick("month") - 1, pick("day"));
}

function buildMonths() {
  const monthMap = new Map<
    string,
    {
      month: string;
      year: number;
      weeks: { number: number; start: number; end: number }[];
    }
  >();

  for (let index = 0; index < TOTAL_WEEKS; index += 1) {
    const start = RANGE_START_UTC + index * 7 * 86_400_000;
    const end = start + 7 * 86_400_000;
    const monday = new Date(start);
    const thursday = new Date(start + 3 * 86_400_000);
    const key = thursday.getUTCFullYear() + "-" + thursday.getUTCMonth();

    if (!monthMap.has(key)) {
      monthMap.set(key, {
        month: new Intl.DateTimeFormat("en-GB", {
          month: "long",
          timeZone: "UTC",
        }).format(thursday),
        year: thursday.getUTCFullYear(),
        weeks: [],
      });
    }

    monthMap.get(key)?.weeks.push({
      number: isoWeekNumber(monday),
      start,
      end,
    });
  }

  return Array.from(monthMap.values());
}

const MONTHS = buildMonths();

export function WeekTracker() {
  const [clock, setClock] = useState<ClockState>({
    now: new Date(0),
    synced: false,
  });
  const [serverOffset, setServerOffset] = useState(0);

  const syncClock = useCallback(async () => {
    const requestStarted = Date.now();
    try {
      const response = await fetch("/api/time", { cache: "no-store" });
      if (!response.ok) throw new Error("Clock request failed");
      const data = (await response.json()) as { epochMs: number };
      const requestFinished = Date.now();
      const midpoint = requestStarted + (requestFinished - requestStarted) / 2;
      const offset = data.epochMs - midpoint;
      setServerOffset(offset);
      setClock({ now: new Date(Date.now() + offset), synced: true });
    } catch {
      setClock({ now: new Date(), synced: false });
    }
  }, []);

  useEffect(() => {
    const initialSync = window.setTimeout(() => void syncClock(), 0);
    const tick = window.setInterval(() => {
      setClock((current) => ({
        ...current,
        now: new Date(Date.now() + serverOffset),
      }));
    }, 1_000);
    const resync = window.setInterval(() => void syncClock(), 15 * 60 * 1_000);
    return () => {
      window.clearTimeout(initialSync);
      window.clearInterval(tick);
      window.clearInterval(resync);
    };
  }, [serverOffset, syncClock]);

  const todaySerial = copenhagenDateSerial(clock.now);
  const completedCount = useMemo(
    () =>
      MONTHS.flatMap((month) => month.weeks).filter(
        (week) => todaySerial >= week.end,
      ).length,
    [todaySerial],
  );

  const timeText = new Intl.DateTimeFormat("en-GB", {
    timeZone: COPENHAGEN_TIME_ZONE,
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(clock.now);

  const getStatus = (start: number, end: number): WeekStatus => {
    if (todaySerial >= end) return "complete";
    if (todaySerial >= start) return "current";
    return "future";
  };

  return (
    <main className="tracker-shell">
      <div className="tracker-wrap">
        <header className="tracker-header">
          <div className="title-block">
            <span className="accent-line" />
            <div>
              <p className="eyebrow">September 2026 - August 2027</p>
              <h1>Weekly Tracker</h1>
            </div>
          </div>

          <div className="clock-panel" aria-live="polite">
            <div className="year-mark">2026 / 2027</div>
            <div className="clock-line">
              <Clock3 size={16} aria-hidden="true" />
              <time dateTime={clock.now.toISOString()}>{timeText}</time>
              <span
                className={clock.synced ? "sync-dot online" : "sync-dot"}
                title={clock.synced ? "Synced to server time" : "Using device time"}
              />
            </div>
            <div className="timezone-line">
              <Wifi size={14} aria-hidden="true" />
              Copenhagen time {clock.synced ? "- online" : "- reconnecting"}
            </div>
          </div>
        </header>

        <section className="progress-strip" aria-label="Calendar progress">
          <div>
            <strong>{completedCount}</strong>
            <span> of {TOTAL_WEEKS} weeks complete</span>
          </div>
          <div className="progress-track" aria-hidden="true">
            <span
              style={{ width: String((completedCount / TOTAL_WEEKS) * 100) + "%" }}
            />
          </div>
        </section>

        <section className="months-grid" aria-label="Weekly calendar">
          {MONTHS.map((month) => (
            <article className="month-card" key={month.month + "-" + month.year}>
              <header
                className={month.year === 2026 ? "month-head" : "month-head new-year"}
              >
                <h2>{month.month}</h2>
                <span>{month.year}</span>
              </header>
              <div className="week-list">
                {month.weeks.map((week) => {
                  const status = getStatus(week.start, week.end);
                  return (
                    <div
                      className={"week-row " + status}
                      key={month.year + "-" + week.number}
                      aria-label={"Week " + week.number + ": " + status}
                    >
                      <div className="week-label">
                        <span>W</span>
                        {String(week.number).padStart(2, "0")}
                      </div>
                      {status === "current" && <span className="now-label">Now</span>}
                      <span className="week-check" aria-hidden="true">
                        {status === "complete" && (
                          <Check size={18} strokeWidth={3} />
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
