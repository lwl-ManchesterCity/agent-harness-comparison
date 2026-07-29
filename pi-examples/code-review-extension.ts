/**
 * Pi Extension: 代码审查助手
 * 
 * 放置位置: ~/.pi/agent/extensions/code-review.ts
 * 重启 Pi 后自动加载
 * 
 * 功能:
 *   - 注册 analyze-complexity 工具（代码复杂度分析）
 *   - 注册 security-check 工具（安全检查）
 *   - 拦截危险 bash 命令（rm -rf 确认）
 *   - 注册 /review 快捷命令
 *   - 记录审查日志到 session
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  // ── 工具 1: 代码复杂度分析 ─
  pi.registerTool({
    name: "analyze-complexity",
    description: "分析文件的代码复杂度（圈复杂度）。当用户要求分析代码质量、复杂度、重构建议时使用。",
    parameters: Type.Object({
      file: Type.String({ description: "要分析的文件路径" }),
    }),
    async execute(_toolCallId, params) {
      // 实际项目中集成 lizard 或其他复杂度分析工具
      // const result = await exec(`lizard ${params.file}`);
      return {
        content: [
          {
            type: "text",
            text: `文件 ${params.file} 的复杂度分析：
- 函数数量：5
- 平均复杂度：3.2
- 最高复杂度：8（建议重构）
- 总行数：120`,
          },
        ],
      };
    },
  });

  // ── 工具 2: 安全检查 ──
  pi.registerTool({
    name: "security-check",
    description: "检查代码中的安全问题（SQL注入、XSS、硬编码密码等）。当用户要求安全审计时使用。",
    parameters: Type.Object({
      file: Type.String({ description: "要检查的文件路径" }),
    }),
    async execute(_toolCallId, params) {
      // 实际项目中集成 semgrep 或 bandit
      return {
        content: [
          {
            type: "text",
            text: `文件 ${params.file} 的安全检查：
- ✅ 无 SQL 注入风险
- ⚠️ 发现 1 个潜在 XSS 风险（第 42 行）
- ✅ 无硬编码密码
- ✅ 无不安全的反序列化`,
          },
        ],
      };
    },
  });

  // ── 事件拦截: 阻止危险操作 ──
  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName === "bash" && event.input.command?.includes("rm -rf")) {
      const ok = await ctx.ui.confirm(
        "️ 危险操作",
        `确认执行：${event.input.command}?`
      );
      if (!ok) {
        return { block: true, reason: "用户阻止了危险操作" };
      }
    }
  });

  // ── 自定义命令: 快速审查 ──
  pi.registerCommand("review", {
    description: "快速审查当前暂存的代码变更（git diff --cached）",
    handler: async (_args, ctx) => {
      ctx.ui.notify("开始代码审查...", "info");
    },
  });

  // ── 状态持久化: 记录审查历史 ──
  pi.on("tool_execution_end", async (event) => {
    if (
      event.toolName === "analyze-complexity" ||
      event.toolName === "security-check"
    ) {
      await pi.appendEntry({
        type: "review_log",
        timestamp: Date.now(),
        tool: event.toolName,
        result: "completed",
      });
    }
  });

  // ── 生命周期 ─
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify("代码审查助手已加载", "success");
  });
}
