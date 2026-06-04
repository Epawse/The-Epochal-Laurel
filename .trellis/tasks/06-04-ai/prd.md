# 考试链路 AI 可靠性与延迟修复

## Goal

修复常规科举考试（县试/乡试/会试）及殿试自由作答链路中 AI 出题与评卷的可靠性与延迟问题。2026-06-04 县试实测：出题被重复调用、自由作答评卷必然降级为静态兜底、交卷后干等 ~18.7s。目标：AI 出题只调一次、自由作答评卷稳定拿到 AI 评分（不再退回 `学识×0.5`）、交卷总延迟从 ~18.7s 降到单次模型延迟量级（~6–9s）。

## Background — 四个问题（实测日志 + 源码核对）

### #1 🔴 出题被调用两次
- 现象：`getExamQuestion` 并发调两次（日志 9.4s + 15.6s），第二次把 DeepSeek 拖超时 → fallback Gemini。
- 根因：`app/(game)/play/exam/page.tsx:63-75` 的 `useEffect` 用 `cancelled` 标志，只能拦 `setQuestion`，**拦不住已发出的 server action（LLM 调用）**。React 19 dev StrictMode `mount→cleanup→remount` 触发两次。

### #2 🔴 自由作答评卷必然降级
- 现象：E2 DeepSeek 超时 10s abort → fallback Gemini → `outputTokens:31` → `Unexpected end of JSON input` → 退回 `fallbackScore`（学识×0.5）。
- 根因：`lib/ai/contracts/judge.ts:18-29` E2 用 `thinking:true` + `maxTokens:800` + `timeoutMs:10_000`：DeepSeek thinking 慢→超时；Gemini reasoning 吃光 `max_tokens` 预算（output budget cannibalization）→ JSON 截断 → 必败。

### #3 🔴 交卷后干等 ~18.7s
- `submitExamAnswer` 总 18.7s = E2 DeepSeek 超时 10s（纯浪费）+ E2 Gemini 6s（仍失败）+ R1 2.6s。大部分是 #2 的衍生。

### #4 🟠 出题慢 9–15s
- `mid` tier 用 `deepseek-v4-pro`，单次 9.4s；timeout 10s 偶尔不够 → fallback 15s+。修 #1（单发）可把 15.6s 降到 9.4s。
- **返工（实测推翻 timeout 方案）**：把 E1 timeout 提到 15s 后实测更慢——`deepseek-v4-pro` 这次出题 `latencyMs:15001 → AbortError` 超时 → fallback Gemini 5.5s → 总 **20.6s**（比 15.6s 更差）。`deepseek-v4-pro` 出题延迟波动极大（9.4s↔>15s），`gemini-3.5-flash` 稳定 **5.5s**（568 output tokens，json mode 正常）。结论：提高 timeout 治标不治本，E1 应像 E2 一样 **Gemini 优先 + `reasoningEffort:"minimal"`**，timeout 收回 10s。

## Requirements
- **R1**（#1）：`getExamQuestion` 每次进考试页对同一 `(saveId, examLevel)` 只发起一次（前端 once guard，堵 StrictMode 副作用泄漏）。
- **R2**（#2）：E2 自由作答评卷稳定返回有效 JSON，不再超时/截断降级。
  - R2a：E2 改为 **Gemini 优先**，`reasoning_effort:"low"`（轻思考·快）+ `max_tokens~2048`（防截断）。
  - R2b：DeepSeek 作为 E2 兜底，**关 thinking**（保持 `high` tier=v4-pro；实现微调：不降到 v4-flash —— 兜底路径罕见，pro 质量更高，关 thinking 即已解决超时）。
  - R2c：引入 **per-contract provider 顺序 + 档位化 `reasoning_effort`** 机制（替换/兼容 `thinking:boolean`），仅本任务对 E2 启用；接口为未来全局调整预留。
