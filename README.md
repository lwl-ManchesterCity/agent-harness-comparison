# Agent Harness 对比：Pi vs Hermes

> **一句话总结：Agent = Model（智商/底座）+ Harness（编排/脚手架）**

**By lwl** | [GitHub](https://github.com/lwl-ManchesterCity)

---

## 这不是一篇技术文档，这是我的学习记录

我学 Agent 框架的过程，大概经历了这么几个阶段：

### 第一阶段：以为 Skill 是某个框架的"专利"

一开始我以为 Hermes 的 Skill 是 Hermes 独有的东西。后来我去看了 Pi 的文档，发现 Pi 也有 Skill，格式几乎一样。

**我的第一个认知转变**：

> Skill 不是 Hermes 的，不是 Pi 的，它就是个"技能包"。哪个 Agent 都能用。
> 
> 就像你给手机装 App，iOS 和 Android 都能装微信，微信不是某个手机的专利。

这个认知让我意识到，我之前对框架的理解太表面了。

### 第二阶段：发现核心差异在"Harness 编排"

既然 Skill 是通用的，那 Pi 和 Hermes 到底有什么区别？

我当时的理解是：

> Codex、Hermes、Pi、Claude Code 这些都是 Agent Coding 工具。
> 它们的区别不在于 Skill，而在于 **Harness 的编排方式**，以及底层用的模型不同。

这个认知让我开始关注"框架是怎么编排 Agent 行为的"，而不是"框架有什么功能"。

### 第三阶段：Pi 是根基，其他是封装

我继续深入，发现了一个很重要的东西：

> Pi 的 Harness 很简单，自由度很高。
> Hermes、Codex、Claude Code 都封装好了，新手用起来方便，但看不到内部。
> 
> **Pi 就像手动挡汽车**——你能看到每个齿轮怎么转。
> **其他框架像自动挡**——踩油门就走，但看不到传动系统。

所以我决定先学 Pi，理解 Agent 背后的逻辑。

### 第四阶段：被"学习曲线低"误导了

我在对比文档里看到一句话："Hermes 学习曲线低，因为 Skill 是 Markdown"。

我当时就质疑了：

> Skill 文件在两个框架里都是一样的 Markdown 啊，Agent 读到的内容不应该一样吗？
> 那"学习曲线低"到底低在哪？

后来我理解了：**不是 Skill 文件本身有区别，而是"围绕 Skill 还能做什么"有区别。**

- Hermes：Skill + 配置（Cron/Delegation），大部分需求用 Skill 就够了
- Pi：Skill + 代码（TypeScript Extensions），想深度定制必须写代码

### 第五阶段：什么时候需要写代码？

我又追问了一个问题：

> 为什么很多时候通过文本去规范不太行？比如权限控制，模型可能不听啊。

这个问题的答案让我彻底理解了两个框架的设计哲学：

> **Hermes 面向个人开发者**——允许错误产生，用起来方便，有错误就重新生成。
> **企业级项目需要绝对正确**——必须通过代码强制规范，不能靠"建议"。

这就是为什么 Pi 提供了 Extension API（代码级控制），而 Hermes 主要靠 Skill（规则约束）。

### 第六阶段：我以为 Hermes 只能改源码

我之前一直以为，Hermes 要添加自定义工具只能改源码。

**直到我看了 Hermes 的 AGENTS.md，发现它也有插件系统！**

```
~/.hermes/plugins/<name>/
── plugin.yaml
└── __init__.py    ← 和 Pi 的 Extension 几乎一样！
```

我之前的理解是错的。Hermes 也有用户级插件系统，只是文档里提得少，很多人不知道。

### 第七阶段：打通了

最后我把所有线索串起来了：

> 不管 Pi、Hermes、还是我自己写的 hello-agent，底层都是同一个模式：
> 
> **注册工具 → 描述注入系统提示 → LLM 自主决策 → 调用工具**
> 
> 所有框架的核心循环完全一样，只是"包装"不同。

---

## 核心循环（所有框架都一样）

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

### 我的关键理解

一开始我以为一个 Extension 文件只能注册一个工具。后来我发现：

> **Extension 文件只在启动时执行一次**（注册工具到内存），对话时用的是内存中的工具信息。
> 
> 一个文件可以注册任意数量的工具、事件、命令。
> 
> 就像餐厅的厨师招聘广告——启动时厨师来上班（注册到内存），顾客点菜时根据菜名找厨师（内存查找），不需要知道厨师住哪里（文件路径）。

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
├── references/       # 可选: 详细文档
── assets/           # 可选: 模板、资源
```

| 方面 | Pi | Hermes |
|------|----|--------|
| **Skill 位置** | `~/.pi/agent/skills/` | `~/.hermes/skills/` |
| **加载机制** | 系统提示注入 XML 描述，模型按需 read | 系统提示注入描述 |
| **强制加载** | `/skill:name` | 通过对话上下文触发 |
| **验证标准** | 警告但宽容 | 严格验证（frontmatter + 大小限制） |
| **跨框架** | ✅ 可加载 `~/.claude/skills` | ✅ 可加载其他框架 skills |

**我的理解**：

> Skill 是"操作手册"（告诉模型怎么做），Extension/Plugin 是"执行引擎"（代码级控制）。
> 
> 两者是不同层次的东西，不是替代关系。

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

### 我的总结

> **Pi = "解剖学教材"**（让你看到 Agent 的每个器官怎么工作）
> **Hermes = "临床手册"**（教你怎么快速完成任务）
> 
> 两者核心循环相同，只是"包装"不同。
> 
> 如果你想理解 Agent 底层原理，学 Pi。
> 如果你想快速完成任务，用 Hermes。
> 如果你两个都想要，就像我一样——用 Hermes 干活，用 Pi 学习。

---

## 我的学习路径（供参考）

1. **跑起来**：安装 Pi，完成一次对话（30 分钟）
2. **Skill 对照**：创建同一个 Skill，对比加载机制（1 小时）
3. **Extension 体验**：写一个插件注册自定义工具（1 小时）
4. **源码拆解**：读 `agent-loop.ts`，理解核心循环（2 小时）
5. **对比实验**：同一任务在两个框架里实现（1 小时）

**总时间**：约 5-6 小时，从零到理解两个框架的核心差异。

---

## 写在最后

这篇文章不是技术文档，是我学习过程中的认知变化记录。

我从"以为 Skill 是某个框架的专利"，到"发现核心差异在 Harness 编排"，再到"理解什么时候需要代码强制"，最后"打通所有框架的底层共性"。

如果你也在学 Agent 框架，希望我的认知转变过程能帮你少走弯路。

**核心就一句话**：

> **所有 Agent 框架的核心循环都一样，区别只在"编排方式"和"扩展入口"。**

---

## License

See [LICENSE](LICENSE) file for details.
