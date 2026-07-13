import { expect, test } from "@playwright/test";

test("home presents current corpus coverage and navigates to title research", async ({ page }) => {
  await page.goto("./");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("一纸除授");
  await expect(page.getByText("60", { exact: true }).first()).toBeVisible();
  await page.getByRole("link", { name: "官名", exact: true }).click();
  await expect(page).toHaveURL(/\/chushou\/titles$/u);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("必须带着时期解释");
});

test("global search understands traditional characters and opens a real deep link", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.getByRole("button", { name: /搜索/u })).toBeVisible();
  await page.keyboard.press("Control+K");
  await page.getByPlaceholder("搜索官名、人物、机构、地点或来源……").fill("龍圖閣學士");
  await page.getByRole("button", { name: /龙图阁学士/u }).click();

  await expect(page).toHaveURL(/\/chushou\/titles\/longtu-xueshi$/u);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("龙图阁学士");
});

test("title claims expose their passage and locator in the evidence drawer", async ({ page }) => {
  await page.goto("./titles/canzhi-zhengshi");
  await page.getByRole("button", { name: "展开主张、引文与定位" }).click();

  const drawer = page.getByRole("dialog", { name: /参知政事/u });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("直接证据").first()).toBeVisible();
  await expect(drawer.locator("blockquote").first()).toContainText("掌副宰相");
  await expect(drawer.getByRole("link", { name: /打开数字版本/u }).first()).toHaveAttribute(
    "href",
    /^https:\/\//u,
  );
});

test("Su Shi career supports appointment deep links and component decomposition", async ({
  page,
}) => {
  await page.goto("./people/su-shi/career");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("苏轼");
  const appointmentLink = page.getByRole("link", { name: /除大理评事/u }).first();
  await appointmentLink.click();

  await expect(page).toHaveURL(/\/chushou\/people\/su-shi\/appointments\//u);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("除大理评事");
  await expect(page.getByLabel("任命原文拆解")).toBeVisible();
  await expect(page.getByRole("heading", { name: "只连接已经建模的关系" })).toBeVisible();
  await expect(page.getByText("人物关系覆盖缺口")).toBeVisible();
});

test("decoder switches period and exposes temporal action relationships without hiding gaps", async ({
  page,
}) => {
  await page.goto("./decoder");
  await page.getByLabel("任官原文或官衔串").fill("除龙图阁学士、知杭州，寻迁翰林学士承旨");
  await page.getByLabel("解释时期").selectOption({ label: "元祐时期" });

  await expect(page).toHaveURL(/text=%E9%99%A4/u);
  await expect(page).toHaveURL(/period=chs%3Aperiod%3Ayuanyou/u);
  await expect(page.locator("mark.mark-temporal", { hasText: "寻" })).toBeVisible();
  const actionSequence = page.getByLabel("动作与官衔关系候选");
  await expect(actionSequence).toContainText("除 → 龙图阁学士、知州");
  await expect(actionSequence).toContainText("随后：迁 → 翰林学士承旨");
  await expect(page.getByText(/不自动写入正式数据库/u)).toBeVisible();
});

test("institution map filters by period, scopes the graph, zooms, and deep-links focus", async ({
  page,
}) => {
  await page.goto("./map");
  await page.getByLabel("时期镜头").selectOption({ label: "元丰改制" });
  await page.getByRole("button", { name: "中央", exact: true }).click();
  await page.getByRole("button", { name: "放大制度地图" }).click();

  await expect(page.locator(".map-zoom output")).toHaveText("110%");
  await expect(page).toHaveURL(/period=chs%3Aperiod%3Ayuanfeng-reform/u);
  await expect(page).toHaveURL(/scope=central/u);
  await page.getByRole("button", { name: /门下省/u }).click();
  await expect(page).toHaveURL(/focus=chs%3Ainstitution%3Amenxia-sheng/u);
});

test("reform view compares two URL-addressable periods and title detail preserves both usages", async ({
  page,
}) => {
  await page.goto("./reforms");
  await page.getByLabel("时期 A").selectOption({ label: "元丰改制前" });
  await page.getByLabel("时期 B").selectOption({ label: "元祐时期" });

  await expect(page).toHaveURL(/left=chs%3Aperiod%3Anorth-song-pre-yuanfeng/u);
  await expect(page).toHaveURL(/right=chs%3Aperiod%3Ayuanyou/u);
  await expect(page.getByLabel("元丰改制前与元祐时期比较")).toContainText("官名时期版本");

  await page.goto("./titles/shizhong");
  await expect(page.getByText("侍中（元丰改制前高秩罕除）")).toBeVisible();
  await expect(page.getByText("侍中（元丰后三省长官虚位）")).toBeVisible();
});

test("a counterexample person reuses the same career and decomposition routes", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.getByRole("button", { name: /搜索/u })).toBeVisible();
  await page.keyboard.press("Control+K");
  await page.getByPlaceholder("搜索官名、人物、机构、地点或来源……").fill("司馬光");
  await page.getByRole("button", { name: /司马光/u }).click();

  await expect(page).toHaveURL(/\/chushou\/people\/sima-guang\/career$/u);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("司马光");
  await page.getByRole("link", { name: /尚书左仆射兼门下侍郎/u }).click();
  await expect(page.getByLabel("任命原文拆解")).toContainText("尚书左仆射");
  await expect(page.getByLabel("任命原文拆解")).toContainText("门下侍郎");
});

