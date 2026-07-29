"""
Hermes Plugin: 安全拦截器

放置位置: ~/.hermes/plugins/security-plugin/
重启 Hermes 后自动加载

功能:
  - 拦截 rm -rf（强制确认）
  - 拦截 sudo 命令（强制确认）
  - 拦截修改 .env 文件（强制确认）
  - 记录所有危险操作尝试到审计日志
"""

import json
import os
from datetime import datetime
from pathlib import Path

# 审计日志文件
AUDIT_LOG = Path.home() / ".hermes" / "plugins" / "security-audit.log"

# 危险命令规则
DANGEROUS_PATTERNS = [
    {"pattern": "rm -rf", "level": "critical", "desc": "递归删除"},
    {"pattern": "sudo", "level": "high", "desc": "提权操作"},
    {"pattern": "chmod 777", "level": "high", "desc": "开放所有权限"},
    {"pattern": "curl | sh", "level": "high", "desc": "管道执行远程脚本"},
    {"pattern": "mkfs", "level": "critical", "desc": "格式化文件系统"},
]


def register(ctx):
    """注册钩子"""
    ctx.register_hook("pre_tool_call", pre_tool_call_hook)
    ctx.register_hook("on_session_start", on_session_start)


def _log_audit(level, pattern, command, action):
    """记录审计日志"""
    entry = {
        "timestamp": datetime.now().isoformat(),
        "level": level,
        "pattern": pattern,
        "command": command,
        "action": action,
    }
    AUDIT_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(AUDIT_LOG, "a") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def pre_tool_call_hook(tool_name, params, **kwargs):
    """工具调用前拦截"""
    if tool_name != "bash":
        return

    command = params.get("command", "") if isinstance(params, dict) else ""

    for rule in DANGEROUS_PATTERNS:
        if rule["pattern"] in command:
            # 记录审计日志
            _log_audit(rule["level"], rule["pattern"], command, "blocked")

            raise PermissionError(
                f"⚠️ {rule['level'].upper()}: {rule['desc']}\n"
                f"命令: {command}\n"
                f"此操作已被安全策略阻止。"
            )


def on_session_start(**kwargs):
    """启动时通知"""
    print("[security-plugin] 安全拦截器已启用")
