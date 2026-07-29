# Agent Harness 对比：Pi vs Hermes

> **一句话总结：Agent = Model（智商/底座）+ Harness（编排/脚手架）**
>
> 所有 Coding Agent（Pi、Hermes、Claude Code、Codex）的核心循环完全一样，区别只在"编排方式"不同。

**By lwl** | [GitHub](https://github.com/lwl-ManchesterCity)

## 核心发现

- **Skill 是跨框架通用的**（遵循 [agentskills.io](https://agentskills.io/specification) 规范）
- **Pi 和 Hermes 都有用户级插件系统**（不需要改源码就能扩展）
- **核心循环相同**（调用 LLM → 检查工具 → 执行 → 注入结果 → 循环），**扩展方式不同**（TypeScript vs Python）

## 目录

- [核心循环对比](#核心循环对比)
- [扩展机制对比](#扩展机制对比)
- [Skill 系统对比](#skill-系统对比)
- [实战示例](#实战示例)
- [选型建议](#选型建议)

---

## 核心循环对比

所有 Agent 框架的底层都是同一个模式：

```
用户提问
    ↓
┌──→ 调用 LLM（工具列表注入系统提示）
│       ↓
│    LLM 自主决策：哪个工具最相关？
│       ↓
│    有工具调用吗？──No──→ 检查新消息 → 有？继续 / 没有？结束
│       ↓ Yes
│    执行工具 → 结果注入上下文
│       ↓
└──── 回到调用 LLM
```

| 方面 | Pi | Hermes |
|------|----|--------|
| **循环结构** | 双层 while（外层对话 + 内层工具） | 工具调用链 + 会话状态 |
| **事件系统** | 显式 `emit()` + 类型化事件 | 隐式（通过工具返回值） |
| **并行执行** | `Promise.all()` 默认并行 | `delegate_task` 并行子任务 |
| **停止机制** | `terminate` + `shouldStopAfterTurn` | 模型自然结束 |

---

## 扩展机制对比

### Pi 的 Extension（TypeScript）

```typescript
// ~/.pi/agent/extensions/weather.ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "weather",
    description: "获取天气信息",
    parameters: Type.Object({
      city: Type.String({ description: "城市名" }),
    }),
    async execute(_, params) {
      return {
        content: [{ type: "text", text: `${params.city} 天气：晴，25°C` }],
      };
    },
  });

  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName === "bash" && event.input.command?.includes("rm -rf")) {
      const ok = await ctx.ui.confirm("危险!", "确认执行?");
      if (!ok) return { block: true, reason: "User blocked" };
    }
  });
}
```

### Hermes 的 Plugin（Python）

```python
# ~/.hermes/plugins/weather/__init__.py
def register(ctx):
    ctx.register_tool({
        "name": "weather",
        "description": "获取天气信息",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "城市名"}
            }
        },
        "execute": weather_execute
    })

    ctx.register_hook("pre_tool_call", pre_tool_hook)

def weather_execute(params):
    return {"content": f"{params['city']} 天气：晴，25°C"}

def pre_tool_hook(tool_name, params):
    if tool_name == "bash" and "rm -rf" in params.get("command", ""):
        raise PermissionError("危险操作被阻止")
```

### 对比

| 方面 | Pi | Hermes |
|------|----|--------|
| **插件位置** | `~/.pi/agent/extensions/*.ts` | `~/.hermes/plugins/<name>/` |
| **语言** | TypeScript | Python |
| **注册工具** | `pi.registerTool()` | `ctx.register_tool()` |
| **事件拦截** | `pi.on("tool_call")` → 返回 `{ block: true }` | `ctx.register_hook("pre_tool_call")` → 抛异常 |
| **自定义命令** | `pi.registerCommand()` | `ctx.register_cli_command()` |
| **热加载** | ✅ `/reload` 命令 |  需要重启 |
| **状态持久化** | `pi.appendEntry()` | 通过 memory 插件 |

---

## Skill 系统对比

Skill 是**跨框架通用**的规范（[agentskills.io](https://agentskills.io/specification)），不是某个框架的专利。

```
skill-name/
├── SKILL.md          # 必需: frontmatter + 指令
├── scripts/          # 可选: 可执行脚本
── references/       # 可选: 详细文档
└── assets/           # 可选: 模板、资源
```

| 方面 | Pi | Hermes |
|------|----|--------|
| **Skill 位置** | `~/.pi/agent/skills/` | `~/.hermes/skills/` |
| **加载机制** | 系统提示注入 XML 描述，模型按需 read | 系统提示注入描述 |
| **强制加载** | `/skill:name` | 通过对话上下文触发 |
| **验证标准** | 警告但宽容 | 严格验证（frontmatter + 大小限制） |
| **跨框架** | ✅ 可加载 `~/.claude/skills` | ✅ 可加载其他框架 skills |

**关键洞察**：Skill 是"操作手册"（告诉模型怎么做），Extension/Plugin 是"执行引擎"（代码级控制）。

---

## 实战示例

### 示例 1：查天气工具

- [Pi 实现](pi-examples/weather-extension.ts)
- [Hermes 实现](hermes-examples/weather-plugin/)

### 示例 2：代码审查助手

- [Pi 实现](pi-examples/code-review-extension.ts)
- [Hermes 实现](hermes-examples/code-review-plugin/)

### 示例 3：危险操作拦截

- [Pi 实现](pi-examples/security-extension.ts)
- [Hermes 实现](hermes-examples/security-plugin/)

---

## 选型建议

| 场景 | 选 Pi | 选 Hermes |
|------|-------|----------|
| 需要代码级拦截 | ✅ | ⚠️ 可以但不如 Pi 直接 |
| 需要丰富内置工具 | ❌ 只有 4 个 | ✅ 20+ 个 |
| 需要热加载插件 | ✅ `/reload` | ❌ 需要重启 |
| 需要并行工具执行 | ✅ 默认并行 | ⚠️ 通过 delegation |
| 快速上手 | ❌ 需要懂 TypeScript | ✅ Markdown Skill |
| 企业级控制 | ✅ Extension API | ⚠️ 需要更多配置 |
| 模型中立 | ✅ 支持 20+ 提供商 | ✅ 支持 20+ 提供商 |
| 包分发 | ✅ `pi install` npm/git | ⚠️ 手动管理 |

### 一句话

> **Pi = "解剖学教材"**（让你看到 Agent 的每个器官怎么工作）
> **Hermes = "临床手册"**（教你怎么快速完成任务）
> **两者核心循环相同，只是"包装"不同**

---

## 学习路径

1. **跑起来**：安装 Pi/Hermes，完成一次对话
2. **Skill 对照**：创建同一个 Skill，对比加载机制
3. **Extension 体验**：写一个插件注册自定义工具
4. **源码拆解**：读 `agent-loop.ts` / `model_tools.py`，理解核心循环
5. **对比实验**：同一任务在两个框架里实现

## License

MIT
