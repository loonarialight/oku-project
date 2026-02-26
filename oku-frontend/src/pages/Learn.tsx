import { useState, useContext, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ts/ThemeContext";
import { useUser } from "../context/useUser";
import LevelBadge from "../components/LevelBadge";
import api from "../services/api";
import "../styles/theme.css";
import "./learn.css";

interface Grade   { id: number; number: number; }
interface Subject { id: number; name: string; }

export default function Learn() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { stats, fetchStats }  = useUser();
  const navigate               = useNavigate();
  const logoSrc = theme === "dark" ? "/white_logo.png" : "/dark_logo.png";

  const [grades,        setGrades]        = useState<Grade[]>([]);
  const [subjects,      setSubjects]      = useState<Subject[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [gradesLoading,   setGradesLoading]   = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [error, setError] = useState("");

  /* ── Load grades on mount ── */
  useEffect(() => {
    void fetchStats();
    api.get<Grade[]>("/grades")
      .then((res) => setGrades(res.data))
      .catch(() => setError("Не удалось загрузить классы"))
      .finally(() => setGradesLoading(false));
  }, [fetchStats]);

  /* ── Load subjects when grade selected ── */
  const handleGradeSelect = useCallback((gradeNumber: number) => {
    setSelectedGrade(gradeNumber);
    setSubjects([]);
    setSubjectsLoading(true);
    setError("");

    api.get<Subject[]>(`/subjects/${gradeNumber}`)
      .then((res) => setSubjects(res.data))
      .catch(() => setError("Не удалось загрузить предметы"))
      .finally(() => setSubjectsLoading(false));
  }, []);

  /* ── Navigate ── */
  const handleSubjectSelect = (subjectName: string) => {
    if (!selectedGrade) return;
    navigate(`/learn/${selectedGrade}/${encodeURIComponent(subjectName)}`);
  };

  return (
    <div className="page-shell">

      {/* ── Header ── */}
      <header className="page-header">
        <div className="page-header__left">
          <Link to="/" className="page-header__back"><BackIcon /></Link>
          <img src={logoSrc} alt="OKU" className="page-header__logo-img" />
          <span className="page-header__title">ОБУЧЕНИЕ</span>
        </div>
        <div className="page-header__right">
          {stats && (
            <div className="page-header__lvl">
              <LevelBadge
                level={stats.level}
                xp={stats.xp}
                xpForCurrentLevel={stats.xpForCurrentLevel}
                xpToNextLevel={stats.xpToNextLevel}
                compact
              />
            </div>
          )}
          <button className="theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      <main className="learn-main fade-up">

        {error && <div className="error-banner">{error}</div>}

        {/* ── Step 1: grades ── */}
        <section className="learn-section">
          <p className="learn-section__label">ВЫБЕРИ КЛАСС</p>

          {gradesLoading ? (
            <div className="learn-loader"><span className="ring ring--md" /></div>
          ) : grades.length === 0 ? (
            <p className="learn-empty">Классы не найдены</p>
          ) : (
            <div className="learn-grade-grid">
              {grades.map((g) => (
                <button
                  key={g.id}
                  className={`learn-grade-btn${selectedGrade === g.number ? " learn-grade-btn--active" : ""}`}
                  onClick={() => handleGradeSelect(g.number)}
                >
                  <span className="learn-grade-btn__num">{g.number}</span>
                  <span className="learn-grade-btn__label">{g.number} КЛАСС</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── Step 2: subjects (shown after grade selected) ── */}
        {selectedGrade !== null && (
          <section className="learn-section fade-up">
            <p className="learn-section__label">ВЫБЕРИ ПРЕДМЕТ</p>

            {subjectsLoading ? (
              <div className="learn-loader"><span className="ring ring--md" /></div>
            ) : subjects.length === 0 ? (
              <p className="learn-empty">Предметы для этого класса пока не добавлены</p>
            ) : (
              <div className="learn-subject-grid">
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    className="learn-subject-btn"
                    onClick={() => handleSubjectSelect(s.name)}
                  >
                    <span className="learn-subject-btn__label">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* ── Bottom nav ── */}
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

/* ── Icons ── */
function BackIcon()  { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>; }
function SunIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>; }
function MoonIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>; }
function HomeIcon()  { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>; }
function BookIcon()  { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>; }
function TrendIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 17l6-6 4 4 8-9"/></svg>; }
function MoreIcon()  { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6h16M4 12h16M4 18h16"/></svg>; }