test("rank schemes expose local order, crosswalk confidence, and evidence", async ({ page }) => {
  await page.goto("./data#rank-model");
  const model = page.locator("#rank-model");

  await expect(model.getByRole("heading", { level: 2 })).toContainText("一条 rank 字段不够");
  await expect(model.getByText("元丰寄禄官二十四阶（局部序列种子）")).toBeVisible();
  await expect(model.getByText("置信度：低", { exact: true })).toBeVisible();
  await expect(model.getByText("争议边界")).toBeVisible();

  const yuanfengScheme = model
    .locator(".rank-scheme-grid > article")
    .filter({ hasText: "元丰寄禄官二十四阶" });
  await yuanfengScheme.getByRole("button", { name: "核对方案依据" }).click();
  const drawer = page.getByRole("dialog", { name: /元丰寄禄官二十四阶/u });
  await expect(drawer.locator("blockquote").first()).toContainText("元丰寄禄格");
  await page.keyboard.press("Escape");

  await page.goto("./titles/chaofeng-lang");
  await expect(page.getByText("品秩方案内定位")).toBeVisible();
  await expect(page.getByText(/元丰寄禄官二十四阶/u)).toBeVisible();
});

test("coverage ledger distinguishes biography alignment from authoritative completeness", async ({
  page,
}) => {
  await page.goto("./data");

  await expect(page.getByText("13 / 38 条", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "权威分母尚未取得，系统明确停在这里。" }),
  ).toBeVisible();
  await expect(page.getByText(/数据库对照进度，不是完整生涯覆盖率/u)).toBeVisible();

  await page.getByRole("link", { name: /查看已核书目与权利边界/u }).click();
  await expect(page).toHaveURL(/\/chushou\/sources\/chs%3Asource%3Akong-fanli-su-shi-nianpu$/u);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("孔凡礼《苏轼年谱》");
  await expect(page.getByText(/ISBN 7-101-01473-9/u)).toBeVisible();
});

test("comparison deep links cover appointments, periodized titles, and people", async ({
  page,
}) => {
  await page.goto(
    "./compare?mode=title&left=chs%3Atitle%3Atongpan&right=chs%3Atitle%3Azhizhou&period=chs%3Aperiod%3Ayuanfeng-reform",
  );

  await expect(page.getByRole("link", { name: "官名与时期" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByLabel("通判与知州比较")).toContainText("与知州并置的州级副贰");
  await expect(page.getByLabel("通判与知州比较")).toContainText("品秩定位");

  await page.getByRole("link", { name: "人物制度位置" }).click();
  await expect(page.getByLabel("苏轼与王安石比较")).toContainText("13/38 条《宋史》锚点已对照");
  await page.getByLabel("人物 B").selectOption({ label: "司马光" });
  await expect(page).toHaveURL(/right=chs%3Aperson%3Asima-guang/u);
  await expect(page.getByLabel("苏轼与司马光比较")).toContainText("1 条已发布任命小切片");
});

test("current filtered URL can be copied as an exact deep link", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: "http://127.0.0.1:43179",
  });
  await page.goto(
    "./compare?mode=title&left=chs%3Atitle%3Atongpan&right=chs%3Atitle%3Azhizhou&period=chs%3Aperiod%3Ayuanfeng-reform",
  );
  const expected = page.url();

  await page.getByRole("button", { name: "复制当前深链接", exact: true }).click();
  await expect(page.getByRole("button", { name: "已复制当前深链接" })).toBeVisible();
  await expect.poll(async () => page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
});

