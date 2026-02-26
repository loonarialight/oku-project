import { useState, useEffect, useContext } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/ts/AuthContext";
import { ThemeContext } from "../context/ts/ThemeContext";
import api from "../services/api";
import "../styles/theme.css";
import "./topic-list.css";

interface Topic {
  id: number;
  title: string;
  order_index: number;
  completed: boolean;
  completed_at: string | null;
  lessons_count: number;
  status: "completed" | "open" | "locked";
  status_label: string;
  is_locked: boolean;
  reward_xp: number;
  icon: string;
  hint: string | null;
}

interface ProfileStats {
  xp: number;
  level: number;
}

function xpForLevel(level: number): number {
  return level * level * 100;
}

export default function Topics() {
  const { grade, subject } = useParams<{ grade: string; subject: string }>();
  const { logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const [topics, setTopics]   = useState<Topic[]>([]);
  const [stats, setStats]     = useState<ProfileStats>({ xp: 0, level: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!grade || !subject) return;

    Promise.allSettled([
      api.get<Topic[]>(`/learn/${grade}/${encodeURIComponent(subject)}`),
      api.get<ProfileStats>("/profile/stats"),
    ]).then(([topicsRes, statsRes]) => {
      if (topicsRes.status === "fulfilled") {
        setTopics(topicsRes.value.data);
      } else {
        const status = (topicsRes.reason as { response?: { status?: number } })
          ?.response?.status;
        if (status === 401) { logout(); navigate("/login", { replace: true }); return; }
        setError("Не удалось загрузить темы");
      }
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
      setLoading(false);
    }).catch(() => {
      setError("Ошибка сервера");
      setLoading(false);
    });
  }, [grade, subject, logout, navigate]);

  const completedCount = topics.filter((t) => t.status === "completed").length;
  const progressPct    = topics.length > 0
    ? Math.round((completedCount / topics.length) * 100)
    : 0;
  const xpPct = Math.min((stats.xp / xpForLevel(stats.level)) * 100, 100);

  return (
    <div className="page-shell">

      <header className="page-header">
        <div className="page-header__left">
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Назад">
            <BackIcon />
          </button>
          <div className="tl-header-icon"><SubjectIcon /></div>
          <span className="page-header__title">{subject?.toUpperCase()}</span>
        </div>
        <div className="page-header__right tl-lvl-compact">
          <span className="tl-lvl-badge">LVL {stats.level}</span>
          <div className="tl-xp-bar">
            <div className="tl-xp-bar__fill" style={{ width: `${xpPct}%` }} />
          </div>
          <span className="tl-xp-label">{stats.xp} XP</span>
          <button className="theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      <div className="tl-meta-bar">
        <div className="tl-breadcrumb">
          <span className="tl-breadcrumb__grade">{grade} КЛАСС</span>
          <span className="tl-breadcrumb__sep">·</span>
          <span className="tl-breadcrumb__subject">{subject}</span>
        </div>
        <div className="tl-overall">
          <div className="tl-overall__bar">
            <div className="tl-overall__fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="tl-overall__label">
            {completedCount}/{topics.length} тем
          </span>
        </div>
      </div>

      <main className="tl-main fade-up">
        {loading && (
          <div className="tl-loader"><span className="ring ring--md" /></div>
        )}

        {!loading && error && (
          <div className="error-banner">{error}</div>
        )}

        {!loading && !error && topics.length === 0 && (
          <div className="tl-empty">
            <span className="tl-empty__icon">📭</span>
            <p className="tl-empty__text">Темы не найдены</p>
            <p className="tl-empty__sub">Убедитесь, что темы добавлены в базу данных</p>
          </div>
        )}

        {!loading && !error && topics.length > 0 && (
          <div className="tl-list">
            {topics.map((topic) => (
              <Link
                key={topic.id}
                to={`/learn/topic/${topic.id}`}
                className={[
                  "topic-card",
                  topic.status === "completed" ? "topic-card--completed" : "",
                  topic.is_locked             ? "topic-card--locked"    : "",
                ].filter(Boolean).join(" ")}
                onClick={(e) => topic.is_locked && e.preventDefault()}
                aria-disabled={topic.is_locked}
              >
                <div className="topic-card__header">
                  <span className="topic-card__icon">{topic.icon}</span>
                  <div className="topic-card__meta">
                    <span className="topic-card__status">{topic.status_label}</span>
                    <span className="topic-card__xp">+{topic.reward_xp} XP</span>
                  </div>
                </div>

                <p className="topic-card__title">{topic.title}</p>

                {topic.hint && (
                  <p className="topic-card__hint">{topic.hint}</p>
                )}

                <div className="topic-card__footer">
                  <div className="topic-card__prog">
                    <div className="pbar pbar--sm">
                      <div
                        className={[
                          "pbar__fill",
                          "pbar__fill--anim",
                          topic.status === "completed"
                            ? "pbar__fill--green"
                            : "pbar__fill--xp",
                        ].join(" ")}
                        style={{ width: topic.status === "completed" ? "100%" : "0%" }}
                      />
                    </div>
                  </div>
                  <span className="topic-card__tasks">
                    {topic.lessons_count > 0
                      ? `${topic.lessons_count} уроков`
                      : "нет уроков"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        <Link to="/" className="bottom-nav__item">
          <HomeIcon /><span>HOME</span>
        </Link>
        <div className="bottom-nav__item bottom-nav__item--active">
          <BookIcon /><span>LEARN</span>
        </div>
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

function BackIcon()    { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>; }
function SubjectIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>; }
function SunIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>; }
function MoonIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>; }
function HomeIcon()    { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>; }
function BookIcon()    { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>; }
function TrendIcon()   { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 17l6-6 4 4 8-9"/></svg>; }
function MoreIcon()    { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6h16M4 12h16M4 18h16"/></svg>; }