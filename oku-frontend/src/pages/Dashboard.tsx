import { useState, useEffect, useRef, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/ts/AuthContext";
import { ThemeContext } from "../context/ts/ThemeContext";
import api from "../services/api";
import type { StreakResponse, DailyRow, SessionRow, Subject } from "../types/api";
import "../styles/theme.css";
import "./dashboard.css";

interface DashState {
  streak: number;
  todayMinutes: number;
  activeSession: SessionRow | null;
  subjects: Subject[];
  selectedSubjectId: number | null;
  loading: boolean;
  sessionLoading: boolean;
  error: string;
  showPicker: boolean;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function getElapsed(startTime: string): number {
  return Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getTodayMinutes(rows: DailyRow[]): number {
  const today = new Date().toISOString().slice(0, 10);
  const row = rows.find((r: DailyRow) => r.date.slice(0, 10) === today);
  return row ? Math.round(Number(row.total_minutes)) : 0;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Fetch logic outside component — no setState here, returns plain data
function fetchDashData() {
  return Promise.allSettled([
    api.get<StreakResponse>("/analytics/streak"),
    api.get<DailyRow[]>("/analytics/user"),
    api.get<Subject[]>("/subjects"),
  ]);
}

export default function Dashboard() {
  const { logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reloadRef = useRef(0);

  const [state, setState] = useState<DashState>({
    streak: 0,
    todayMinutes: 0,
    activeSession: null,
    subjects: [],
    selectedSubjectId: null,
    loading: true,
    sessionLoading: false,
    error: "",
    showPicker: false,
  });

  const [tick, setTick] = useState(0);
  void tick;

  const elapsed = state.activeSession
    ? getElapsed(state.activeSession.start_time)
    : 0;

  const now = new Date();

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - now.getDay() + i);
    return d;
  });

  // reloadRef.current increments to re-trigger this effect after handleEnd
  useEffect(() => {
    // setState only inside .then() callback — never synchronously in effect body
    fetchDashData().then(([streakRes, analyticsRes, subjectsRes]) => {
      setState((s) => ({
        ...s,
        loading: false,
        error: "",
        streak:
          streakRes.status === "fulfilled" ? streakRes.value.data.streak : 0,
        todayMinutes:
          analyticsRes.status === "fulfilled"
            ? getTodayMinutes(analyticsRes.value.data)
            : 0,
        subjects:
          subjectsRes.status === "fulfilled" ? subjectsRes.value.data : [],
        selectedSubjectId:
          subjectsRes.status === "fulfilled" && subjectsRes.value.data.length > 0
            ? subjectsRes.value.data[0].id
            : null,
      }));
    }).catch(() => {
      setState((s) => ({ ...s, loading: false, error: "Failed to load data" }));
    });
  }, [reloadRef.current]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!state.activeSession) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.activeSession]);

  async function handleStart(): Promise<void> {
    if (state.subjects.length > 1 && !state.showPicker) {
      setState((s) => ({ ...s, showPicker: true }));
      return;
    }
    if (!state.selectedSubjectId) {
      setState((s) => ({ ...s, error: "Please select a subject" }));
      return;
    }
    setState((s) => ({ ...s, sessionLoading: true, error: "", showPicker: false }));
    try {
      const res = await api.post<SessionRow>("/session/start", {
        subject_id: state.selectedSubjectId,
      });
      setState((s) => ({ ...s, activeSession: res.data, sessionLoading: false }));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setState((s) => ({
        ...s,
        sessionLoading: false,
        error: e.response?.data?.error ?? "Failed to start session",
      }));
    }
  }

  async function handleEnd(): Promise<void> {
    const session = state.activeSession;
    if (!session) return;
    setState((s) => ({ ...s, sessionLoading: true, error: "" }));
    try {
      await api.post(`/session/end/${session.id}`);
      setState((s) => ({
        ...s,
        activeSession: null,
        sessionLoading: false,
        loading: true,
      }));
      // Incrementing ref triggers the data-fetch effect
      reloadRef.current += 1;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setState((s) => ({
        ...s,
        sessionLoading: false,
        error: e.response?.data?.error ?? "Failed to end session",
      }));
    }
  }

  const isActive = Boolean(state.activeSession);
  const progressPct = Math.min((state.todayMinutes / 60) * 100, 100);
  const activeSubjectName =
    state.subjects.find((s: Subject) => s.id === state.activeSession?.subject_id)?.name ?? "";

  return (
    <div className="page-shell">
      <header className="page-header">
        <div className="page-header__left">
          <button className="menu-btn" aria-label="Menu">
            <span /><span /><span />
          </button>
          <span className="page-header__title">
            {DAY_NAMES[now.getDay()]}, {now.toLocaleString("en", { month: "short" })} {now.getDate()}
          </span>
          {isActive && (
            <div className="dash-live">
              <span className="dash-live__dot" />
              LIVE
            </div>
          )}
        </div>
        <div className="page-header__right">
          <button className="theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          <button className="logout-btn" onClick={() => { logout(); navigate("/login"); }}>
            LOGOUT
          </button>
        </div>
      </header>

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

      <main className="dash-main fade-up">
        {state.loading ? (
          <div className="dash-loader"><span className="ring ring--md" /></div>
        ) : (
          <>
            {state.error && <div className="error-banner">{state.error}</div>}

            <div className="dash-stats">
              <div className="dash-card">
                <p className="dash-card__label">STREAK</p>
                <div className="dash-card__row">
                  <span className="dash-card__fire">🔥</span>
                  <span className="dash-card__big">{state.streak}</span>
                </div>
                <p className="dash-card__sub">days in a row</p>
              </div>
              <div className="dash-card">
                <p className="dash-card__label">TODAY</p>
                <div className="dash-card__row">
                  <span className="dash-card__big">{state.todayMinutes}</span>
                  <span className="dash-card__unit">min</span>
                </div>
                <div className="dash-prog">
                  <div className="dash-prog__fill" style={{ width: `${progressPct}%` }} />
                </div>
                <p className="dash-card__sub">goal: 60 min</p>
              </div>
            </div>

            {state.showPicker && state.subjects.length > 0 && (
              <div className="dash-picker">
                <p className="dash-picker__label">SELECT SUBJECT</p>
                <div className="dash-picker__list">
                  {state.subjects.map((subj: Subject) => (
                    <button
                      key={subj.id}
                      className={`dash-picker__item${state.selectedSubjectId === subj.id ? " dash-picker__item--on" : ""}`}
                      onClick={() => setState((s) => ({ ...s, selectedSubjectId: subj.id }))}
                    >
                      {subj.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="dash-session">
              {isActive && (
                <div className="dash-timer">
                  {activeSubjectName && (
                    <p className="dash-timer__subject">{activeSubjectName}</p>
                  )}
                  <p className="dash-timer__badge">SESSION IN PROGRESS</p>
                  <p className="dash-timer__value">{formatDuration(elapsed)}</p>
                </div>
              )}
              <button
                className={`dash-btn${isActive ? " dash-btn--end" : " dash-btn--start"}`}
                onClick={isActive ? handleEnd : handleStart}
                disabled={state.sessionLoading}
              >
                {state.sessionLoading ? (
                  <span className="ring ring--sm" />
                ) : isActive ? (
                  <><StopIcon /><span>END SESSION</span></>
                ) : (
                  <><PlayIcon /><span>START SESSION</span></>
                )}
              </button>
              {!isActive && !state.showPicker && (
                <p className="dash-hint">Start a session to track your progress</p>
              )}
              {state.showPicker && (
                <button
                  className="dash-cancel"
                  onClick={() => setState((s) => ({ ...s, showPicker: false }))}
                >
                  CANCEL
                </button>
              )}
            </div>
          </>
        )}
      </main>

      <nav className="bottom-nav">
        <div className="bottom-nav__item bottom-nav__item--active">
          <HomeIcon /><span>HOME</span>
        </div>
        <Link to="/learn" className="bottom-nav__item">
          <BookIcon /><span>LEARN</span>
        </Link>
        <Link to="/analytics" className="bottom-nav__item">
          <TrendIcon /><span>ANALYTICS</span>
        </Link>
        <Link to="/" className="bottom-nav__item">
          <MoreIcon /><span>MORE</span>
        </Link>
      </nav>
    </div>
  );
}

function SunIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>; }
function MoonIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>; }
function PlayIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8V4z"/></svg>; }
function StopIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="1"/></svg>; }
function HomeIcon()  { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>; }
function BookIcon()  { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>; }
function TrendIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 17l6-6 4 4 8-9"/></svg>; }
function MoreIcon()  { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6h16M4 12h16M4 18h16"/></svg>; }