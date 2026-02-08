# 平行空间（Parallel Space）— 产品文档（MVP）

## 1. 产品定位

**平行空间**是一款以「规则驱动的个人资产管理」为核心的工具，用一个可视化画布把现实世界中的**物品 / 抽象资产**与**未来需要做的决策**连接起来。

> 核心价值：**让“我拥有的东西”，在需要我决策之前提醒我。**

## 2. 目标用户

- 注重秩序与可控性的个人用户
- 有较多实体 / 虚拟资产需要管理的人
- 技术背景用户（工程师 / 设计师 / 自由职业者）

## 3. 核心概念

### 3.1 Space（空间）

- MVP 中**空间**即管理作用域：所有资产（Asset）与行为（Action）都挂在 Space 下，归属当前用户。
- 用户可创建多个空间（如「书房」「厨房」），每个空间有独立画布与物品列表。
- 侧栏入口命名为**物品管理**（原「空间」），进入后为空间列表；无嵌套（Space 下不再挂子 Space）。

### 3.2 Asset（资产 / 物品）

**定义**：需要被记住、并可能触发决策的现实存在。

**类型（Kind）**

- `STATIC`：静态（书籍、设备等）
- `CONSUMABLE`：消耗型（洗发水、文具等，支持数量、单位、补货点、周期消耗）
- `TEMPORAL`：时间型（滤芯更换、保养等，支持 nextDueAt）
- `VIRTUAL`：虚拟型（会员、域名等，支持 refUrl、expiresAt）

**生命周期状态（State）**

- `ACTIVE`：在用
- `PENDING_RESTOCK`：待补充（数量 ≤ 补货点）
- `PENDING_DISCARD`：待废弃（数量为 0）
- `ARCHIVED`：已归档
- `DISCARDED`：已废弃

**能力字段（按类型）**

- 消耗型：数量（quantity + unit）、补货点（reorderPoint）、消耗周期（consumeIntervalDays / consumeAmountPerTime）
- 时间型：nextDueAt、lastDoneAt
- 虚拟型：refUrl、expiresAt
- 通用：软删除 isDeleted；忽略/提示相关 snoozeUntil、openPromptActionId；画布位置 x/y、宽高 width/height、卡片样式 cardColor/cardOpacity

> Asset 描述「是什么」；画布上的位置由 Asset 的 x / y 表示，不单独建 Placement 模型。

### 3.3 摆放（画布坐标）

- Asset 的 **x / y** 为当前空间画布上的逻辑坐标；可选 width/height。
- 拖拽结束后批量持久化到 Asset；Seed 中按网格（步长 184、每行 6 个）生成初始布局，避免重叠。

### 3.4 物品管理页与画布

- **物品管理**页：空间列表（可拖拽排序）、新建/编辑空间；进入某空间后为主画布。
- 画布下方可拉出**底部抽屉**，展示该空间物品列表与详情；抽屉高度超过阈值时**顶部空间条**滑出，便于切换空间。
- 右侧可打开**全局物品搜索**（筛选、分页、跳转至空间）。

## 4. 规则与行为（Rules → Action）

### 4.1 设计原则

- 规则以代码实现、基于资产类型与字段，非用户可配置的表达式。
- 规则只负责**生成待处理 Action**，不自动改资产；用户是最终决策者。

### 4.2 MVP 已实现规则

1. **消耗型自动消耗**：按 consumeIntervalDays / consumeAmountPerTime 周期扣减数量，并写入 AUTO_CONSUME 记录；数量归零时置 PENDING_DISCARD 并生成 DISCARD 类 Action；数量 ≤ reorderPoint 时置 PENDING_RESTOCK 并生成 RESTOCK 类 Action。
2. **消耗型补货提醒**：数量 ≤ reorderPoint 且未在 snooze 且无未处理提示时，生成 RESTOCK 类 Action。
3. **到期 / 即将到期提醒**：TEMPORAL 的 nextDueAt、VIRTUAL 的 expiresAt 已过或临近（如 7 天内）时，生成 REMIND 类 Action。
4. **待丢弃**：消耗型数量为 0 时生成 DISCARD 类 Action，由用户确认丢弃或忽略。

