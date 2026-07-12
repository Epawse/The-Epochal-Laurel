# 叙事记录区与 AI 等待状态辨识

## Goal

把每日循环（及考试/继承等）的叙事呈现，从「单行、每回合被覆盖的 `NarrativeStrip`」升级为**可回溯的叙事/日程记录区**（galgame backlog 式或现代流畅时间线），并让 **生成中 / 已结算 / 平稳回合** 三态视觉可辨——解决玩家「分不清在等 AI 还是刚过了一桩事件」的核心体验落差。这是 06-04-ai 之后用户最在意、尚未实现的核心构想（优先级 A/B 显示先于 C 延迟）。

## What I already know（源码 + spec 核对）
- **现状** `components/game/NarrativeStrip.tsx`（28 行）：单行 = 红"叙"戳 + `text` + `timestamp`，`min-h-14`；`play/page.tsx` 用**单条** `narration` state，`setNarration` 每次**覆盖**（零历史）。
- **play 布局**：TopBar + 3 列 grid（320 | 1fr | 320）。中列 = 5 action cards + `NarrativeStrip` + 18px 的"推演中/AI润色中"指示。
- **叙事来源散布**：行动 narration（模板）、NPC 对话（N1）、事件描述 + 选项 narrative_hint + 骰子 tier、考试 `ResultOverlay` narration、殿试、继承、era 转换。
- **三态现有信号**：`turnPending`（推演中）/ `eventPending`（事件 loading shell）/ `followupPending`（AI润色中）；事件与考试结果走 overlay。
- **动效约定**（motion-patterns.md）：Framer Motion 为主；**禁止 animate height/layout**（只用 transform+opacity）；新条目入场用 `AnimatePresence`；`prefers-reduced-motion` 必须支持（`hooks/useReducedMotion.ts` 已有）。
- **状态**：React `useState` + `sessionStorage`（`useSessionJSON`），无 Zustand。
- 用户原话：要「类似 galgame 历史记录 / 更现代、流畅的日程记录区域」。

## Open Questions
- ✓ Q1（形态/位置）→ **方案 A：中列内联时间线**（**固定 height**、最新在顶部、新条目从顶部淡入、向下滚动看更早历史、无需 auto-scroll）。B 的大容量 backlog 留作后续增强。
  - 浏览器实测修订（方案 A 滚动方向）：原「max-h + 最新在底 + auto-scroll」让容器随条目长高抖动、且玩家上翻历史时被新条目硬拉回底 → 改为**固定 height + 反转（最新在顶）+ 去 auto-scroll**。`entries` 数组仍保持 append 顺序（旧→新），仅在渲染时倒序（不改 helper/数据流）。
- ✓ Q2（粒度+内容）→ **每回合一条 + 视觉分层**：平稳回合紧凑单行，事件/考试/NPC/继承为富条目。字段：时间(季·年) + 类型图标 + 正文 (+ 骰子 tier / stat delta / 标题)。
- ✓ Q3（三态视觉）→ **生成中就地占位 + 原地替换**（shimmer 骨架在流底，AI 返回淡入替换）。配色：平稳灰调紧凑单行 / 已结算富条目左边框类型色（事件朱·考试金·NPC玉·继承金）/ 生成中 shimmer+脉冲点。事件交互仍走 EventModal，结算后摘要入流。
- ✓ Q4（持久化+范围）→ **sessionStorage 全会话累积 + 上限 ~200**（`useSessionJSON("narrative_log")`；跨回合/考试/继承累积、刷新保留、换代不清空插分隔条目；不写 DB save）。范围=全链路。

## Requirements (evolving)
- 【Q1✓】中列**内联叙事时间线**替代单行 `NarrativeStrip`：**固定 height**（高度恒定、不随条目增减抖动）、最新条目在**顶部**、新条目从**顶部**淡入（transform+opacity，禁 animate height）、向下滚动回溯更早历史、无需 auto-scroll。始终可见。
- 【Q2✓】**每回合一条 + 视觉分层**：平稳回合紧凑单行；事件/考试/NPC/继承为富条目（类型图标 + 标题 + 正文 + 骰子 tier / stat delta）。字段：时间(季·年) + 类型图标 + 正文。
- 可回溯：过往叙事不被下一回合覆盖。
- 【Q3✓】三态视觉：**平稳**=灰调紧凑单行（bone-dim + 行动图标 + 时间，无边框）；**已结算**=富条目 + 左边框类型色（事件朱/考试金/NPC玉/继承金）+ 标题 + 骰子 tier/stat delta；**生成中**=流底 shimmer 骨架 + 脉冲点，AI 返回后原地淡入替换。随机事件交互仍走 `EventModal`，结算后摘要入流。
- 【Q4✓】**sessionStorage 全会话累积**：`useSessionJSON("narrative_log")` 存 `NarrativeEntry[]`，跨回合 + 考试/继承页累积、刷新保留、换代不清空（插"世道更替/继承"分隔条目）；上限 ~200 超出丢最旧；**不写 DB save**。范围=全链路（行动/事件/考试/NPC/继承/era 入流）。
- 【Q5✓·实测连带：play 呈现层完善】方案 A，纯前端读 `GameState` 展示（不改 server actions / lib / schema）：
  - **三列底部对齐**：play grid `items-stretch` + 各列 flex 撑满到同一底边（中列 timeline 已固定 height；左列 `mt-auto` 注脚、右列圣意卡 `xl:flex-1` 撑底）。
  - **左列"持有·加成"面板**（新组件 `components/game/HoldingsPanel.tsx`）：展示 `character.relics`（稀有度色点 common灰/rare玉/legendary金 + 名称 + 效果类型 + hover flavor + 传家标记）、`character.skills`（被动/主动 chip + 冷却）、`character.modifiers`（label + 剩余季，正绿负朱·保守启发式·不确定取中性）、`character.status_effects`（禁考/丁忧 + 剩余季，朱）、`character.traits`（chip）、`world.world_modifiers`（世道加成）。空类不显示；全空显「暂无…」。复用 chip/border 样式 + design-tokens（无新资源）。
  - **去掉左列废占位**：原 dashed「辅助」面板的「小抄/夹带」「榜眼引路」「恩师引荐」灰字占位（实为考试页工具）移除，收成一行小注「科场另备小抄·榜眼·恩师」。
  - **商店入口优化**：「钱庄暗柜」从孤零文字按钮 → 明确商店入口（算盘 glyph + 标题 + 「以银钱易奇物」说明 + wealth<15 时 disabled 明示「银两不足（需15）」），作持有面板顶部 CTA。

