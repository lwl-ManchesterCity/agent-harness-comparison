/**
 * Pi Extension: 查天气工具
 * 
 * 放置位置: ~/.pi/agent/extensions/weather.ts
 * 重启 Pi 后自动加载
 * 
 * 测试方法:
 *   在 Pi 中输入: "北京天气怎么样？"
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "weather",
    description: "获取指定城市的实时天气信息。当用户询问天气、气温、下雨、晴天等问题时使用此工具。",
    parameters: Type.Object({
      city: Type.String({ description: "城市名称，如：北京、上海、深圳" }),
    }),
    async execute(_toolCallId, params) {
      // 实际项目中替换为真实天气 API
      // const res = await fetch(`https://api.weather.com/v1/${params.city}`);
      // const data = await res.json();

      const conditions = ["晴", "多云", "阴", "小雨"];
      const temps = [22, 25, 28, 30];
      const idx = Math.floor(Math.random() * conditions.length);

      return {
        content: [
          {
            type: "text",
            text: `${params.city} 当前天气：${conditions[idx]}，气温 ${temps[idx]}°C`,
          },
        ],
      };
    },
  });

  // 生命周期：启动时通知
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify("Weather extension loaded!", "success");
  });
}
