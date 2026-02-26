import { Link } from "react-router-dom";
import ProgressBar from "./ProgressBar";
import "./TopicCard.css";

export type TopicStatus = "not_started" | "in_progress" | "completed";

export interface TopicCardProps {
  id: number;
  title: string;
  description?: string;
  status: TopicStatus;
  progress: number;    // 0–100
  tasksTotal: number;
  tasksDone: number;
  xpReward: number;
}

const STATUS_ICON: Record<TopicStatus, string> = {
  not_started: "⭕",
  in_progress:  "🟡",
  completed:    "🟢",
};

const STATUS_LABEL: Record<TopicStatus, string> = {
  not_started: "NOT STARTED",
  in_progress:  "IN PROGRESS",
  completed:    "COMPLETED",
};

export default function TopicCard({
  id, title, description, status, progress, tasksTotal, tasksDone, xpReward,
}: TopicCardProps) {
  return (
    <Link to={`/learn/topic/${id}`} className={`topic-card topic-card--${status}`}>
      <div className="topic-card__header">
        <span className="topic-card__icon">{STATUS_ICON[status]}</span>
        <div className="topic-card__meta">
          <span className="topic-card__status">{STATUS_LABEL[status]}</span>
          <span className="topic-card__xp">+{xpReward} XP</span>
        </div>
      </div>

      <h3 className="topic-card__title">{title}</h3>
      {description && (
        <p className="topic-card__desc">{description}</p>
      )}

      <div className="topic-card__footer">
        <div className="topic-card__prog">
          <ProgressBar
            value={progress}
            height={3}
            color={status === "completed" ? "green" : "default"}
          />
        </div>
        <span className="topic-card__tasks">
          {tasksDone}/{tasksTotal} tasks
        </span>
      </div>
    </Link>
  );
}