# Agent 核心循环流程图

## Pi 的 Agent Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                        agentLoop()                               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  while (true)  ← 外层循环：持续对话                        │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │  while (hasMoreToolCalls)  ← 内层循环：处理工具      │ │   │
│  │  │                                                    │ │   │
│  │  │   streamAssistantResponse()                       │ │   │
│  │  │     ├─ transformContext()  (可选：压缩上下文)        │ │   │
│  │  │     ├─ convertToLlm()      (Agent格式 → LLM格式)    │ │   │
│  │  │     └─ LLM 流式调用 (tools 注入系统提示)             │ │   │
│  │  │                                                    │ │   │
│  │  │  ② 检查 toolCalls                                  │ │   │
│  │  │     ├─ 有 → executeToolCalls()                     │ │   │
│  │  │     │   ├─ prepareToolCall()                       │ │   │
│  │  │     │   │   └─ beforeToolCall() ← 拦截点！          │ │   │
│  │  │     │   ├─ executePreparedToolCall()               │ │   │
│  │  │     │   └─ finalizeExecutedToolCall()              │ │   │
│  │  │     │       └─ afterToolCall() ← 拦截点！           │ │   │
│  │  │     └─ 无 → hasMoreToolCalls = false               │ │   │
│  │  │                                                    │ │   │
│  │  │  ③ shouldStopAfterTurn() ← 可提前终止               │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  │                                                          │   │
│  │  ④ getFollowUpMessages() ← 检查用户中途输入              │   │
│  │     ├─ 有 → continue (回到外层循环)                      │   │
│  │     └─ 无 → break (结束)                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  全程 emit 事件:                                                  │
│  agent_start → turn_start → message_start → message_update      │
│  → message_end → tool_execution_start → tool_execution_end      │
│  → turn_end → agent_end                                         │
─────────────────────────────────────────────────────────────────┘
```

## 工具注册 → 调用流程

```
┌─ 启动阶段 ─────────────────────────────────────────────┐
│                                                          │
│  Extension 文件 (~/.pi/agent/extensions/*.ts)            │
│       ↓ 执行代码                                          │
│  pi.registerTool({ name, description, execute })         │
│       ↓ 存入内存                                          │
│  tools = [{ name: "weather", ... }, ...]                 │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌─ 对话阶段 ─────────────────────────────────────────────┐
│                                                          │
│  用户: "北京天气怎么样？"                                 │
│       ↓                                                  │
│  工具描述注入系统提示:                                    │
│  "你有以下工具: weather - 获取天气信息..."                │
│       ↓                                                  │
│  LLM 自主决策: "weather 最匹配"                           │
│       ↓                                                  │
│  LLM 返回: { name: "weather", args: { city: "北京" } }   │
│                                                          │
└──────────────────────────────────────────────────────────┘

─ 执行阶段 ─────────────────────────────────────────────┐
│                                                          │
│  tools.find(t => t.name === "weather")  ← 内存查找       │
│       ↓                                                  │
│  tool.execute(toolCallId, { city: "北京" })              │
│       ↓                                                  │
│  返回: "北京 天气：晴，25°C"                              │
│       ↓                                                  │
│  结果注入上下文 → 回到 LLM                                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```
