"""
Hermes Plugin: 查天气工具

放置位置: ~/.hermes/plugins/weather-plugin/
重启 Hermes 后自动加载

测试方法:
  在 Hermes 中输入: "北京天气怎么样？"
"""


def register(ctx):
    """注册工具和钩子"""
    # 注册查天气工具
    ctx.register_tool(
        name="weather",
        description="获取指定城市的实时天气信息。当用户询问天气、气温、下雨、晴天等问题时使用此工具。",
        parameters={
            "type": "object",
            "properties": {
                "city": {
                    "type": "string",
                    "description": "城市名称，如：北京、上海、深圳",
                }
            },
            "required": ["city"],
        },
        execute_fn=weather_execute,
    )

    # 注册生命周期钩子
    ctx.register_hook("on_session_start", on_session_start)


def weather_execute(params, **kwargs):
    """执行查天气逻辑"""
    city = params.get("city", "未知")

    # 实际项目中替换为真实天气 API
    # import requests
    # res = requests.get(f"https://api.weather.com/v1/{city}")
    # data = res.json()

    import random

    conditions = ["晴", "多云", "阴", "小雨"]
    temps = [22, 25, 28, 30]
    idx = random.randint(0, len(conditions) - 1)

    return {
        "content": [
            {
                "type": "text",
                "text": f"{city} 当前天气：{conditions[idx]}，气温 {temps[idx]}°C",
            }
        ]
    }


def on_session_start(**kwargs):
    """启动时通知"""
    print("[weather-plugin] 天气插件已加载")
