import { Link } from "react-router-dom";
import { EvidenceButton } from "../evidence";
import { site, sourcePath, trackLabels } from "../data";
import { StatusBadge } from "../Page";

const questions = [
  {
    n: "01",
    title: "这个官名在当时是什么？",
    text: "同名随时期变化；先选版本，再解释性质。",
    to: "/titles",
  },
  {
    n: "02",
    title: "它属于身份，还是实际工作？",
    text: "把官阶、资望、职务、地点和政治状态分轨阅读。",
    to: "/decoder",
  },
  {
    n: "03",
    title: "任命了，是否真的到任？",
    text: "授命动作和实际任事是两类记录；“未至”不能生成任职。",
    to: "/people/su-shi/career",
  },
  {
    n: "04",
    title: "这项判断能追到哪一段原文？",
    text: "每条已复核结论都可打开引文、定位与置信度。",
    to: "/sources",
  },
] as const;

export function HomePage() {
  const example =
    site.appointments.find((item) => item.id === "chs:appointment:su-shi-hangzhou-second") ??
    site.appointments[0];
  const exampleComponents = example?.components ?? [];

  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">EVIDENCE-DRIVEN SONG OFFICIAL SYSTEM</p>
          <h1>
            读懂一纸除授，
            <br />
            <em>看见制度怎样落在一个人身上。</em>
          </h1>
          <p className="hero-intro">
            除授不是官名词典，也不把任命误当履职。它把时期版本、身份官阶、荣衔专长、实际职务、地点与政治状态分开建模，再让每项判断回到可核查的史料。
          </p>
          <div className="hero-actions">
            <Link className="button primary-button" to="/decoder">
              解码一条任官原文
            </Link>
            <Link className="button secondary-button" to="/people/su-shi/career">
              进入苏轼官履纵切
            </Link>
          </div>
          <p className="release-note">
            <span /> 当前为研究预览版：种子数据可核查，但覆盖仍在扩充。
          </p>
        </div>
        <aside className="appointment-specimen" aria-label="已核任命拆解示例">
          <div className="specimen-topline">
            <span>已核任命拆解</span>
            <StatusBadge status={example?.editorialStatus ?? "incomplete"} />
          </div>
          <p className="specimen-date">元祐四年 · 苏轼</p>
          <h2>{example?.rawText ?? "拜龙图阁学士、知杭州"}</h2>
          <div className="component-stack">
            {exampleComponents.map((component) => (
              <div
                key={component.id}
                className={`track-card track-${component.semanticTracks[0] ?? "unknown"}`}
              >
                <span>
                  {component.semanticTracks.map((track) => trackLabels[track] ?? track).join(" · ")}
                </span>
                <strong>{component.sourceSpan.text}</strong>
                <small>
                  {component.titleUsageVersionId === null ? "地名成分" : "链接到受控官名版本"}
                </small>
              </div>
            ))}
          </div>
          <p className="plain-summary">
            白话：龙图阁学士说明资望与身份；“知杭州”才指向地方实际工作。任命后另有“既至杭”的到任证据。
          </p>
          {example === undefined ? null : (
            <EvidenceButton assertionIds={[...example.assertionIds]} title={example.rawText} />
          )}
        </aside>
      </section>

      <section className="coverage-strip" aria-label="当前数据覆盖">
        <div>
          <strong>{site.counts.reviewedTitleUsages}</strong>
          <span>条已复核官名版本</span>
          <small>目标首批 50</small>
        </div>
        <div>
          <strong>{site.counts.appointments}</strong>
          <span>条苏轼任命动作</span>
          <small>《宋史》卷338 初步覆盖</small>
        </div>
        <div>
          <strong>{site.counts.assertions}</strong>
          <span>条结构化主张</span>
          <small>{site.counts.evidenceLinks} 条证据关联</small>
        </div>
        <div>
          <strong>{site.counts.sources}</strong>
          <span>种来源</span>
          <small>原典与现代研究</small>
        </div>
      </section>

      <section className="home-section question-section">
        <header className="section-heading">
          <p className="eyebrow">从问题进入制度</p>
          <h2>这里优先回答四个容易读错的问题</h2>
        </header>
        <div className="question-grid">
          {questions.map((question) => (
            <Link to={question.to} className="question-card" key={question.n}>
              <span>{question.n}</span>
              <h3>{question.title}</h3>
              <p>{question.text}</p>
              <b aria-hidden="true">→</b>
            </Link>
          ))}
        </div>
      </section>

      <section className="principle-panel">
        <div>
          <p className="eyebrow">三条语义轨道</p>
          <h2>官衔不是一根“高低”刻度。</h2>
        </div>
        <div className="principle-tracks">
          <article>
            <span className="track-symbol rank-symbol">阶</span>
            <div>
              <strong>身份与官阶</strong>
              <p>禄秩、资序、服色等身份层；不自动等同于日常工作。</p>
            </div>
          </article>
          <article>
            <span className="track-symbol honor-symbol">望</span>
            <div>
              <strong>荣衔与专长</strong>
              <p>馆阁、文翰与资望层；可能影响政治位置，但要按时期解释。</p>
            </div>
          </article>
          <article>
            <span className="track-symbol duty-symbol">事</span>
            <div>
              <strong>实际职务</strong>
              <p>在哪里、做什么、是否真正到任；由服务记录单独证明。</p>
            </div>
          </article>
        </div>
        <Link className="text-link" to="/learn">
          用 15 分钟学习怎么读一条除授 →
        </Link>
      </section>

      <section className="home-section source-preview">
        <header className="section-heading">
          <p className="eyebrow">可追溯，不等于堆脚注</p>
          <h2>先看到结论，需要时一层层展开依据。</h2>
        </header>
        <div className="source-preview-grid">
          {site.sources.map((source) => (
            <Link to={sourcePath(source.id)} className="source-mini-card" key={source.id}>
              <span>{source.sourceType === "modern_article" ? "现代研究" : "史料"}</span>
              <h3>{source.shortTitle}</h3>
              <p>{source.notes}</p>
              <small>
                {source.editions.flatMap((edition) => edition.locators).length} 个已定位条目 ·{" "}
                {source.editorialStatus === "reviewed" ? "已复核" : "整理中"}
              </small>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
