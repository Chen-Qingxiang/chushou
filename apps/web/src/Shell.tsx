import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

const GlobalSearch = lazy(async () => ({
  default: (await import("./SearchDialog")).GlobalSearch,
}));

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
          {__DATASET_VERSION__} · {__RELEASE_STAGE__.replaceAll("_", " ")} · {__CURATED_AT__}
        </p>
      </footer>
      {searchOpen ? (
        <Suspense fallback={null}>
          <GlobalSearch onClose={closeSearch} />
        </Suspense>
      ) : null}
    </div>
  );
}
