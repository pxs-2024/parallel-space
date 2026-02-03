# 平行空间（Parallel Space）

规则驱动的个人资产管理工具：用可视化画布把「物品 / 资产」与「待办」连起来，在需要时提醒你。

> 核心价值：**让“我拥有的东西”，在需要我决策之前提醒我。**

**技术栈**：Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 / shadcn/ui + Prisma（无二进制 + pg adapter）+ PostgreSQL，Session + Argon2 登录，next-intl 国际化（中/英），Vercel Cron 定时生成待办。

---

## 快速开始

```bash
pnpm install
cp .env.example .env   # 配置 DATABASE_URL、DIRECT_URL
pnpm prisma db push
pnpm prisma-generate   # 或依赖 postinstall 自动执行
pnpm dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。未登录访问首页会跳转登录页；注册/登录后即可使用。

可选：`pnpm prisma-seed` 填充示例数据。

---

## 主要功能

### 待办（Todo）

- **入口**：侧栏「待办」。
- 系统按规则生成的待处理事项：**补货**（消耗型数量 ≤ 补货点）、**选择到期时间**（时间型/虚拟型临近到期）、**待丢弃**（消耗型数量为 0）等。
- **操作**：对每条可「补充」「更新到期时间」「确认丢弃」等；处理后会更新资产状态。
- 待办由 **每日定时任务**（Vercel Cron 调用 `/api/cron/process-decisions`）统一生成，进入页面仅拉取数据，不再当场计算。

### 空间（Space）

- **入口**：侧栏「空间」→ 空间列表。
- 登录后若无空间，会自动创建默认空间「我的空间」。
- **新建/修改空间**：列表页「创建空间」或空间卡片右键「修改空间」。
- 进入某个空间后可切换 **画布** 与 **列表** 两种视图。

### 资产（Asset）

- **新建**：空间内「添加资产」，选择类型（静态 / 消耗型 / 时间型 / 虚拟型），填写名称及类型相关字段（补货点、到期日等）。
- **画布**：右上角「移动」进入编辑，拖拽卡片排布后点击「保存」，**一次请求**批量写入位置；与平移/缩放画布互斥。
- **编辑/删除**：卡片操作或右键；删除为软删除。

### 历史（History）

- **入口**：侧栏「历史」。
- 仅展示 **用户操作**（补货、更新、丢弃等）与 **自动消耗** 记录，不包含「打开待办」类流水。

### 账户

- 侧栏「个人资料」：修改用户名等；「密码」：修改密码。
- 登录/注册页左上角有项目简介与语言切换，支持中英文。

---

## 环境与部署

- **数据库**：PostgreSQL；Prisma 使用 `engineType = "client"` + `@prisma/adapter-pg`，无需平台二进制，适合 Vercel 等 Serverless。
- **环境变量**：`DATABASE_URL`、`DIRECT_URL`（见 `.env.example`）。
- **Vercel**：项目内 `vercel.json` 已配置 Cron，每日触发 `/api/cron/process-decisions` 生成待办（具体时间见 `schedule`）。

---

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 开发服务器 |
| `pnpm build` / `pnpm start` | 构建与生产运行 |
| `pnpm type` | TypeScript 检查 |
| `pnpm prisma db push` | 同步数据库 schema |
| `pnpm prisma-generate` | 生成 Prisma Client |
| `pnpm prisma-seed` | 填充种子数据 |

更细的产品说明与规则定义见 [docs/PRODUCT.md](docs/PRODUCT.md)。