- **R3**（#3）：交卷总延迟降到单次模型延迟量级（~6–9s），消除 10s 超时空等（主要靠 R2）。
- **R4**（#4）：出题延迟不因重复调用恶化（主要靠 R1）；E1 改为 **Gemini 优先 + `reasoningEffort:"minimal"` + timeout 10s**（实测推翻原 timeout 上调方案——`deepseek-v4-pro` 出题延迟不稳，`gemini-3.5-flash` 稳定 ~5.5s）。

## Acceptance Criteria
- [ ] 进入考试页，日志只一次 `getExamQuestion` / 一次 E1 `ai.call`（dev StrictMode 下也不重复）。
- [ ] 自由作答交卷，E2 走 Gemini（`reasoning_effort:low`）返回有效评分：日志无 `ai.fallback contract:E2`、`outputTokens` 完整（非 31 截断）、ResultOverlay 显示真实 `judge_narrative`。
- [ ] E2 DeepSeek 兜底路径关 thinking，不再 10s 超时 abort。
- [ ] per-contract 覆盖生效：E2 用 `[gemini, deepseek]`；其他契约不受影响（仍 `[deepseek, gemini]`）。
- [ ] 交卷总延迟显著下降（消除 10s 超时空等）。
- [x] `pnpm typecheck` / `pnpm test`（220 passed）/ `pnpm lint`（0 errors；2 个 `<img>` warning 为 inherit/leaderboard 页预存，与本任务无关）通过；新增 `providers.test.ts`（reasoning_effort 映射 + 旧 thinking 向后兼容）+ `judge.test.ts`（E2 provider 顺序/档位/预算 + own-fallback）。exam fetch-once 无前端测试设施（项目无 @testing-library），靠日志 + 浏览器 smoke 验证。

## Definition of Done
- 相关单元测试更新（exam page once-guard、judge provider/档位/降级路径、providers `reasoning_effort` 映射）。
- Lint / typecheck / test 绿。
- 行为变化记入 spec（ai-contracts.md：E2 provider 顺序 + `reasoning_effort` 档位 + `max_tokens` 预算 + E1 timeout）。

## Technical Approach
- **#1 once guard**：`exam/page.tsx` 的 `getExamQuestion` `useEffect` 改用 `ref`（记录已请求的 `saveId:examLevel` key）保证每个 mount 周期对同一 key 只发一次 server action；`cancelled` 标志保留用于 `setState` 安全。
- **#2 + per-contract（核心）**：
  - `client.ts` `CallOptions`：把 `thinking?:boolean` 升级/补充为 `reasoningEffort?: "minimal"|"low"|"medium"|"high"`（向后兼容映射）；新增 `providerOrder?` 覆盖全局 `PROVIDER_CHAIN`。
  - `providers.ts` `thinkingParams`：按 provider 映射 `reasoningEffort` —— Gemini → 同名 `reasoning_effort`；DeepSeek → `thinking enabled/disabled`（无中间档：minimal/low→disabled 求快，high→enabled）。
  - `judge.ts`（E2）：`providerOrder=[gemini,deepseek]`，Gemini 用 `reasoningEffort:"low"`、DeepSeek 兜底 disabled；`maxTokens` 抬到 ~2048；保留 `responseFormat:text` + `extractJsonObject`；timeout 给 Gemini low ~12s 余量。
  - 注：DeepSeek thinking 下 `temperature` 是 no-op（调研）；E2 兜底关 thinking 后 `temperature:0.3` 恢复有效。
- **#3**：随 #2 自然降（无超时空等）。R1 叙事保持现状（low tier flash 2.6s，可接受）。
- **#4**（实测推翻 timeout 方案，改为 E1 Gemini 优先 + minimal）：原方案"E1 `timeout` 由 10s 上调到 15s 给 `deepseek-v4-pro` 余量"实测更慢（15s 仍超时 → fallback Gemini → 总 20.6s）。正解：`examQuestion.ts` 复用 E2 同款 per-contract 机制——`providerOrder: ["gemini", "deepseek"]`（Gemini 优先）+ `reasoningEffort: "minimal"`（Gemini 3.x 不支持 `reasoning_effort:"none"`，`minimal` 是明确的最小思考·最快；DeepSeek 兜底 `minimal → thinking disabled`，与原 `thinking:false` 一致）+ timeout 收回 10s（Gemini 5.5s 有余量）。#1 单发仍消除并发自相挤压。
- **覆盖范围**：E2 `evaluateFreeText` 被 `submitExamAnswer` 与 `submitPalaceExam` 共用 → 修复同时惠及县试→殿试的自由作答评卷。

