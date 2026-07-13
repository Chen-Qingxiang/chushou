import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  "./",
  "./titles",
  "./titles/canzhi-zhengshi",
  "./map",
  "./reforms",
  "./people/su-shi/career",
  "./metrics",
  "./decoder",
  "./compare?mode=title&left=chs%3Atitle%3Atongpan&right=chs%3Atitle%3Azhizhou&period=chs%3Aperiod%3Ayuanfeng-reform",
  "./sources",
  "./learn",
  "./simulator?mode=replay&person=su-shi&step=5",
  "./data",
] as const;

test("key routes have no automatically detectable WCAG A or AA violations", async ({ page }) => {
  for (const route of routes) {
    const consoleErrors: string[] = [];
    const onConsole = (message: { type(): string; text(): string }) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    };
    page.on("console", onConsole);
    await page.goto(route, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    page.off("console", onConsole);

    expect(consoleErrors, `${route} emitted console errors`).toEqual([]);
    expect(
      results.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        targets: violation.nodes.map((node) => node.target),
      })),
      `${route} has automatic WCAG violations`,
    ).toEqual([]);
  }
});

test("keyboard focus enters, stays within, and returns from interactive layers", async ({
  page,
}) => {
  await page.goto("./");
  const footerLinks = page.getByRole("navigation", { name: "页脚导航" }).getByRole("link");
  for (const link of await footerLinks.all()) {
    const box = await link.boundingBox();
    expect(box, "footer link should have a measurable hit target").not.toBeNull();
    expect(
      box?.height,
      "footer link hit target should be at least 24px tall",
    ).toBeGreaterThanOrEqual(24);
  }

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "跳到正文" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  const searchTrigger = page.getByRole("button", { name: /搜索/u });
  await searchTrigger.focus();
  await page.keyboard.press("Control+K");
  const searchInput = page.getByPlaceholder("搜索官名、人物、机构、地点或来源……");
  await expect(searchInput).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("dialog", { name: "全站搜索" }).getByRole("button").last(),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(searchTrigger).toBeFocused();

  await page.goto("./titles/canzhi-zhengshi");
  const evidenceButton = page.getByRole("button", { name: "展开主张、引文与定位" });
  await evidenceButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "关闭证据侧栏" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(evidenceButton).toBeFocused();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  const menuButton = page.getByRole("button", { name: "切换导航" });
  await menuButton.click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible();
});
