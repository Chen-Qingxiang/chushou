import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  actionLabels,
  appointmentPlace,
  dateLabel,
  preferredName,
  site,
  trackLabels,
} from "../data";
import { EvidenceButton } from "../evidence";
import { PageHeader, StatusBadge } from "../Page";

const serviceLabels: Record<string, string> = {
  attested: "史料明载已到／在事",
  inferred: "据上下文推定",
  not_assumed: "明确未赴任",
  declined: "辞免",
  unknown: "任事状态未知",
};

function simulatorUrl(mode: "replay" | "compose", personSlug?: string, step?: number) {
  const params = new URLSearchParams({ mode });
  if (personSlug !== undefined) params.set("person", personSlug);
  if (step !== undefined) params.set("step", String(step));
  return `/simulator?${params.toString()}`;
}

function PathReplay({ params }: { params: URLSearchParams }) {
  const navigate = useNavigate();
  const sequenceRef = useRef<HTMLDivElement>(null);
  const people = site.people.filter((person) =>
    site.appointments.some((appointment) => appointment.personId === person.id),
  );
  const requestedPerson = people.find((person) => person.slug === params.get("person"));
  const person = requestedPerson ?? people.find((item) => item.slug === "su-shi") ?? people[0];
  const appointments = site.appointments
    .filter((appointment) => appointment.personId === person?.id)
    .toSorted((left, right) => left.sequence - right.sequence);
  const requestedStep = Number.parseInt(params.get("step") ?? "0", 10);
  const step =
    Number.isFinite(requestedStep) && requestedStep >= 0 && requestedStep < appointments.length
      ? requestedStep
      : 0;
  const appointment = appointments[step];
  const next = appointments[step + 1];
  useEffect(() => {
    const container = sequenceRef.current;
    const active = container?.children.item(step) as HTMLElement | null;
    if (container === null || active === null) return;
    container.scrollLeft = active.offsetLeft - (container.clientWidth - active.clientWidth) / 2;
  }, [person?.slug, step]);
  if (person === undefined || appointment === undefined) return null;
  const services = appointment.serviceEpisodes;
  const politicalComponents = appointment.components.filter((component) =>
    component.semanticTracks.includes("political_status"),
  );
  const unresolved = appointment.components.filter(
    (component) => component.resolutionStatus !== "resolved",
  );
  const tracks = [
    ...new Set(appointment.components.flatMap((component) => component.semanticTracks)),
  ];
  return (
    <div className="path-lab">
      <section className="path-controls">
        <div>
          <p className="eyebrow">EVIDENCE REPLAY</p>
          <h2>沿已发布记录前进，不把先后顺序写成因果。</h2>
          <p>
            每一步都是数据库中的真实任命切片；“下一步”只表示当前 release
            的序列，不表示人人适用、必然发生或具有已证概率。
          </p>
        </div>
        <label>
          <span>回放人物</span>
          <select
            value={person.slug}
            onChange={(event) =>
              void navigate(simulatorUrl("replay", event.target.value, 0), { replace: true })
            }
          >
            {people.map((item) => {
              const count = site.appointments.filter(
                (appointmentItem) => appointmentItem.personId === item.id,
              ).length;
              return (
                <option value={item.slug} key={item.id}>
                  {preferredName(item)} · {count} 步已发布切片
                </option>
              );
            })}
          </select>
        </label>
      </section>

      <nav className="path-sequence" aria-label={`${preferredName(person)}已发布任命路径`}>
        <header>
          <strong>{preferredName(person)}</strong>
          <span>
            第 {step + 1} / {appointments.length} 步
          </span>
        </header>
        <div ref={sequenceRef}>
          {appointments.map((item, index) => (
            <Link
              to={simulatorUrl("replay", person.slug, index)}
              className={index === step ? "is-active" : undefined}
              aria-current={index === step ? "step" : undefined}
              aria-label={`第${index + 1}步：${item.rawText}`}
              key={item.id}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{dateLabel(item.time)}</strong>
              <small>{item.rawText}</small>
            </Link>
          ))}
        </div>
      </nav>

      <div className="path-stage">
        <article className="path-current">
          <div className="path-current-heading">
            <div>
              <p className="eyebrow">当前证据节点</p>
              <h2>{appointment.rawText}</h2>
              <p>
                {dateLabel(appointment.time)} · {appointmentPlace(appointment)} ·{" "}
                {appointment.actionTypes.map((item) => actionLabels[item] ?? item).join("、")}
              </p>
            </div>
            <StatusBadge status={appointment.editorialStatus} />
          </div>
          <div className="path-track-grid">
            {tracks.map((track) => (
              <div key={track}>
                <span>{trackLabels[track] ?? track}</span>
                <strong>
                  {appointment.components
                    .filter((component) => component.semanticTracks.includes(track))
                    .map((component) => component.sourceSpan.text)
                    .join("、")}
                </strong>
              </div>
            ))}
          </div>
          <EvidenceButton
            assertionIds={[...appointment.assertionIds]}
            title={appointment.rawText}
            label="核对当前节点证据"
          />
        </article>
        <aside className="path-rule-checks">
          <p className="eyebrow">受控规则检查</p>
          <div>
            <span>任事证据</span>
            <strong>
              {services.length === 0
                ? "无 service episode：不得推定到任"
                : [...new Set(services.map((item) => serviceLabels[item.serviceStatus]))].join(
                    "、",
                  )}
            </strong>
          </div>
          <div>
            <span>处分／限制</span>
            <strong>
              {politicalComponents.length === 0
                ? "本条无已解析政治状态成分"
                : politicalComponents.map((item) => item.sourceSpan.text).join("、")}
            </strong>
          </div>
          <div>
            <span>未解析成分</span>
            <strong>
              {unresolved.length === 0
                ? "全部成分已解析"
                : unresolved.map((item) => item.sourceSpan.text).join("、")}
            </strong>
          </div>
          <div>
            <span>时间精度</span>
            <strong>
              {appointment.time.precision} · {appointment.time.qualification}
            </strong>
          </div>
        </aside>
      </div>

      <section className="observed-transition">
        <div>
          <p className="eyebrow">OBSERVED NEXT</p>
          {next === undefined ? (
            <>
              <h2>当前人物切片到此为止。</h2>
              <p>这不是生涯终点，只是本 release 没有下一条通过门禁的记录。</p>
            </>
          ) : (
            <>
              <h2>{next.rawText}</h2>
              <p>
                当前只确认发布顺序为“{appointment.rawText}”之后出现“{next.rawText}
                ”；不据此自动生成升迁、贬谪或概率规则。
              </p>
            </>
          )}
        </div>
        {next === undefined ? (
          <Link className="button secondary-button" to={simulatorUrl("replay", person.slug, 0)}>
            回到第一步
          </Link>
        ) : (
          <Link
            className="button primary-button"
            to={simulatorUrl("replay", person.slug, step + 1)}
          >
            前进到下一条已发布记录
          </Link>
        )}
      </section>

      <section className="locked-paths">
        <div>
          <p className="eyebrow">LOCKED UNTIL EVIDENCED</p>
          <h2>这些通用路径与情境尚未开放选择。</h2>
          <p>
            当前事实集不足以建立适用于多人的转移规则和概率。按钮保持锁定，直到规则、适用期、反例与证据都进入
            schema。
          </p>
        </div>
        <ul>
          <li>进士入仕 → 试官／县尉／知县 → 通判／知州</li>
          <li>转运系统与提点刑狱等地方监察路径</li>
          <li>磨勘、荐举、丁忧、回避与台谏弹劾</li>
          <li>政局更替、贬谪与量移的概率性情境</li>
        </ul>
      </section>
    </div>
  );
}

