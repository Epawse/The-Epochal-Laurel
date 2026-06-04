# Gemini 3.5 Flash 思考档位调研

> 调研者：主代理（Gemini research 子代理被用户中止，改为主代理自查）
> 日期：2026-06-04

## 来源
- [What's new in Gemini 3.5 Flash](https://ai.google.dev/gemini-api/docs/whats-new-gemini-3.5)（2026-05 更新）
- [Gemini thinking — generateContent API](https://ai.google.dev/gemini-api/docs/thinking)
- [OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai)
- [论坛：No access to reasoning_tokens via OpenAI-compat layer](https://discuss.ai.google.dev/t/no-access-to-reasoning-tokens-via-gemini-apis-openai-compatible-layer/115433)（提到 "output budget cannibalization"）

## 核心结论

### 思考档位（`thinking_level` 取代旧 `thinking_budget`）
- 值：`minimal` / `low` / `medium`（**默认**）/ `high`
- gemini-3.5-flash 默认 = **medium**（官方："faster and more cost-efficient"，从 Gemini 3 Preview 的 high 下调）
- **Gemini 3 系列（含 3.5 Flash）思考无法完全关闭**，最低 `minimal`（"matches the no-thinking setting for most queries, minimizes latency"，但不保证完全不思考）

### OpenAI 兼容层映射（`reasoning_effort` → `thinking_level`）
| reasoning_effort | Gemini 3 Flash | 含义 |
|---|---|---|
| `minimal` | minimal | 最快，≈无思考 |
| `low` | low | 少量思考，"minimizes latency, best for simple instruction following" |
| `medium` | medium | 默认 / 网页"标准"，平衡 |
| `high` | high | 最深推理，显著更慢 |
- `none` 仅 2.5 模型可禁用思考；**3 系列不可**。
- `reasoning_effort` 与 `thinking_level/thinking_budget` 不能同时传。
- 2.5 系列 low/medium/high 对应 1K/8K/24K thinking budget；3 系列未公布精确数字。

### 截断机制（项目 `outputTokens:31` 根因）
- 官方：thinking tokens 与 output tokens **计价分开**（`thoughts_token_count` 独立计量）。
- **但 OpenAI 兼容层的 `max_tokens` 实际约束 thinking + 可见输出的总和** —— 论坛称 "output budget cannibalization"。
- 证据链：medium≈8K thinking budget；项目 `reasoning_effort:"medium"` + `max_tokens:800` → 可见 content 被蚕食到 31 token → JSON 截断 → E2 必败。
- **修复**：降档（`minimal`/`low`，减少 thinking 占用）**且/或**抬 `max_tokens` 覆盖 thinking budget + content。

## 用户"网页端标准快思考"的对应
- 网页端"标准"思考 = `medium`（默认档）。
- 但对一次性 JSON 调用，真正"快 + 轻思考"是 **`low`**（甚至 `minimal`）。
- 推荐 E2：`reasoning_effort:"low"` + `max_tokens~2048`，兼顾轻思考 / 不截断 / 快。

## 对比 DeepSeek v4（见 [`deepseek-v4-thinking.md`](deepseek-v4-thinking.md)）
- DeepSeek v4 **无渐进思考档**（只 on/off；reasoning_effort low/medium 静默→high）。
- reasoning 走 `reasoning_content`，**不吃 max_tokens**；E2 失败是纯延迟（超时）。
- thinking 模式下 `temperature` 是 **no-op**（judge.ts 的 0.3 未生效）。
- 结论：**"Gemini 式轻量快思考"在 DeepSeek v4 上无法复刻** —— 要"有思考+快"只能走 Gemini 轻思考档；DeepSeek 要快只能关思考。

## 不确定性 / 实现时需实测
- "max_tokens 约束 thinking+content 总和"无 Google 官方明文，但项目实测 + 论坛 "budget cannibalization" 已强证。实现时实测验证：设 `low` + `max_tokens:2048`，确认 `outputTokens` 完整、JSON 不截断。
- gemini-3.5-flash 各档精确 thinking budget 未公布。
