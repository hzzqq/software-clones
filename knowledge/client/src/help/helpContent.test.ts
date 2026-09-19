import { describe, it, expect } from "vitest";
import { helpContent } from "./helpContent";

describe("helpContent 冒烟测试", () => {
  it("导出了带 appName / tagline 的帮助内容", () => {
    expect(helpContent).toBeDefined();
    expect(typeof helpContent.appName).toBe("string");
    expect(helpContent.appName.length).toBeGreaterThan(0);
    expect(typeof helpContent.tagline).toBe("string");
  });
});