function CompositionSandbox() {
  const [period, setPeriod] = useState(site.periodLenses[2]?.id ?? "all");
  const options = site.titleUsageVersions.filter(
    (usage) => period === "all" || usage.periodLensIds.includes(period as never),
  );
  const firstFor = (track: string) =>
    options.find((usage) => usage.semanticTracks.includes(track as never))?.id ?? "none";
  const [rank, setRank] = useState(firstFor("identity_rank"));
  const [honor, setHonor] = useState(firstFor("honor_expertise"));
  const [duty, setDuty] = useState(firstFor("actual_duty"));
  const chosen = [rank, honor, duty]
    .filter((id) => id !== "none")
    .map((id) => site.titleUsageVersions.find((usage) => usage.id === id))
    .filter((usage): usage is (typeof site.titleUsageVersions)[number] => usage !== undefined);
  const selectFor = (track: string, value: string, setter: (value: string) => void) => (
    <select value={value} onChange={(event) => setter(event.target.value)}>
      <option value="none">不选择</option>
      {options
        .filter((usage) => usage.semanticTracks.includes(track as never))
        .map((usage) => (
          <option value={usage.id} key={usage.id}>
            {usage.label}
          </option>
        ))}
    </select>
  );
  return (
    <div className="simulator-grid">
      <section className="simulator-controls">
        <label>
          <span>时期镜头</span>
          <select value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="all">不限定</option>
            {site.periodLenses.map((item) => (
              <option value={item.id} key={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>身份与官阶</span>
          {selectFor("identity_rank", rank, setRank)}
        </label>
        <label>
          <span>荣衔与专长</span>
          {selectFor("honor_expertise", honor, setHonor)}
        </label>
        <label>
          <span>实际职务</span>
          {selectFor("actual_duty", duty, setDuty)}
        </label>
        <p className="small-note">
          切换时期后若旧选项不再有效，结果会明确提示版本冲突，不自动替换。
        </p>
      </section>
      <section className="simulator-output">
        <p className="eyebrow">官衔构造实验</p>
        <h2>
          {chosen
            .map((usage) => site.titleConcepts.find((title) => title.id === usage.titleConceptId))
            .map(preferredName)
            .join("、") || "请选择至少一个成分"}
        </h2>
        {chosen.map((usage) => (
          <article key={usage.id}>
            <span>
              {usage.semanticTracks.map((track) => trackLabels[track] ?? track).join(" · ")}
            </span>
            <strong>{usage.label}</strong>
            <p>{usage.plainExplanation.text}</p>
          </article>
        ))}
        {[rank, honor, duty].some(
          (id) => id !== "none" && !options.some((usage) => usage.id === id),
        ) ? (
          <aside className="unknown-box">
            <strong>时期冲突</strong>
            <p>至少一个选择不属于当前时期镜头，请重新选择。</p>
          </aside>
        ) : null}
        <p className="decoder-warning">这是一项教学组合，不对应真实任命。</p>
      </section>
    </div>
  );
}

export function SimulatorPage() {
  const [params] = useSearchParams();
  const mode = params.get("mode") === "compose" ? "compose" : "replay";
  const defaultPerson = site.people.find((person) => person.slug === "su-shi")?.slug;
  return (
    <div className="page-container">
      <PageHeader
        eyebrow="任官路径实验室 · CONTROLLED LEARNING"
        title="能回放史实，也必须知道何时不能模拟。"
        intro="路径回放只使用当前 release 的真实任命与任事证据；官衔构造只检查时期和语义轨道。两者都不制造固定晋升树或伪概率。"
      />
      <nav className="simulator-modes" aria-label="实验模式">
        <Link
          to={simulatorUrl("replay", defaultPerson, 0)}
          className={mode === "replay" ? "is-active" : undefined}
          aria-current={mode === "replay" ? "page" : undefined}
        >
          证据路径回放
        </Link>
        <Link
          to={simulatorUrl("compose")}
          className={mode === "compose" ? "is-active" : undefined}
          aria-current={mode === "compose" ? "page" : undefined}
        >
          官衔构造实验
        </Link>
      </nav>
      {mode === "replay" ? <PathReplay params={params} /> : <CompositionSandbox />}
    </div>
  );
}
