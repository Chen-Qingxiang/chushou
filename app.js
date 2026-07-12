import { categories, institutions, people, periods, titles } from "./data.js";

const state = {
  view: "overview",
  institutionScope: "central",
  institutionPeriod: "xining-yuanfeng",
  selectedInstitution: null,
  titleSearch: "",
  titleCategory: "all",
  titlePeriod: "all",
  selectedTitle: null,
  selectedPeriod: "xining-yuanfeng",
  selectedPerson: "su-shi",
  selectedAppointment: null,
  careerDimension: "all",
};

const badgeClass = {
  rank: "badge-rank",
  honor: "badge-honor",
  duty: "badge-duty",
  office: "badge-office",
};

const escapeHtml = (value = "") =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function setView(view) {
  state.view = view;
  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    panel.classList.toggle("is-visible", panel.dataset.viewPanel === view);
  });
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
  window.history.replaceState(null, "", `#${view}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function periodOptions(includeAll = false) {
  const all = includeAll ? '<option value="all">全部时期</option>' : "";
  return `${all}${periods
    .map((period) => `<option value="${period.id}">${period.label}（${period.years}）</option>`)
    .join("")}`;
}

function titleBadge(title) {
  return `<span class="badge ${badgeClass[title.badge] || "badge-office"}">${escapeHtml(title.category)}</span>`;
}

function renderOverviewStats() {
  const appointmentCount = people.reduce((sum, person) => sum + person.appointments.length, 0);
  document.querySelector("#title-count").textContent = String(titles.length);
  document.querySelector("#institution-count").textContent = String(institutions.length);
  document.querySelector("#career-count").textContent = String(appointmentCount);
}

function renderInstitutionMap() {
  const map = document.querySelector("#institution-map");
  const nodes = institutions.filter(
    (institution) =>
      institution.scope === state.institutionScope &&
      institution.periods.includes(state.institutionPeriod),
  );

  if (!nodes.length) {
    map.innerHTML = '<div class="empty-state">当前时期暂无这一层级的示例节点。</div>';
    state.selectedInstitution = null;
    renderInstitutionDetail();
    return;
  }

  if (!nodes.some((node) => node.id === state.selectedInstitution)) {
    state.selectedInstitution = nodes[0].id;
  }

  map.innerHTML = nodes
    .map(
      (institution) => `
        <article class="institution-node ${institution.id === state.selectedInstitution ? "is-active" : ""}" data-institution-id="${institution.id}">
          <div class="node-meta">
            <span class="meta-chip">${escapeHtml(institution.type)}</span>
            <span class="meta-chip">${escapeHtml(periods.find((period) => period.id === state.institutionPeriod)?.label || "")}</span>
          </div>
          <h3>${escapeHtml(institution.name)}</h3>
          <p>${escapeHtml(institution.summary)}</p>
        </article>
      `,
    )
    .join("");

  map.querySelectorAll("[data-institution-id]").forEach((node) => {
    node.addEventListener("click", () => {
      state.selectedInstitution = node.dataset.institutionId;
      renderInstitutionMap();
      renderInstitutionDetail();
    });
  });

  renderInstitutionDetail();
}

function renderInstitutionDetail() {
  const detail = document.querySelector("#institution-detail");
  const institution = institutions.find((item) => item.id === state.selectedInstitution);
  if (!institution) {
    detail.innerHTML = '<p class="muted">选择一个制度节点查看详情。</p>';
    return;
  }

  detail.innerHTML = `
    <p class="eyebrow">${escapeHtml(institution.type)}</p>
    <h2>${escapeHtml(institution.name)}</h2>
    <p>${escapeHtml(institution.summary)}</p>
    <h3>主要职能</h3>
    <ul>${institution.functions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    <h3>制度关系</h3>
    <ul>${institution.relations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    <div class="source-note"><strong>使用提醒：</strong>${escapeHtml(institution.caveat)}</div>
  `;
}

function renderTitleList() {
  const list = document.querySelector("#title-list");
  const query = state.titleSearch.trim().toLowerCase();
  const filtered = titles.filter((title) => {
    const matchesSearch =
      !query ||
      [title.name, title.fullName, title.summary, ...title.aliases]
        .join(" ")
        .toLowerCase()
        .includes(query);
    const matchesCategory = state.titleCategory === "all" || title.category === state.titleCategory;
    const matchesPeriod = state.titlePeriod === "all" || title.periods.includes(state.titlePeriod);
    return matchesSearch && matchesCategory && matchesPeriod;
  });

  if (!filtered.length) {
    list.innerHTML = '<div class="empty-state">没有找到匹配的示例官名。</div>';
    state.selectedTitle = null;
    renderTitleDetail();
    return;
  }

  if (!filtered.some((title) => title.id === state.selectedTitle)) {
    state.selectedTitle = filtered[0].id;
  }

  list.innerHTML = filtered
    .map(
      (title) => `
        <article class="title-row ${title.id === state.selectedTitle ? "is-active" : ""}" data-title-id="${title.id}">
          <div class="title-row-header">
            <div>
              <div class="title-meta">
                <span class="meta-chip">${escapeHtml(title.institution)}</span>
                <span class="meta-chip">阅读优先级：${escapeHtml(title.readingPriority)}</span>
              </div>
              <h3>${escapeHtml(title.name)}</h3>
            </div>
            ${titleBadge(title)}
          </div>
          <p>${escapeHtml(title.plain)}</p>
        </article>
      `,
    )
    .join("");

  list.querySelectorAll("[data-title-id]").forEach((row) => {
    row.addEventListener("click", () => {
      state.selectedTitle = row.dataset.titleId;
      renderTitleList();
      renderTitleDetail();
    });
  });

  renderTitleDetail();
}

function renderTitleDetail() {
  const detail = document.querySelector("#title-detail");
  const title = titles.find((item) => item.id === state.selectedTitle);
  if (!title) {
    detail.innerHTML = '<p class="muted">选择一个官名查看详情。</p>';
    return;
  }

  const applicablePeriods = periods.filter((period) => title.periods.includes(period.id));
  detail.innerHTML = `
    <div>${titleBadge(title)}</div>
    <h2>${escapeHtml(title.name)}</h2>
    <p>${escapeHtml(title.summary)}</p>
    <div class="detail-grid">
      <div><span>标准形式</span><strong>${escapeHtml(title.fullName)}</strong></div>
      <div><span>在官衔中的作用</span><strong>${escapeHtml(title.role)}</strong></div>
      <div><span>所属系统</span><strong>${escapeHtml(title.institution)}</strong></div>
      <div><span>阅读优先级</span><strong>${escapeHtml(title.readingPriority)}</strong></div>
    </div>
    <h3>常见关系</h3>
    <ul>${title.relationships.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    <h3>当前适用时期</h3>
    <p>${applicablePeriods.map((period) => `${period.label}（${period.years}）`).join("、")}</p>
    <div class="source-note"><strong>注意：</strong>${escapeHtml(title.caveat)}<br /><strong>待核来源：</strong>${escapeHtml(title.sourceHint)}</div>
  `;
}

function renderChanges() {
  const switcher = document.querySelector("#period-switcher");
  switcher.innerHTML = periods
    .map(
      (period) => `
        <button class="${period.id === state.selectedPeriod ? "is-active" : ""}" data-period-id="${period.id}">
          ${period.label}
        </button>
      `,
    )
    .join("");

  switcher.querySelectorAll("[data-period-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedPeriod = button.dataset.periodId;
      renderChanges();
    });
  });

  const period = periods.find((item) => item.id === state.selectedPeriod);
  document.querySelector("#change-summary").innerHTML = `
    <p class="eyebrow">${escapeHtml(period.years)}</p>
    <h2>${escapeHtml(period.label)}</h2>
    <p>${escapeHtml(period.short)}</p>
    <h3>这一阶段最值得观察</h3>
    <p>${escapeHtml(period.focus)}</p>
  `;

  document.querySelector("#before-after").innerHTML = `
    <h2>解释框架</h2>
    <div class="comparison-grid">
      <article>
        <h3>制度背景</h3>
        <ul>${period.before.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article>
        <h3>阅读时要注意</h3>
        <ul>${period.after.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    </div>
  `;

  document.querySelector("#reform-timeline").innerHTML = periods
    .map(
      (item) => `
        <article class="period-card ${item.id === state.selectedPeriod ? "is-active" : ""}" data-timeline-period="${item.id}">
          <span>${escapeHtml(item.years)}</span>
          <h3>${escapeHtml(item.label)}</h3>
          <p>${escapeHtml(item.short)}</p>
        </article>
      `,
    )
    .join("");

  document.querySelectorAll("[data-timeline-period]").forEach((card) => {
    card.addEventListener("click", () => {
      state.selectedPeriod = card.dataset.timelinePeriod;
      renderChanges();
    });
  });
}

function renderCareer() {
  const person = people.find((item) => item.id === state.selectedPerson);
  const timeline = document.querySelector("#career-timeline");

  if (!person.appointments.some((appointment) => `${person.id}-${appointment.year}` === state.selectedAppointment)) {
    state.selectedAppointment = `${person.id}-${person.appointments[0].year}`;
  }

  timeline.innerHTML = `
    <div class="source-note" style="margin-top:0; margin-bottom:12px; padding:16px; border:1px solid var(--line); border-radius:14px;">
      <strong>${escapeHtml(person.name)} ${escapeHtml(person.birthDeath)}</strong><br />${escapeHtml(person.note)}
    </div>
    ${person.appointments
      .map((appointment) => {
        const key = `${person.id}-${appointment.year}`;
        const summary =
          state.careerDimension === "actual"
            ? appointment.actual
            : state.careerDimension === "rank"
              ? appointment.rank
              : state.careerDimension === "political"
                ? appointment.political
                : appointment.interpretation;
        return `
          <article class="career-item ${key === state.selectedAppointment ? "is-active" : ""}" data-appointment-key="${key}">
            <div class="career-year">${appointment.year}</div>
            <div>
              <div class="career-header">
                <div>
                  <div class="career-meta">
                    <span class="meta-chip">${escapeHtml(appointment.place)}</span>
                    <span class="meta-chip">${escapeHtml(appointment.status)}</span>
                  </div>
                  <h3>${escapeHtml(appointment.title)}</h3>
                </div>
              </div>
              <p>${escapeHtml(summary)}</p>
            </div>
          </article>
        `;
      })
      .join("")}
  `;

  timeline.querySelectorAll("[data-appointment-key]").forEach((item) => {
    item.addEventListener("click", () => {
      state.selectedAppointment = item.dataset.appointmentKey;
      renderCareer();
      renderCareerDetail();
    });
  });

  renderCareerDetail();
}

function renderCareerDetail() {
  const person = people.find((item) => item.id === state.selectedPerson);
  const year = Number(state.selectedAppointment?.split("-").at(-1));
  const appointment = person.appointments.find((item) => item.year === year);
  const detail = document.querySelector("#career-detail");
  if (!appointment) {
    detail.innerHTML = '<p class="muted">选择一个任官节点查看详情。</p>';
    return;
  }

  const linkedTitles = appointment.titleIds
    .map((id) => titles.find((title) => title.id === id))
    .filter(Boolean);

  detail.innerHTML = `
    <p class="eyebrow">${appointment.year} · ${escapeHtml(appointment.status)}</p>
    <h2>${escapeHtml(appointment.title)}</h2>
    <p>${escapeHtml(appointment.interpretation)}</p>
    <div class="detail-grid">
      <div><span>实际职务</span><strong>${escapeHtml(appointment.actual)}</strong></div>
      <div><span>官阶／资序</span><strong>${escapeHtml(appointment.rank)}</strong></div>
      <div><span>地点</span><strong>${escapeHtml(appointment.place)}</strong></div>
      <div><span>政治位置</span><strong>${escapeHtml(appointment.political)}</strong></div>
    </div>
    <h3>可识别官名组件</h3>
    ${
      linkedTitles.length
        ? linkedTitles
            .map(
              (title) => `
                <div class="decoder-result" style="margin-bottom:10px;">
                  ${titleBadge(title)}
                  <h3>${escapeHtml(title.name)}</h3>
                  <p>${escapeHtml(title.plain)}</p>
                </div>
              `,
            )
            .join("")
        : '<p class="muted">尚未录入可关联官名组件。</p>'
    }
    <div class="source-note">此处展示“任命事件”而非人物的永久属性；后续每个节点都应绑定原始史料与校订状态。</div>
  `;
}

function findTitleMatches(text) {
  return titles
    .map((title) => {
      const matchedAlias = title.aliases.find((alias) => text.includes(alias));
      return matchedAlias ? { title, matchedAlias } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.matchedAlias.length - a.matchedAlias.length)
    .filter((match, index, matches) => {
      return !matches.slice(0, index).some((earlier) => earlier.matchedAlias.includes(match.matchedAlias));
    });
}

function decodeText() {
  const input = document.querySelector("#decoder-input").value.trim();
  const output = document.querySelector("#decoder-output");
  if (!input) {
    output.innerHTML = '<p class="muted">请先输入一段官衔或任官原文。</p>';
    return;
  }

  const matches = findTitleMatches(input);
  if (!matches.length) {
    output.innerHTML = `
      <div class="empty-state">
        目前的示例词表还没有识别出官名。<br />这正是后续需要扩充异名表和原文句法规则的地方。
      </div>
    `;
    return;
  }

  const actualDuties = matches.filter(({ title }) =>
    ["地方差遣", "路级差遣", "中央差遣／文翰", "中央职事官", "地方幕职差遣"].includes(title.category),
  );
  const ranks = matches.filter(({ title }) => title.badge === "rank");
  const honors = matches.filter(({ title }) => title.badge === "honor");
  const punishments = matches.filter(({ title }) => title.id === "anzhi");

  let summary = "这串官衔中，";
  if (actualDuties.length) {
    summary += `最可能表示实际工作的部分是“${actualDuties.map(({ title }) => title.name).join("、")}”；`;
  } else {
    summary += "暂未识别出明确的正常实际差遣；";
  }
  if (ranks.length) {
    summary += `“${ranks.map(({ title }) => title.name).join("、")}”主要说明官阶或资序；`;
  }
  if (honors.length) {
    summary += `“${honors.map(({ title }) => title.name).join("、")}”主要体现职名与资望；`;
  }
  if (punishments.length) {
    summary += "其中还包含安置等处分状态，必须优先按贬谪语境理解；";
  }
  summary += "最终判断仍需结合年份、完整除授文本与制度版本。";

  output.innerHTML = `
    <div class="decoder-summary"><strong>白话总结：</strong>${escapeHtml(summary)}</div>
    <div class="decoder-result-list">
      ${matches
        .map(
          ({ title, matchedAlias }) => `
            <article class="decoder-result">
              <div class="title-row-header">
                <div>
                  <div class="title-meta"><span class="meta-chip">识别到：${escapeHtml(matchedAlias)}</span></div>
                  <h3>${escapeHtml(title.name)}</h3>
                </div>
                ${titleBadge(title)}
              </div>
              <p>${escapeHtml(title.plain)}</p>
            </article>
          `,
        )
        .join("")}
    </div>
    <div class="source-note">当前解码器只做关键词匹配，不会自动判断“除、授、迁、改、权、试、守、行、责授、落职”等任命动词和句法关系。</div>
  `;
}

function setupControls() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });
  document.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.jump));
  });

  const institutionPeriod = document.querySelector("#institution-period");
  institutionPeriod.innerHTML = periodOptions();
  institutionPeriod.value = state.institutionPeriod;
  institutionPeriod.addEventListener("change", (event) => {
    state.institutionPeriod = event.target.value;
    renderInstitutionMap();
  });

  document.querySelectorAll("#institution-scope button").forEach((button) => {
    button.addEventListener("click", () => {
      state.institutionScope = button.dataset.scope;
      document.querySelectorAll("#institution-scope button").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      renderInstitutionMap();
    });
  });

  const categorySelect = document.querySelector("#title-category");
  categorySelect.innerHTML = `<option value="all">全部类型</option>${categories
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("")}`;
  categorySelect.addEventListener("change", (event) => {
    state.titleCategory = event.target.value;
    renderTitleList();
  });

  const titlePeriod = document.querySelector("#title-period");
  titlePeriod.innerHTML = periodOptions(true);
  titlePeriod.addEventListener("change", (event) => {
    state.titlePeriod = event.target.value;
    renderTitleList();
  });

  document.querySelector("#title-search").addEventListener("input", (event) => {
    state.titleSearch = event.target.value;
    renderTitleList();
  });

  const personSelect = document.querySelector("#person-select");
  personSelect.innerHTML = people
    .map((person) => `<option value="${person.id}">${escapeHtml(person.name)}（${escapeHtml(person.birthDeath)}）</option>`)
    .join("");
  personSelect.value = state.selectedPerson;
  personSelect.addEventListener("change", (event) => {
    state.selectedPerson = event.target.value;
    state.selectedAppointment = null;
    renderCareer();
  });

  document.querySelector("#career-dimension").addEventListener("change", (event) => {
    state.careerDimension = event.target.value;
    renderCareer();
  });

  document.querySelector("#decode-button").addEventListener("click", decodeText);
  document.querySelectorAll("[data-sample]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector("#decoder-input").value = button.dataset.sample;
      decodeText();
    });
  });
}

function init() {
  renderOverviewStats();
  setupControls();
  renderInstitutionMap();
  renderTitleList();
  renderChanges();
  renderCareer();
  decodeText();

  const initialView = window.location.hash.replace("#", "");
  const validViews = [...document.querySelectorAll("[data-view-panel]")].map((panel) => panel.dataset.viewPanel);
  setView(validViews.includes(initialView) ? initialView : "overview");
}

init();
