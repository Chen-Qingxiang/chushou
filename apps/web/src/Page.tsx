import { useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

export function CopyLinkButton() {
  const location = useLocation();
  const locationKey = `${location.pathname}${location.search}${location.hash}`;
  const currentUrl = window.location.href;
  const [feedback, setFeedback] = useState<{
    locationKey: string;
    status: "copied" | "failed";
  } | null>(null);
  const status = feedback?.locationKey === locationKey ? feedback.status : "idle";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setFeedback({ locationKey, status: "copied" });
    } catch {
      setFeedback({ locationKey, status: "failed" });
    }
  };
  return (
    <button className="button secondary-button copy-link-button" type="button" onClick={copy}>
      {status === "copied"
        ? "已复制当前深链接"
        : status === "failed"
          ? "复制失败，请复制地址栏"
          : "复制当前深链接"}
    </button>
  );
}

export function PageHeader({
  eyebrow,
  title,
  intro,
  actions,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-intro">{intro}</p>
      </div>
      <div className="page-actions">
        {actions}
        <CopyLinkButton />
      </div>
    </header>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const label: Record<string, string> = {
    reviewed: "已复核",
    verified: "已核验",
    provisional: "暂定",
    incomplete: "未完整",
    disputed: "有争议",
  };
  return <span className={`status-badge status-${status}`}>{label[status] ?? status}</span>;
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}
