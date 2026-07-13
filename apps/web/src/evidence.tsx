import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { StableId } from "@chushou/schema";
import { evidenceMaterials, statusLabels } from "./data";

type EvidenceRequest = { title: string; assertionIds: StableId[] };
type EvidenceContextValue = { openEvidence: (request: EvidenceRequest) => void };

const EvidenceContext = createContext<EvidenceContextValue | null>(null);

export function useEvidence(): EvidenceContextValue {
  const value = useContext(EvidenceContext);
  if (value === null) throw new Error("useEvidence must be used inside EvidenceProvider");
  return value;
}

export function EvidenceProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<EvidenceRequest | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const materials = useMemo(
    () => (request === null ? [] : evidenceMaterials(request.assertionIds)),
    [request],
  );
  const openEvidence = (next: EvidenceRequest) => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    setRequest(next);
  };
  const closeEvidence = () => setRequest(null);

  useEffect(() => {
    if (request === null) return;
    const handleKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setRequest(null);
    };
    window.addEventListener("keydown", handleKey);
    requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", handleKey);
      requestAnimationFrame(() => returnFocusRef.current?.focus());
    };
  }, [request]);

  const trapFocus = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return;
    const focusable = [
      ...event.currentTarget.querySelectorAll<HTMLElement>("a[href], button"),
    ].filter((element) => !element.hasAttribute("disabled") && element.tabIndex >= 0);
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
  };

  return (
    <EvidenceContext.Provider value={{ openEvidence }}>
      {children}
      {request !== null ? (
        <div className="drawer-layer" role="presentation" onMouseDown={closeEvidence}>
          <aside
            className="evidence-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="evidence-title"
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={trapFocus}
          >
            <div className="drawer-header">
              <div>
                <p className="eyebrow">证据链</p>
                <h2 id="evidence-title">{request.title}</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={closeEvidence}
                aria-label="关闭证据侧栏"
                ref={closeButtonRef}
              >
                ×
              </button>
            </div>
            {materials.length === 0 ? (
              <div className="empty-state">
                <strong>尚无可发布引文</strong>
                <p>此条信息不会被标为已核验；请从数据页查看研究缺口。</p>
              </div>
            ) : (
              <div className="evidence-list">
                {materials.map((material) => (
                  <article className="evidence-card" key={material.link.id}>
                    <div className="evidence-meta">
                      <span>
                        {statusLabels[material.assertion.editorialStatus] ??
                          material.assertion.editorialStatus}
                      </span>
                      <span>
                        置信度{" "}
                        {statusLabels[material.assertion.confidence] ??
                          material.assertion.confidence}
                      </span>
                      <span>
                        {material.link.directness === "direct" ? "直接证据" : "间接／推导证据"}
                      </span>
                    </div>
                    <p className="claim-text">
                      {typeof material.assertion.objectLiteral === "object"
                        ? JSON.stringify(material.assertion.objectLiteral)
                        : String(material.assertion.objectLiteral)}
                    </p>
                    <blockquote>{material.passage.originalText}</blockquote>
                    <p className="citation-line">
                      {material.source.shortTitle} · {material.locator.label}
                    </p>
                    <p className="small-note">{material.link.note}</p>
                    <a
                      className="text-link"
                      href={material.locator.stableUrl ?? material.edition.stableUrl ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      打开数字版本 ↗
                    </a>
                  </article>
                ))}
              </div>
            )}
          </aside>
        </div>
      ) : null}
    </EvidenceContext.Provider>
  );
}

export function EvidenceButton({
  assertionIds,
  label = "查看证据",
  title,
}: {
  assertionIds: StableId[];
  label?: string;
  title: string;
}) {
  const { openEvidence } = useEvidence();
  return (
    <button
      className="evidence-button"
      type="button"
      onClick={() => openEvidence({ title, assertionIds })}
    >
      <span aria-hidden="true">◎</span> {label}
    </button>
  );
}