未在 MVP 中实现：定期检查（CHECK）、长期未使用（REVIEW）等可配置规则，预留扩展。

### 4.3 Action 类型与状态

- **类型**：`AUTO_CONSUME`（系统消耗）、`RESTOCK`（补货）、`REMIND`（到期/提醒）、`DISCARD`（丢弃）。
- **状态**：`OPEN`（待处理）、`DONE`（已完成）、`SKIPPED`（已忽略）、`DISCARDED`（已确认丢弃）。

## 5. 行动中心（待办页）

### 5.1 行为定义

- Action 为规则触发后的**待处理决策**，用户可「补充（填数量）」「选择到期时间」「确认丢弃」「忽略（一天/一周/一月）」或从建议创建为待处理行为。
- 不自动执行；用户手动确认后更新 Asset 状态并关闭或忽略 Action，操作后有 Toast 提示。

### 5.2 MVP 实现

- **待办页**：合并「待确认行为」与「建议创建的行为」，支持搜索、按类型/时间筛选（nuqs 同步 URL）、批量忽略；列表内决策后条目上浮过渡。
- **历史记录页**：按时间展示 Action 历史（用户操作与自动消耗）。

## 6. 画布（Canvas）

### 6.1 设计目标

- 认知空间的可视化，非物理仿真。

### 6.2 MVP 交互

- 无限画布（Pan / Zoom），Asset 卡片可拖拽；拖拽结束后批量持久化 x / y 到 Asset。
- 底部抽屉：空间内物品列表与详情，支持移动至其他空间、删除、保存布局；与顶部空间条联动（高度阈值内不重叠）。
- 全局搜索：右侧悬浮入口，打开后面板支持筛选、分页、跳转空间。

### 6.3 技术实现

- DOM + CSS transform 表示世界坐标；dnd-kit 实现拖拽与空间排序；世界坐标持久化，视口状态独立。

## 7. 权限与多人（非 MVP）

- **当前**：单人；所有 Space / Asset / Action 归属当前用户。
- **未来**：Space → Workspace、Membership、轻实时同步等，当前不实现。

## 8. 技术栈（MVP）

- **Next.js**（App Router）、**TypeScript**
- **Tailwind CSS 4 + shadcn/ui**（含 Calendar、Popover、Dialog、Drawer 等）
- **Prisma + PostgreSQL**（engineType client + @prisma/adapter-pg，适合 Serverless）
- **自定义 Session + Argon2**（@node-rs/argon2）实现账号密码登录
- **next-intl**（国际化）、**nuqs**（URL 状态）、**next-themes**（主题）
- **dnd-kit**（画布拖拽、空间列表排序）
- **sonner**（Toast）、**date-fns + react-day-picker**（日期选择）

## 9. 种子数据（Seed）

- 用户 2、空间 8、资产百余、Action 百余。
- 资产按**网格布局**生成（卡片 160×160、间距 24、每行 6 个），避免重叠；每空间含静态、消耗型、时间型、部分虚拟型，并生成历史与 OPEN 待办，便于日常测试。

## 10. MVP 完成标准（与当前实现对齐）

- [x] 用户可注册 / 登录（Session + Argon2）
- [ ] 登录后自动创建默认 Space（当前未实现；用户需手动创建空间）
- [x] 可创建 / 编辑 / 删除（软删除）Asset；可筛选状态（含已归档）
- [x] Asset 具备规则所需字段（补货点、周期消耗、到期等），规则在代码中应用并生成 Action
- [x] 规则正确生成 OPEN RESTOCK / REMIND / DISCARD 及建议创建项
- [x] 待办页可处理 Action 并更新 Asset 状态（含 Toast、日历选择到期）
- [x] Asset 可在空间画布中拖拽并保存 x / y；Seed 支持网格布局
- [x] 物品管理页：空间列表排序、底部抽屉、顶部空间条、全局搜索

---

（本产品文档与当前代码实现对齐，可在不破坏模型的前提下持续演进。）
