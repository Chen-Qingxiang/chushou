import { searchRecords } from "@chushou/domain";
import { useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { recordPath, site } from "./data";

const kindLabels: Record<string, string> = {
  title: "官名",
  person: "人物",
  institution: "机构",
  source: "来源",
  place: "地点",
};

function focusableElements(container: HTMLElement): HTMLElement[] {
  return [
    ...container.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea"),
  ].filter((element) => !element.hasAttribute("disabled") && element.tabIndex >= 0);
}

function trapFocus(event: ReactKeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab") return;
  const focusable = focusableElements(event.currentTarget);
  const first = focusable[0];
  const last = focusable.at(-1);
  if (first === undefined || last === undefined) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function GlobalSearch({ onClose }: { onClose: (restoreFocus?: boolean) => void }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const results = useMemo(() => searchRecords(site.searchIndex, query).slice(0, 12), [query]);

  return (
    <div className="search-layer" role="presentation" onMouseDown={() => onClose()}>
      <section
        className="search-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="全站搜索"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={trapFocus}
      >
        <label className="search-command">
          <span aria-hidden="true">⌕</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索官名、人物、机构、地点或来源……"
          />
          <kbd>Esc</kbd>
        </label>
        <div className="search-results">
          {results.map((record) => (
            <button
              type="button"
              key={record.id}
              onClick={() => {
                void navigate(recordPath(record));
                onClose(false);
              }}
            >
              <span className={`kind-dot kind-${record.kind}`} />
              <span>
                <strong>{record.label}</strong>
                <small>{record.aliases.slice(1, 3).join(" · ") || record.id}</small>
              </span>
              <em>{kindLabels[record.kind]}</em>
            </button>
          ))}
          {results.length === 0 ? (
            <p className="no-results">没有匹配项；可尝试简繁体或拼音。</p>
          ) : null}
        </div>
        <footer className="search-help">前缀、包含和轻量模糊匹配 · 点击结果直接跳转</footer>
      </section>
    </div>
  );
}
