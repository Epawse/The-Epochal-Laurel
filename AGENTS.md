# The Epochal Laurel

本仓是「百世流芳」Web 游戏的 owner root，拥有 Next.js 应用、游戏引擎、AI 合同、Supabase migrations
与 Vercel 交付。GitHub 权威为 `Epawse/The-Epochal-Laurel`，生产入口为
`https://epochal-laurel.vercel.app`；`main` 是生产集成分支。

## 开发与验证

```bash
pnpm install
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

按改动风险选择验证：游戏规则/状态至少跑相关 Vitest；UI 改动还要本地浏览器走真实玩法；依赖、路由、
Server Actions 或环境契约改动跑完整四门。`pnpm test:llm` 会消费真实 provider 凭据，仅在明确需要且
密钥已由本地环境提供时运行，不是普通收尾门。

完成权威是测试与生产构建通过；合入 `main` 后还要以 GitHub/Vercel deployment success、部署 SHA 和
生产 URL 读回为准。README、任务状态文本或 agent 叙述不证明上线。

## 工作与接力

- 一次只让一个 writer 写当前 worktree，先确认 branch 与 dirty state；保留用户已有改动。
- 应用、schema、依赖或交付行为变更走独立分支 PR；不改运行时的微小文档可在 clean `main` 直推。
- 连续上下文由当前 harness 的 plan、worktree、subagent 与原生 handoff 承担。真正独立的交接只传一次性
  目标、边界、已有证据与完成/停止信号，不在仓内落 queue、current-state 或 handoff tracker。

## 安全与恢复边界

- `.env.local` 与 Vercel/Supabase/provider secret 不进 Git、不打印；仓内只维护空值 example。
- Supabase migration、生产数据修复、provider/域名/部署配置属于外部状态变更：先准备回滚或备份，再经
  明确任务授权执行；本地 build success 不能替代生产读回。
- 远端 `feat/*`、`fix/*` 与 `wip/*` 分支是开发/恢复资产。不要清理、强推、改写或合并它们，除非任务
  明确点名该分支且已确认保留面；尤其保留现有随机事件、存档修复与 pre-archive 快照。
- 已推送历史不 rebase/force-push；删除 branch、save、Supabase 数据或恢复资产前必须单独确认。

对话和说明默认中文；代码、注释、commit、branch 和技术标识符使用英文。
