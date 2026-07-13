import { searchRecords } from "@chushou/domain";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { recordPath, site } from "./data";

const navItems = [
  ["/", "首页"],
  ["/map", "制度地图"],
  ["/titles", "官名"],
  ["/reforms", "制度沿革"],
  ["/people/su-shi/career", "人物官履"],
  ["/metrics", "量化探索"],
  ["/decoder", "原文解码"],
  ["/sources", "资料"],
] as const;

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

function GlobalSearch({ onClose }: { onClose: (restoreFocus?: boolean) => void }) {
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

export function Shell({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpenPath, setMenuOpenPath] = useState<string | null>(null);
  const location = useLocation();
  const menuOpen = menuOpenPath === location.pathname;
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef(location.pathname);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const openSearch = () => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    setSearchOpen(true);
  };

  const closeSearch = (restoreFocus = true) => {
    setSearchOpen(false);
    if (restoreFocus) requestAnimationFrame(() => returnFocusRef.current?.focus());
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    if (previousPath.current !== location.pathname) mainRef.current?.focus({ preventScroll: true });
    previousPath.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    const handleKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        returnFocusRef.current = document.activeElement as HTMLElement | null;
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setMenuOpenPath(null);
        requestAnimationFrame(() => returnFocusRef.current?.focus());
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="site-frame">
      <header className="site-header">
        <Link className="brand" to="/" aria-label="除授首页">
          <span className="brand-seal">除</span>
          <span>
            <strong>除授</strong>
            <small>CHUSHOU · SONG OFFICIAL SYSTEM</small>
          </span>
        </Link>
        <nav
          className={menuOpen ? "main-nav is-open" : "main-nav"}
          aria-label="主导航"
          id="main-navigation"
        >
          {navItems.map(([path, label]) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) => (isActive ? "is-active" : undefined)}
              onClick={() => setMenuOpenPath(null)}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="header-tools">
          <button
            className="search-trigger"
            type="button"
            onClick={openSearch}
            aria-haspopup="dialog"
            aria-expanded={searchOpen}
            ref={searchTriggerRef}
          >
            <span>搜索</span>
            <kbd>⌘ K</kbd>
          </button>
          <span className="release-chip" title="研究预览版：数据覆盖仍在扩充">
            研究预览
          </span>
          <button
            className="menu-trigger"
            type="button"
            onClick={() => setMenuOpenPath(menuOpen ? null : location.pathname)}
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            aria-label="切换导航"
          >
            {menuOpen ? "×" : "☰"}
          </button>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} ref={mainRef}>
        {children}
      </main>
      <footer className="site-footer">
        <div>
          <Link className="footer-brand" to="/">
            <span>除</span>
            <strong>除授 Chushou</strong>
          </Link>
          <p>从可追溯证据出发，理解宋代官制、任命动作与人物实际任事。</p>
        </div>
        <nav aria-label="页脚导航">
          <Link to="/compare">任命比较</Link>
          <Link to="/learn">学习路径</Link>
          <Link to="/simulator">任命模拟器</Link>
          <Link to="/data">数据与方法</Link>
        </nav>
        <p className="footer-status">
          {site.metadata.datasetVersion} · {site.metadata.releaseStage.replaceAll("_", " ")} ·{" "}
          {site.metadata.curatedAt}
        </p>
      </footer>
      {searchOpen ? <GlobalSearch onClose={closeSearch} /> : null}
    </div>
  );
}
