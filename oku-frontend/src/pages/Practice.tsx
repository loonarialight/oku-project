import { useState, useEffect, useRef, useContext } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ts/ThemeContext";
import { useUser } from "../context/useUser";
import api from "../services/api";
import "../styles/theme.css";
import "./practice.css";

interface TopicMeta {
  id: number;
  title: string;
}

interface Task {
  id: number;
  question: string;
  type: "text" | "choice";
  options: string[] | null;
  hint: string | null;
  order_index: number;
}

interface SubmitResponse {
  correct: boolean;
  correct_answer: string;
  explanation: string | null;
  xp_earned: number;
  new_level: number | null;
  topic_completed: boolean;
}

type AnswerState = "idle" | "correct" | "wrong";

export default function Practice() {
  const { id }                   = useParams<{ id: string }>();
  const { theme, toggleTheme }   = useContext(ThemeContext);
  const { fetchStats, addXP }    = useUser();
  const navigate                 = useNavigate();
  const inputRef                 = useRef<HTMLInputElement>(null);

  const [meta, setMeta]               = useState<TopicMeta | null>(null);
  const [tasks, setTasks]             = useState<Task[]>([]);
  const [currentIdx, setCurrentIdx]   = useState(0);
  const [answer, setAnswer]           = useState("");
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [feedback, setFeedback]       = useState<SubmitResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [loadError, setLoadError]     = useState("");
  const [xpTotal, setXpTotal]         = useState(0);
  const [done, setDone]               = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [levelUp, setLevelUp]         = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.allSettled([
      api.get<TopicMeta>(`/learn/topic/${id}`),
      api.get<Task[]>(`/learn/topic/${id}/tasks`),
    ]).then(([metaRes, tasksRes]) => {
      if (metaRes.status === "fulfilled")  setMeta(metaRes.value.data);
      if (tasksRes.status === "fulfilled") setTasks(tasksRes.value.data);
      else setLoadError("Не удалось загрузить задания");
      setLoading(false);
    }).catch(() => { setLoadError("Ошибка сервера"); setLoading(false); });
  }, [id]);

  async function handleSubmit() {
    const task = tasks[currentIdx];
    if (!task || !answer.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.post<SubmitResponse>(`/tasks/${task.id}/submit`, {
        answer: answer.trim(),
      });
      const data = res.data;
      setFeedback(data);
      setAnswerState(data.correct ? "correct" : "wrong");
      if (data.correct) {
        setCorrectCount((c) => c + 1);
        setXpTotal((x) => x + data.xp_earned);
        addXP(data.xp_earned);
        if (data.new_level) setLevelUp(data.new_level);
      }
    } catch {
      setAnswerState("wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (currentIdx < tasks.length - 1) {
      setCurrentIdx((i) => i + 1);
      setAnswer("");
      setAnswerState("idle");
      setFeedback(null);
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setDone(true);
      void fetchStats();
    }
  }

  const task        = tasks[currentIdx];
  const progressPct = tasks.length > 0
    ? ((currentIdx + (answerState !== "idle" ? 1 : 0)) / tasks.length) * 100
    : 0;

  return (
    <div className="page-shell">

      {/* Level-up overlay */}
      {levelUp && (
        <div className="lvlup-overlay" onClick={() => setLevelUp(null)}>
          <div className="lvlup-card" onClick={(e) => e.stopPropagation()}>
            <p className="lvlup-card__label">УРОВЕНЬ ПОВЫШЕН</p>
            <p className="lvlup-card__num">{levelUp}</p>
            <p className="lvlup-card__sub">Отличная работа!</p>
            <button className="lvlup-card__btn" onClick={() => setLevelUp(null)}>
              ПРОДОЛЖИТЬ
            </button>
          </div>
        </div>
      )}

      {/* Header */}
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
          {tasks.length > 0 && !done && (
            <span className="practice-counter">{currentIdx + 1}/{tasks.length}</span>
          )}
          <button className="theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      {/* Top progress */}
      <div className="practice-progress-bar">
        <div className="practice-progress-bar__fill" style={{ width: `${progressPct}%` }} />
      </div>

      <main className="practice-main fade-up">
        {loading ? (
          <div className="practice-loader"><span className="ring ring--md" /></div>
        ) : loadError ? (
          <div className="error-banner">{loadError}</div>
        ) : done ? (

          /* ── Done screen ── */
          <div className="practice-done">
            <span className="practice-done__emoji">🎉</span>
            <p className="practice-done__label">ПРАКТИКА ЗАВЕРШЕНА</p>
            <h2 className="practice-done__title">{meta?.title}</h2>
            <div className="practice-done__stats">
              <div className="practice-done__stat">
                <span className="practice-done__stat-val">{correctCount}/{tasks.length}</span>
                <span className="practice-done__stat-label">правильных</span>
              </div>
              <div className="practice-done__stat">
                <span className="practice-done__stat-val">+{xpTotal}</span>
                <span className="practice-done__stat-label">XP получено</span>
              </div>
            </div>
            <div className="practice-done__actions">
              <button
                className="practice-done__btn practice-done__btn--primary"
                onClick={() => navigate(-1)}
              >
                К ТЕОРИИ
              </button>
              <Link to="/learn" className="practice-done__btn practice-done__btn--secondary">
                К ПРЕДМЕТАМ
              </Link>
            </div>
          </div>

        ) : task ? (

          /* ── Active task ── */
          <div className="practice-task">
            <div className={`practice-q${answerState !== "idle" ? ` practice-q--${answerState}` : ""}`}>
              <p className="practice-q__num">ВОПРОС {currentIdx + 1}</p>
              <p className="practice-q__text">{task.question}</p>
              {task.hint && answerState === "idle" && (
                <p className="practice-q__hint">💡 {task.hint}</p>
              )}
            </div>

            {/* Choice */}
            {task.type === "choice" && task.options ? (
              <div className="practice-choices">
                {task.options.map((opt) => {
                  const selected   = answer === opt;
                  const showResult = answerState !== "idle";
                  const isCorrect  = opt === feedback?.correct_answer;
                  return (
                    <button
                      key={opt}
                      className={[
                        "practice-choice",
                        selected ? "practice-choice--selected" : "",
                        showResult && selected && answerState === "correct" ? "practice-choice--correct" : "",
                        showResult && selected && answerState === "wrong"   ? "practice-choice--wrong"   : "",
                        showResult && isCorrect && !selected                ? "practice-choice--correct" : "",
                      ].filter(Boolean).join(" ")}
                      onClick={() => { if (answerState === "idle") setAnswer(opt); }}
                      disabled={answerState !== "idle"}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Text input */
              <div className="practice-input-wrap">
                <input
                  ref={inputRef}
                  className={`practice-input${answerState !== "idle" ? ` practice-input--${answerState}` : ""}`}
                  type="text"
                  placeholder="Введи ответ..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && answerState === "idle") void handleSubmit();
                  }}
                  disabled={answerState !== "idle"}
                  autoFocus
                />
              </div>
            )}

            {/* Feedback */}
            {feedback && answerState !== "idle" && (
              <div className={`practice-feedback practice-feedback--${answerState}`}>
                <span className="practice-feedback__icon">
                  {answerState === "correct" ? "✅" : "❌"}
                </span>
                <div>
                  <p className="practice-feedback__verdict">
                    {answerState === "correct" ? "Правильно!" : "Неверно"}
                  </p>
                  {answerState === "wrong" && feedback.correct_answer && (
                    <p className="practice-feedback__ans">
                      Правильный ответ: <strong>{feedback.correct_answer}</strong>
                    </p>
                  )}
                  {feedback.explanation && (
                    <p className="practice-feedback__exp">{feedback.explanation}</p>
                  )}
                </div>
              </div>
            )}

            {/* Action */}
            <div className="practice-actions">
              {answerState === "idle" ? (
                <button
                  className="practice-btn practice-btn--check"
                  onClick={handleSubmit}
                  disabled={submitting || !answer.trim()}
                >
                  {submitting ? <span className="ring ring--sm" /> : "ПРОВЕРИТЬ"}
                </button>
              ) : (
                <button className="practice-btn practice-btn--next" onClick={handleNext}>
                  {currentIdx < tasks.length - 1 ? "СЛЕДУЮЩИЙ →" : "ЗАВЕРШИТЬ"}
                </button>
              )}
            </div>
          </div>

        ) : (
          <p className="practice-empty">Задания не найдены</p>
        )}
      </main>
    </div>
  );
}

function BackIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>; }
function SunIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>; }
function MoonIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>; }