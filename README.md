# 百世流芳 (The Epochal Laurel)

AI 驱动的世代科举模拟游戏。玩家扮演一个家族，历经数代人参加科举考试、经营人脉、应对朝堂风云，追求百世流芳。

## 核心玩法

- **世代传承** — 每一代角色有独立的属性（学识、气运、意志、财富），死亡后由后代继承家族遗产
- **科举晋升** — 从县试到殿试，逐级攀升，考试难度随朝代风格动态调整
- **随机事件** — AI 实时生成叙事事件（机遇、灾祸、社交、政治），玩家通过选择或自由输入应对
- **朝堂博弈** — 皇帝性格、朝廷文风影响考试偏好和事件走向
- **Roguelike 深度** — 遗物系统、阴谋暴露、NPC 对话等机制增加重玩性

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS 4 + Framer Motion |
| 状态 | Zustand + SessionStorage 持久化 |
| 后端 | Next.js Server Actions |
| 数据库 | Supabase (PostgreSQL + RLS) |
| AI | OpenAI 兼容多 Provider（DeepSeek / Gemini） |
| 部署 | Vercel |

## 本地开发

```bash
pnpm install
cp .env.example .env.local  # 填入 Supabase 和 AI provider 密钥
pnpm dev
```

### 环境变量

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 |
| `GEMINI_API_KEY` | Gemini API 密钥 |

### 常用命令

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 生产构建
pnpm typecheck    # 类型检查
pnpm lint         # ESLint
pnpm test         # 运行测试
pnpm test:llm     # 测试 LLM 调用
```

## 项目结构

```
app/(game)/         # 游戏页面路由
  create/           # 创建角色
  play/             # 核心游戏循环
  palace/           # 殿试
  leaderboard/      # 排行榜
  inherit/          # 世代继承
components/game/    # 游戏 UI 组件
lib/
  actions/          # Server Actions
  ai/              # AI 调用、prompt、schema
  engine/          # 游戏状态 reducer
  game/            # 游戏常量、类型、计分
supabase/          # 数据库迁移
```

## 设计理念

- **零等待体验** — AI 事件预生成，玩家操作时无需等待 LLM 响应
- **匿名游玩** — 无需登录，扫码即玩（Hackathon 演示场景）
- **中式美学** — 水墨风 UI，宋体/楷体排版，古典配色

## License

Private — Hackathon project.