test("source browser filters through assertions and reverses passages back to supported claims", async ({
  page,
}) => {
  await page.goto("./sources");
  await page.getByLabel("人物").selectOption({ label: "苏轼" });
  await page.getByLabel("时期").selectOption({ label: "元祐时期" });

  await expect(page).toHaveURL(/person=chs%3Aperson%3Asu-shi/u);
  await expect(page).toHaveURL(/period=chs%3Aperiod%3Ayuanyou/u);
  await expect(page.getByText(/种来源符合当前筛选/u)).toBeVisible();

  await page.locator(".source-card", { hasText: "《宋史》" }).click();
  await expect(page.getByRole("heading", { name: "这份来源支持的已发布断言" })).toBeVisible();
  await expect(page.getByRole("button", { name: "查看这条断言的引文" }).first()).toBeVisible();
});

test("career metrics expose five separate inspectable tracks and no aggregate score", async ({
  page,
}) => {
  await page.goto("./metrics");
  const table = page.getByRole("table", {
    name: /苏轼已发布任命的中央核心程度、实际权力、名义品级、资望与皇帝信任相关信号/u,
  });

  await expect(table.getByRole("rowheader", { name: /中央核心程度/u })).toBeVisible();
  await expect(table.getByRole("rowheader", { name: /实际权力/u })).toBeVisible();
  await expect(table.getByRole("rowheader", { name: /名义品级/u })).toBeVisible();
  await expect(table.getByRole("rowheader", { name: /资望／荣衔/u })).toBeVisible();
  await expect(table.getByRole("rowheader", { name: /皇帝信任相关/u })).toBeVisible();

  const actualPowerRow = table.getByRole("row", { name: /实际权力/u });
  await actualPowerRow.locator("summary").first().click();
  await expect(actualPowerRow.getByText(/方法：/u).first()).toBeVisible();
  await expect(page.getByText("当前版本没有“政治位置总分”")).toBeVisible();
});

test("versioned research downloads expose hashes, coverage blockers, and a data dictionary", async ({
  page,
  request,
}) => {
  await page.goto("./data");
  await expect(page.getByRole("heading", { name: "同一事实模型，七种可复核文件。" })).toBeVisible();
  await expect(page.getByRole("link", { name: /任命 CSV/u })).toHaveAttribute(
    "href",
    /appointments\.csv$/u,
  );

  const manifestResponse = await request.get("./downloads/manifest.json");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = (await manifestResponse.json()) as { files: Record<string, string> };
  expect(manifest.files["appointments.csv"]).toMatch(/^sha256:[a-f0-9]{64}$/u);
  expect(manifest.files["data-dictionary.json"]).toMatch(/^sha256:[a-f0-9]{64}$/u);

  const coverageResponse = await request.get("./downloads/coverage.csv");
  expect(await coverageResponse.text()).toContain("authoritative_chronology,blocked");
  const dictionaryResponse = await request.get("./downloads/data-dictionary.json");
  const dictionary = (await dictionaryResponse.json()) as { entities: Record<string, unknown> };
  expect(dictionary.entities).toHaveProperty("appointmentActions");
  expect(dictionary.entities).toHaveProperty("coverageMatrices");
});

test("path lab replays evidenced appointments and locks unsupported universal rules", async ({
  page,
}) => {
  await page.goto("./simulator?mode=replay&person=su-shi&step=5");

  await expect(page.getByRole("link", { name: "证据路径回放" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("heading", { name: /责授检校尚书水部员外郎/u })).toBeVisible();
  await expect(page.getByText("史料明载已到／在事", { exact: true })).toBeVisible();
  await expect(page.getByText(/这些通用路径与情境尚未开放选择/u)).toBeVisible();

  await page.getByRole("link", { name: "前进到下一条已发布记录" }).click();
  await expect(page).toHaveURL(/step=6/u);
  await expect(page.getByRole("heading", { name: "复朝奉郎、知登州", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "官衔构造实验" }).click();
  await expect(page.getByText("这是一项教学组合，不对应真实任命。")).toBeVisible();
});

test("unknown routes render a deliberate in-app 404", async ({ page }) => {
  await page.goto("./not-a-real-route");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("这条路径尚未入图");
  await expect(page.getByRole("link", { name: "返回首页" })).toBeVisible();
});
