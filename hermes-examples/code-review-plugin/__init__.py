"""
Hermes Plugin: 代码审查助手

放置位置: ~/.hermes/plugins/code-review-plugin/
重启 Hermes 后自动加载

功能:
  - 注册 analyze-complexity 工具（代码复杂度分析）
  - 注册 security-check 工具（安全检查）
  - 拦截危险 bash 命令（rm -rf 确认）
  - 注册 /review CLI 子命令
"""


def register(ctx):
    """注册工具和钩子"""
    # ── 工具 1: 代码复杂度分析 ──
    ctx.register_tool(
        name="analyze-complexity",
        description="分析文件的代码复杂度（圈复杂度）。当用户要求分析代码质量、复杂度、重构建议时使用。",
        parameters={
            "type": "object",
            "properties": {
                "file": {
                    "type": "string",
                    "description": "要分析的文件路径",
                }
            },
            "required": ["file"],
        },
        execute_fn=analyze_complexity,
    )

    # ── 工具 2: 安全检查 ─
    ctx.register_tool(
        name="security-check",
        description="检查代码中的安全问题（SQL注入、XSS、硬编码密码等）。当用户要求安全审计时使用。",
        parameters={
            "type": "object",
            "properties": {
                "file": {
                    "type": "string",
                    "description": "要检查的文件路径",
                }
            },
            "required": ["file"],
        },
        execute_fn=security_check,
    )

    # ── 事件拦截: 阻止危险操作 ──
    ctx.register_hook("pre_tool_call", pre_tool_call_hook)

    # ── 自定义 CLI 命令 ──
    ctx.register_cli_command("review", review_command)

    # ── 生命周期 ──
    ctx.register_hook("on_session_start", on_session_start)


def analyze_complexity(params, **kwargs):
    """分析代码复杂度"""
    file_path = params.get("file", "未知文件")
    return {
        "content": [
            {
                "type": "text",
                "text": f"""文件 {file_path} 的复杂度分析：
- 函数数量：5
- 平均复杂度：3.2
- 最高复杂度：8（建议重构）
- 总行数：120""",
            }
        ]
    }


def security_check(params, **kwargs):
    """安全检查"""
    file_path = params.get("file", "未知文件")
    return {
        "content": [
            {
                "type": "text",
                "text": f"""文件 {file_path} 的安全检查：
- ✅ 无 SQL 注入风险
- ⚠️ 发现 1 个潜在 XSS 风险（第 42 行）
- ✅ 无硬编码密码
- ✅ 无不安全的反序列化""",
            }
        ]
    }


def pre_tool_call_hook(tool_name, params, **kwargs):
    """工具调用前拦截"""
    if tool_name == "bash":
        command = params.get("command", "") if isinstance(params, dict) else ""
        if "rm -rf" in command:
            raise PermissionError(
                f"危险操作被阻止: {command}\n请使用安全的方式删除文件。"
            )


def review_command(args, **kwargs):
    """快速审查命令"""
    print("开始代码审查...")
    # 实际项目中触发审查流程


def on_session_start(**kwargs):
    """启动时通知"""
    print("[code-review-plugin] 代码审查助手已加载")