## Acceptance Criteria
- [ ] 中列出现**固定 height**的叙事时间线（高度恒定、不抖动），最新条目在**顶部**，新条目从**顶部**淡入（transform+opacity，非 height），向下滚动回溯历史，无 auto-scroll。
- [ ] 平稳行动 = 紧凑单行；事件/考试/NPC/继承 = 富条目（类型图标 + 标题 + 正文 + 骰子 tier / stat delta）。
- [ ] 生成中显示 shimmer 占位条目，AI 返回后原地替换为正式条目（事件交互仍走 `EventModal`，结算摘要入流）。
- [ ] 历史跨回合保留、跨考试/继承页累积、刷新不丢（sessionStorage `narrative_log`），上限 ~200。
- [ ] 动效遵循 motion-patterns（transform+opacity、`AnimatePresence`、`prefers-reduced-motion` 经 `useReducedMotion`）。
- [ ]【Q5】play 三列底部对齐（`items-stretch` + 各列撑底，不再参差）。
- [ ]【Q5】左列出现"持有·加成"面板，展示 relics/skills/modifiers/status_effects/traits/world_modifiers（空类隐藏，全空显「暂无」），纯读 `GameState`、不改 server/lib/schema。
- [ ]【Q5】左列移除「小抄/榜眼/恩师」灰字占位（收为一行小注）；「钱庄暗柜」成为明确商店入口（图标 + 说明 + 银两不足 disabled 明示）。
- [ ] `pnpm typecheck` / `pnpm test` / `pnpm lint` 绿；新组件（NarrativeTimeline + HoldingsPanel）登记 component-catalog。

## Definition of Done
- 测试/类型/lint 绿；动效与 reduced-motion 合规。
- 行为变化记入 frontend spec（component-catalog / screen-map 的 play 中列）。

## Out of Scope
- C：延迟/预取命中率优化（zero-wait 任务 + 06-04-ai 已分别处理）。
- 不改 AI 契约 / server actions 的叙事**内容生成**（只改前端**呈现层**）。

## Technical Approach
- **数据结构** `NarrativeEntry`：`{ id, kind: "action"|"event"|"exam"|"npc"|"inherit"|"era"|"pending", season, text, title?, dice?, delta?, status: "settled"|"pending" }`。
- **状态**：`useSessionJSON<NarrativeEntry[]>("narrative_log")` + helper（append / replace-pending-by-id / cap ~200 丢最旧）。
- **组件**：`NarrativeStrip` → 升级为 `NarrativeTimeline`（**固定 `height`** + `overflow-y`、**反转最新在顶 / 无 auto-scroll**、`AnimatePresence` 新条目从顶部入场）+ 单条 `NarrativeEntry` 渲染器（按 `kind` 走紧凑/富样式）。滚动条美化：滚动容器引用 globals.css 的 `.narrative-scroll` —— 隐藏原生滚动条（webkit `::-webkit-scrollbar{display:none}` + Firefox `scrollbar-width:none`）+ 顶/底 `mask-image` 渐隐遮罩暗示可滚（贴水墨/paper 主题，纯样式）。
- **play 数据流**：`narration` 单条 → append 条目；pending event → 先 append `pending` shimmer 条目、`generateEventForTurn` 返回后 replace 为 `event` settled；NPC 同理（pending→settled）；avoid 与 `EventModal` 重复。
- **跨页**：考试页 `submitExamAnswer` 后把 `exam` 结果写入 `narrative_log`；inherit/era 同理 → play 读回。
- **动效**：transform+opacity，禁 animate height；reduced-motion 即时切换。

## Decision (ADR-lite)
- **Context**：单行 `NarrativeStrip` 覆盖式，玩家分不清"等 AI / 刚过事件 / 平稳回合"，且无法回溯。
- **Decision**：中列内联时间线（Q1-A）+ 每回合一条·视觉分层（Q2-A）+ 生成中就地占位·原地替换（Q3-A）+ sessionStorage 全会话累积·上限 200（Q4-A）。**纯前端呈现层**。
- **Consequences**：不改 AI 契约/server actions 的**内容生成**，只重构呈现；`narrative_log` 存 sessionStorage 不进 `GameState` save；考试/继承页需写同一 log key（轻度跨页耦合）；事件仍走 `EventModal`，时间线放结算摘要（须防重复）。

## Technical Notes
- 改造核心：`components/game/NarrativeStrip.tsx`（升级/替换）+ `app/(game)/play/page.tsx`（`narration` 单条 → 记录数组 + 三态标记）。
- 动效：Framer Motion + `AnimatePresence`，transform+opacity，禁 animate height。
- 持久化候选：`useSessionJSON`（与 `game_state` 一致）。
