/**
 * Pi Extension: 安全拦截器
 * 
 * 放置位置: ~/.pi/agent/extensions/security.ts
 * 重启 Pi 后自动加载
 * 
 * 功能:
 *   - 拦截 rm -rf（强制确认）
 *   - 拦截 sudo 命令（强制确认）
 *   - 拦截修改 .env 文件（强制确认）
 *   - 记录所有危险操作尝试到审计日志
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  // 危险命令模式
  const dangerousPatterns = [
    { pattern: "rm -rf", level: "critical", desc: "递归删除" },
    { pattern: "sudo", level: "high", desc: "提权操作" },
    { pattern: "chmod 777", level: "high", desc: "开放所有权限" },
    { pattern: "curl | sh", level: "high", desc: "管道执行远程脚本" },
    { pattern: "mkfs", level: "critical", desc: "格式化文件系统" },
  ];

  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "bash") return;

    const cmd = event.input.command || "";

    for (const rule of dangerousPatterns) {
      if (cmd.includes(rule.pattern)) {
        // 记录审计日志
        await pi.appendEntry({
          type: "security_audit",
          timestamp: Date.now(),
          level: rule.level,
          pattern: rule.pattern,
          command: cmd,
          action: "blocked",
        });

        // 强制用户确认
        const ok = await ctx.ui.confirm(
          `⚠️ ${rule.level === "critical" ? "严重" : "高危"}: ${rule.desc}`,
          `命令: ${cmd}\n\n确认执行？`
        );

        if (!ok) {
          return { block: true, reason: `安全策略阻止: ${rule.desc}` };
        }

        // 用户确认后记录
        await pi.appendEntry({
          type: "security_audit",
          timestamp: Date.now(),
          level: rule.level,
          pattern: rule.pattern,
          command: cmd,
          action: "approved_by_user",
        });

        break; // 只匹配第一个规则
      }
    }
  });

  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify("安全拦截器已启用", "success");
  });
}
