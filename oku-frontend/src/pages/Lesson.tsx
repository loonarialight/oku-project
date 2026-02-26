import { useState, useEffect, useContext } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ts/ThemeContext";
import { useUser } from "../context/useUser";
import api from "../services/api";
import "../styles/theme.css";
import "./lesson.css";

interface TopicMeta  { id: number; title: string; }
interface Lesson     { id: number; title: string; order_index: number; }
interface LessonDetail { id: number; title: string; content: string; }

export default function Lesson() {
  const { id }           = useParams<{ id: string }>();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { stats }        = useUser();
  const navigate         = useNavigate();

  const [meta, setMeta]               = useState<TopicMeta | null>(null);
  const [lessons, setLessons]         = useState<Lesson[]>([]);
  const [activeId, setActiveId]       = useState<number | null>(null);
  const [activeDetail, setActiveDetail] = useState<LessonDetail | null>(null);
  const [readSet, setReadSet]         = useState<Set<number>>(new Set());
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.allSettled([
      api.get<TopicMeta>(`/learn/topic/${id}`),
      api.get<Lesson[]>(`/learn/topic/${id}/lessons`),
    ]).then(([metaRes, lessonsRes]) => {
      if (metaRes.status === "fulfilled")    setMeta(metaRes.value.data);
      if (lessonsRes.status === "fulfilled") setLessons(lessonsRes.value.data);
      else setError("Не удалось загрузить уроки");
      setLoading(false);
    }).catch(() => { setError("Ошибка сервера"); setLoading(false); });
  }, [id]);

  async function toggleLesson(lessonId: number) {
    if (activeId === lessonId) {
      setActiveId(null);
      setActiveDetail(null);
      return;
    }
    setActiveId(lessonId);
    setDetailLoading(true);
    try {
      const res = await api.get<LessonDetail>(`/lesson/${lessonId}`);
      setActiveDetail(res.data);
      setReadSet((prev) => new Set(prev).add(lessonId));
    } catch {
      setActiveDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  const readCount   = readSet.size;
  const totalCount  = lessons.length;
  const progressPct = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0;
  const allRead     = totalCount > 0 && readCount >= totalCount;

  return (
    <div className="page-shell">

      {/* ── Header ── */}
      <header className="page-header">
        <div className="page-header__left">
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Назад">
            <BackIcon />
          </button>
          <img
            src={theme === "dark" ? "/white_logo.png" : "/dark_logo.png"}
            alt="OKU"
            className="page-header__logo-img"
          />
          {meta && (
            <span className="page-header__sub">
              {meta.title.length > 26 ? meta.title.slice(0, 26) + "…" : meta.title}
            </span>
          )}
        </div>
        <div className="page-header__right">
          <span className="lesson-xp-badge">+50 XP</span>
          {totalCount > 0 && (
            <span className="lesson-tasks-count">{readCount}/{totalCount} задач</span>
          )}
          <button className="theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      {/* ── Progress bar ── */}
      {totalCount > 0 && (
        <div className="lesson-top-progress">
          <div
            className="lesson-top-progress__fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      <main className="lesson-main fade-up">
        {loading ? (
          <div className="lesson-loader"><span className="ring ring--md" /></div>
        ) : error ? (
          <div className="error-banner">{error}</div>
        ) : (
          <>
            {/* ── Hero ── */}
            <div className="lesson-hero">
              <h1 className="lesson-hero__title">{meta?.title}</h1>
              {totalCount > 0 && (
                <div className="lesson-hero__progress">
                  <div className="lesson-hero__progress-bar">
                    <div
                      className="lesson-hero__progress-fill"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="lesson-hero__progress-label">
                    {readCount}/{totalCount} уроков прочитано
                  </span>
                </div>
              )}
              <div className="lesson-hero__divider" />
            </div>

            {/* ── Theory ── */}
            <section className="lesson-section">
              <p className="lesson-section__label">ТЕОРИЯ</p>

              {totalCount === 0 ? (
                <p className="lesson-empty">Уроки ещё не добавлены</p>
              ) : (
                <div className="lesson-list">
                  {lessons.map((l, i) => {
                    const isOpen = activeId === l.id;
                    const isRead = readSet.has(l.id);
                    return (
                      <div
                        key={l.id}
                        className={`lesson-item${isRead ? " lesson-item--read" : ""}`}
                      >
                        <button
                          className={`lesson-item__btn${isOpen ? " lesson-item__btn--open" : ""}`}
                          onClick={() => toggleLesson(l.id)}
                        >
                          <div className="lesson-item__left">
                            <span className="lesson-item__num">
                              {isRead ? "✓" : i + 1}
                            </span>
                            <span className="lesson-item__title">{l.title}</span>
                          </div>
                          <ChevronIcon open={isOpen} />
                        </button>

                        {isOpen && (
                          <div className="lesson-item__body">
                            {detailLoading ? (
                              <div className="lesson-item__loading">
                                <span className="ring ring--sm" />
                              </div>
                            ) : activeDetail ? (
                              <>
                                <div
                                  className="lesson-item__content"
                                  dangerouslySetInnerHTML={{ __html: activeDetail.content }}
                                />
                                <div className="lesson-item__actions">
                                  <Link
                                    to={`/lesson/${l.id}`}
                                    className="lesson-item__link"
                                  >
                                    Открыть полностью →
                                  </Link>
                                </div>
                              </>
                            ) : (
                              <p className="lesson-empty">Содержимое недоступно</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── Practice ── */}
            <div className="lesson-practice">
              <button
                className={`lesson-practice__btn${allRead ? " lesson-practice__btn--ready" : ""}`}
                onClick={() => navigate(`/learn/topic/${id}/practice`)}
              >
                <PlayIcon />
                <span>НАЧАТЬ ПРАКТИКУ</span>
              </button>
              <p className="lesson-practice__hint">
                {allRead
                  ? "Все уроки прочитаны — вперёд!"
                  : `Прочитай уроки и получи +50 XP`}
              </p>
            </div>
          </>
        )}
      </main>

      <nav className="bottom-nav">
        <Link to="/" className="bottom-nav__item"><HomeIcon /><span>HOME</span></Link>
        <div className="bottom-nav__item bottom-nav__item--active"><BookIcon /><span>LEARN</span></div>
        <Link to="/analytics" className="bottom-nav__item"><TrendIcon /><span>ANALYTICS</span></Link>
        <Link to="/" className="bottom-nav__item"><MoreIcon /><span>MORE</span></Link>
      </nav>
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" style={{
        transform: open ? "rotate(180deg)" : "none",
        transition: "transform 0.2s ease",
        flexShrink: 0,
      }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function BackIcon()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>; }
function PlayIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8V4z"/></svg>; }
function SunIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>; }
function MoonIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>; }
function HomeIcon()  { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>; }
function BookIcon()  { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>; }
function TrendIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 17l6-6 4 4 8-9"/></svg>; }
function MoreIcon()  { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6h16M4 12h16M4 18h16"/></svg>; }