## Decision (ADR-lite)
- **Context**：E2 在 DeepSeek thinking 下超时、回退 Gemini 又因 reasoning 吃 `max_tokens` 截断 → 必然降级。用户希望复刻 Gemini "标准快思考"体验。调研确认只有 Gemini 有轻量思考档（`low`），DeepSeek v4 只 on/off。
- **Decision**：E2 采用方案甲 —— Gemini 优先 + `reasoning_effort:low` + `max_tokens 2048`，DeepSeek 兜底关 thinking。通过新增 **per-contract provider 顺序 + 档位化 `reasoning_effort`** 机制实现，仅 E2 启用。
- **Consequences**：E2 常规路径快（~6s）、带轻思考、不截断；per-contract 机制为未来"全局切 Gemini 主力"留好接口。代价：client/providers 小幅改造 + 需实测验证 Gemini `low`+2048 不截断。返工后 **E1 也启用了 per-contract Gemini 优先**（`reasoningEffort:"minimal"` + timeout 10s），出题从波动的 9–20s 降到稳定 ~5.5s；但 Gemini 优先仍**仅限 E1+E2 两个高延迟契约**，其余 6 个契约维持默认 `[deepseek, gemini]` 链——**非全局切 Gemini**。**全局切 Gemini 主力仍另开数据驱动任务**（各契约 `max_tokens` 审计 + JSON 可靠性 + 质量对比 + 全回归）。

## Out of Scope
- A/B 叙事记录区与状态辨识（下一个任务）。
- **全局把 Gemini 设为所有契约主力**（单开数据驱动任务）。
- C：考题/事件 prefetch、E2-R1 并行化、随机事件零等待命中率优化。
- 换模型（pro→flash 仅限 E2 DeepSeek 兜底；不全局换）。
- 殿试 E3 对手生成（E2 改造顺带覆盖殿试自由作答评卷，但 E3 本身不动）。

## Technical Notes
- 受影响文件：`app/(game)/play/exam/page.tsx`（#1）、`lib/ai/contracts/judge.ts`（#2#3）、`lib/ai/providers.ts` / `lib/ai/client.ts`（per-contract provider 顺序 + 档位化 `reasoning_effort`）、`lib/ai/contracts/examQuestion.ts`（#4 Gemini 优先 + `reasoningEffort:"minimal"` + timeout 收回 10s）。
- DeepSeek thinking：reasoning 在 `reasoning_content`，不吃 content token → 问题是慢→超时；`temperature` no-op。
- Gemini thinking：reasoning 吃 content token（`max_tokens` 蚕食）→ 需 `low` 档 + 抬 `max_tokens`。
- 实现后实测验证：E2 Gemini `low`+`max_tokens:2048` 的 `outputTokens` 完整、JSON 不截断。

## Research References
- [`research/gemini-3.5-flash-thinking.md`](research/gemini-3.5-flash-thinking.md) — Gemini 3.5 Flash minimal/low/medium(默认)/high 档（OpenAI 层 `reasoning_effort` 映射）；"标准"=medium，"轻思考+快"=low；3 系列不能完全关思考；`max_tokens` 被 thinking 蚕食致截断 → 降档+抬 max_tokens。
- [`research/deepseek-v4-thinking.md`](research/deepseek-v4-thinking.md) — DeepSeek v4 仅 thinking on/off（无渐进档）；reasoning 走 `reasoning_content` 不吃 max_tokens；E2 失败是纯延迟；thinking 下 `temperature` no-op。
