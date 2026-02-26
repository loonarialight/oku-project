import { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { AuthContext } from "../context/ts/AuthContext";
import { ThemeContext } from "../context/ts/ThemeContext";
import api from "../services/api";
import "../styles/theme.css";
import "./analytics.css";

/* ══════════════════════════════════════
   Types
══════════════════════════════════════ */
interface DailyRow {
  date: string;
  total_minutes: string;
}

interface HourRow {
  hour: number;
  sessions_count: number;
  total_minutes: number;
}

interface SubjectRow {
  name: string;
  sessions_count: number;
  total_minutes: number;
}

interface StreakResponse {
  streak: number;
}

type TabId = "overview" | "hours" | "subjects";

/* ══════════════════════════════════════
   Helpers
══════════════════════════════════════ */
function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
 
 

function formatHour(h: number): string {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

/* Custom tooltip for recharts */
interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  unit?: string;
}

function CustomTooltip({ active, payload, label, unit = "min" }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{label}</p>
      <p className="chart-tooltip__value">{payload[0].value} {unit}</p>
    </div>
  );
}

/* ══════════════════════════════════════
   Component
══════════════════════════════════════ */
export default function Analytics() {
  const { logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [streak, setStreak] = useState(0);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [hours, setHours] = useState<HourRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);

  const now = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - now.getDay() + i);
    return d;
  });

  useEffect(() => { void loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [s, d, h, sub] = await Promise.allSettled([
        api.get<StreakResponse>("/analytics/streak"),
        api.get<DailyRow[]>("/analytics/user"),
        api.get<HourRow[]>("/analytics/hours"),
        api.get<SubjectRow[]>("/analytics/subjects"),
      ]);

      if (s.status === "fulfilled") setStreak(s.value.data.streak);
      if (d.status === "fulfilled") setDaily(d.value.data);
      if (h.status === "fulfilled") setHours(h.value.data);
      if (sub.status === "fulfilled") setSubjects(sub.value.data);
    } catch {
      setError("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() { logout(); navigate("/login"); }

  /* ── Derived data ── */

  // Last 14 days for overview chart
  const last14: { label: string; minutes: number }[] = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - 13 + i);
    const iso = d.toISOString().slice(0, 10);
    const row = daily.find((r) => r.date.slice(0, 10) === iso);
    return {
      label: i === 13 ? "Today" : DAY_NAMES[d.getDay()],
      minutes: row ? Math.round(Number(row.total_minutes)) : 0,
    };
  });

  const totalMinutes = daily.reduce((s, r) => s + Math.round(Number(r.total_minutes)), 0);
  const avgMinutes = daily.length > 0 ? Math.round(totalMinutes / daily.length) : 0;
  const maxDay = Math.max(...last14.map((d) => d.minutes), 1);

  // Hours chart — fill gaps 0–23
  const hoursChart = Array.from({ length: 24 }, (_, h) => {
    const row = hours.find((r) => r.hour === h);
    return { label: formatHour(h), hour: h, minutes: row?.total_minutes ?? 0 };
  });
  const maxHour = Math.max(...hoursChart.map((h) => h.minutes), 1);

  // Best hour
  const bestHour = hoursChart.reduce((a, b) => (a.minutes > b.minutes ? a : b), hoursChart[0]);

  // Subjects max for progress bars
  const maxSubjectMin = Math.max(...subjects.map((s) => s.total_minutes), 1);

  // Chart colors based on theme
  const barColor = theme === "dark" ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.14)";
  const barColorBest = theme === "dark" ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.6)";
  const tooltipBg = theme === "dark" ? "#2a2a2a" : "#f0ede9";
  const tooltipBorder = theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

  return (
    <div className="page-shell">

      {/* ── Header ── */}
      <header className="page-header">
        <div className="page-header__left">
          <button className="menu-btn" aria-label="Menu">
            <span /><span /><span />
          </button>
          <span className="page-header__title">ANALYTICS</span>
        </div>
        <div className="page-header__right">
          <button className="theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          <button className="logout-btn" onClick={handleLogout}>LOGOUT</button>
        </div>
      </header>

      {/* ── Week strip ── */}
      <div className="week-strip">
        <div className="week-strip__col week-strip__col--label">
          <span className="week-strip__year">{now.getFullYear()}</span>
          <span className="week-strip__wnum">W{getWeekNumber(now)}</span>
        </div>
        {weekDays.map((d) => {
          const isToday = d.toDateString() === now.toDateString();
          return (
            <div
              key={d.getDate()}
              className={`week-strip__col${isToday ? " week-strip__col--today" : ""}`}
            >
              <span className="week-strip__dayname">{DAY_NAMES[d.getDay()]}</span>
              <span className="week-strip__daynum">{d.getDate()}</span>
            </div>
          );
        })}
      </div>

      {/* ── Tabs ── */}
      <div className="an-tabs">
        {(["overview", "hours", "subjects"] as TabId[]).map((t) => (
          <button
            key={t}
            className={`an-tabs__btn${tab === t ? " an-tabs__btn--active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ── Main ── */}
      <main className="an-main fade-up">
        {loading ? (
          <div className="an-loader">
            <span className="ring ring--md" />
          </div>
        ) : (
          <>
            {error && <div className="error-banner">{error}</div>}

            {/* ════ OVERVIEW TAB ════ */}
            {tab === "overview" && (
              <div className="an-section">
                {/* Summary cards */}
                <div className="an-summary">
                  <div className="an-card">
                    <p className="an-card__label">STREAK</p>
                    <div className="an-card__row">
                      <span className="an-card__fire">🔥</span>
                      <span className="an-card__big">{streak}</span>
                    </div>
                    <p className="an-card__sub">days in a row</p>
                  </div>

                  <div className="an-card">
                    <p className="an-card__label">TOTAL</p>
                    <div className="an-card__row">
                      <span className="an-card__big">{Math.round(totalMinutes / 60)}</span>
                      <span className="an-card__unit">h</span>
                    </div>
                    <p className="an-card__sub">{totalMinutes} minutes all time</p>
                  </div>

                  <div className="an-card">
                    <p className="an-card__label">DAILY AVG</p>
                    <div className="an-card__row">
                      <span className="an-card__big">{avgMinutes}</span>
                      <span className="an-card__unit">min</span>
                    </div>
                    <p className="an-card__sub">on active days</p>
                  </div>

                  <div className="an-card">
                    <p className="an-card__label">SESSIONS</p>
                    <div className="an-card__row">
                      <span className="an-card__big">
                        {subjects.reduce((s, r) => s + r.sessions_count, 0)}
                      </span>
                    </div>
                    <p className="an-card__sub">completed total</p>
                  </div>
                </div>

                {/* 14-day bar chart */}
                <div className="an-chart-block">
                  <p className="an-chart-block__title">LAST 14 DAYS</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={last14} barCategoryGap="28%">
                      <XAxis
                        dataKey="label"
                        tick={{ fontFamily: "DM Mono", fontSize: 10, fill: "var(--chart-tick)" }}
                        axisLine={false}
                        tickLine={false}
                        interval={1}
                      />
                      <YAxis hide />
                      <Tooltip
                        content={<CustomTooltip />}
                        cursor={false}
                        wrapperStyle={{
                          background: tooltipBg,
                          border: `1px solid ${tooltipBorder}`,
                          borderRadius: 3,
                        }}
                      />
                      <Bar dataKey="minutes" radius={[2, 2, 0, 0]}>
                        {last14.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.minutes === maxDay ? barColorBest : barColor}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ════ HOURS TAB ════ */}
            {tab === "hours" && (
              <div className="an-section">
                {bestHour.minutes > 0 && (
                  <div className="an-highlight">
                    <p className="an-highlight__label">MOST PRODUCTIVE HOUR</p>
                    <p className="an-highlight__value">{formatHour(bestHour.hour)}</p>
                    <p className="an-highlight__sub">{bestHour.minutes} min studied</p>
                  </div>
                )}

                <div className="an-chart-block">
                  <p className="an-chart-block__title">SESSIONS BY HOUR</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={hoursChart} barCategoryGap="20%">
                      <XAxis
                        dataKey="label"
                        tick={{ fontFamily: "DM Mono", fontSize: 9, fill: "var(--chart-tick)" }}
                        axisLine={false}
                        tickLine={false}
                        interval={2}
                      />
                      <YAxis hide />
                      <Tooltip
                        content={<CustomTooltip />}
                        cursor={false}
                        wrapperStyle={{
                          background: tooltipBg,
                          border: `1px solid ${tooltipBorder}`,
                          borderRadius: 3,
                        }}
                      />
                      <Bar dataKey="minutes" radius={[2, 2, 0, 0]}>
                        {hoursChart.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.minutes === maxHour ? barColorBest : barColor}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Hour breakdown list — top 5 */}
                <div className="an-list">
                  <p className="an-list__title">TOP HOURS</p>
                  {[...hoursChart]
                    .sort((a, b) => b.minutes - a.minutes)
                    .slice(0, 5)
                    .filter((h) => h.minutes > 0)
                    .map((h, i) => (
                      <div key={h.hour} className="an-row">
                        <span className="an-row__rank">#{i + 1}</span>
                        <span className="an-row__name">{formatHour(h.hour)}</span>
                        <div className="an-row__bar-wrap">
                          <div
                            className="an-row__bar"
                            style={{ width: `${(h.minutes / maxHour) * 100}%` }}
                          />
                        </div>
                        <span className="an-row__val">{h.minutes}<span className="an-row__unit"> min</span></span>
                      </div>
                    ))}
                  {hoursChart.every((h) => h.minutes === 0) && (
                    <p className="an-empty">No hour data yet</p>
                  )}
                </div>
              </div>
            )}

            {/* ════ SUBJECTS TAB ════ */}
            {tab === "subjects" && (
              <div className="an-section">
                {subjects.length === 0 ? (
                  <p className="an-empty">No subject data yet</p>
                ) : (
                  <>
                    {/* Top subject highlight */}
                    <div className="an-highlight">
                      <p className="an-highlight__label">TOP SUBJECT</p>
                      <p className="an-highlight__value">{subjects[0].name}</p>
                      <p className="an-highlight__sub">
                        {subjects[0].total_minutes} min · {subjects[0].sessions_count} sessions
                      </p>
                    </div>

                    {/* Subject list with progress bars */}
                    <div className="an-list">
                      <p className="an-list__title">ALL SUBJECTS</p>
                      {subjects.map((s, i) => (
                        <div key={s.name} className="an-subject">
                          <div className="an-subject__header">
                            <div className="an-subject__left">
                              <span className="an-subject__rank">#{i + 1}</span>
                              <span className="an-subject__name">{s.name}</span>
                            </div>
                            <div className="an-subject__right">
                              <span className="an-subject__min">{s.total_minutes}<span className="an-row__unit"> min</span></span>
                              <span className="an-subject__sessions">{s.sessions_count} sessions</span>
                            </div>
                          </div>
                          <div className="an-subject__track">
                            <div
                              className="an-subject__fill"
                              style={{ width: `${(s.total_minutes / maxSubjectMin) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Subject mini bar chart */}
                    <div className="an-chart-block">
                      <p className="an-chart-block__title">MINUTES BY SUBJECT</p>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={subjects} barCategoryGap="30%">
                          <XAxis
                            dataKey="name"
                            tick={{ fontFamily: "DM Mono", fontSize: 10, fill: "var(--chart-tick)" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis hide />
                          <Tooltip
                            content={<CustomTooltip />}
                            cursor={false}
                            wrapperStyle={{
                              background: tooltipBg,
                              border: `1px solid ${tooltipBorder}`,
                              borderRadius: 3,
                            }}
                          />
                          <Bar dataKey="total_minutes" radius={[2, 2, 0, 0]}>
                            {subjects.map((_, i) => (
                              <Cell
                                key={i}
                                fill={i === 0 ? barColorBest : barColor}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Bottom nav ── */}
      <nav className="bottom-nav">
        <Link to="/" className="bottom-nav__item">
          <HomeIcon />
          <span>HOME</span>
        </Link>
        <div className="bottom-nav__item bottom-nav__item--active">
          <TrendIcon />
          <span>ANALYTICS</span>
        </div>
        <Link to="/" className="bottom-nav__item">
          <GroupsIcon />
          <span>GROUPS</span>
        </Link>
        <Link to="/" className="bottom-nav__item">
          <MoreIcon />
          <span>MORE</span>
        </Link>
      </nav>
    </div>
  );
}

/* ── Icons ── */
function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  );
}
function HomeIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>;
}
function TrendIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 17l6-6 4 4 8-9"/></svg>;
}
function GroupsIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2 20c0-3.314 3.134-6 7-6s7 2.686 7 6"/><path d="M16 14c2.21 0 4 2 4 4"/></svg>;
}
function MoreIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6h16M4 12h16M4 18h16"/></svg>;
}