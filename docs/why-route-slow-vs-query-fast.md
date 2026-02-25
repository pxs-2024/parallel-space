# 为什么「查空间物品」很快，但「路由切换」很慢？

## 一、现象

- **查空间的物品**：1s 内完成（单次 DB 查询或带 include 的一次查询）
- **路由切换的接口**：要 7～8s（例如从待办切到空间页）

说明：慢的不是「空间物品」这条查询本身，而是**整次路由请求**在做很多别的事。

---

## 二、路由切换时实际发生了什么（一次请求的完整链路）

当你点击「空间」链接时，浏览器发起的是一次 **RSC（React Server Components）请求**，服务端会**按顺序**做一整套事，然后才把整页数据返回：

```
1. 解析请求、匹配路由
2. 执行根 layout [locale]/layout.tsx
   ├── await params（拿到 locale）
   ├── setRequestLocale(locale)
   ├── await getMessages({ locale })   ← 国际化：加载并解析 messages/zh.json 等
   ├── await getAuth()                ← 鉴权：读 Cookie → Session 查库 → 校验
   └── 开始渲染 children
3. 执行 (authenticated)/layout.tsx
   └── await getAuthOrRedirect()      ← 再次鉴权（通常被 cache 住，不再查库）
4. 执行 spaces/page.tsx
   └── await getSpacesWithAssets()   ← 这里才是「查空间+物品」的那 1 次查询
5. 把整棵 RSC 树序列化成 payload，返回给客户端
```

所以：

- **「查空间物品」**：只是上面第 4 步里那 1 次（或 2 次）DB 查询，所以你能感受到「1s 内」。
- **「路由切换要 7～8s」**：是 **1 + 2 + 3 + 4 + 5 整条链路** 的总时间，而不是单条 SQL 的时间。

---

## 三、7～8 秒更可能花在哪里（不是 schema 的锅）

单条「查空间物品」的 SQL 本身已经很快（1s 内），所以 7～8s 主要来自**请求链路上的其他环节**，而不是「再优化一下 schema」能解决的。

### 1. 开发环境（`pnpm dev`）本身就很慢

- Next 在 dev 下是**按需编译**，每次请求都可能触发编译、HMR、更多日志等。
- 没有生产级的打包与缓存，RSC 序列化、React 渲染都会更重。
- **建议**：用 `pnpm build && pnpm start` 在本地模拟生产再测一次路由切换时间，通常会明显低于 7～8s。

### 2. 冷启动（若部署在 Serverless，如 Vercel）

- 一段时间没人访问后，实例被回收；下一次请求要先**冷启动**：起 Node、加载 Prisma、建 DB 连接等。
- 冷启动经常是 **3～10s** 量级，和「查空间物品」快不快几乎无关。
- 表现就是：**同一路由，第一次打开很慢，再刷新或再切一次就快很多**。

### 3. 整条链路是「串行」的

- 根 layout 里：`getMessages` → `getAuth` → 再渲染子 layout → 再渲染 page → 最后才 `getSpacesWithAssets()`。
- 总时间 ≈ **getMessages 时间 + getAuth 时间 + 子 layout 时间 + 查空间/物品时间 + 序列化时间**。
- 只要其中某一环慢（例如网络、DB 连接建立、或某次未缓存的 getAuth），就会直接加在「路由切换」的体感时间上；而单独测「查空间物品」时，没有前面这些步骤，所以感觉快。

### 4. RSC payload 很大时的序列化与传输

- 空间页会返回：**所有 space + 所有 asset**（含平面图 cells 等）都在 RSC payload 里。
- 数据量大时，**序列化 + 网络传输** 会明显变慢；DB 查 1s，但「把结果变成 RSC 再发回去」可能再占 1～2s 甚至更多。
- 所以「查空间物品」1s」和「路由 7～8s」可以同时成立：查很快，但**整页数据**的生成与下发慢。

### 5. 鉴权与 i18n 的开销（相对次要）

- 每次请求都会：`getAuth()`（Session 查库 + 服务端 hash 校验）、以及 `getMessages(locale)`。
- 当前 session 用的是 **SHA-256**（在 `lib/auth/utils.ts`），不是 Argon2，鉴权本身一般不会到「好几秒」；但若 DB 或网络慢，getAuth 会拖长整条链路。
- messages 文件不大（约 7KB），通常不是 7～8s 的主因，除非有特别重的 i18n 逻辑。

---

## 四、结论：为什么「查空间物品快、路由切换慢」

| 你测到的 | 实际含义 |
|----------|----------|
| 查空间物品 1s 内 | 单次（或合并后的）空间+物品查询本身很快，DB 和 schema 没问题。 |
| 路由切换 7～8s | 整次 RSC 请求 = layout（params、getMessages、getAuth）+ 子 layout（getAuthOrRedirect）+ 页面（getSpacesWithAssets）+ **序列化与返回整棵 RSC 树**；慢的是**整条链路**，而不是「空间物品」这一条 SQL。 |

所以：**数据库 schema 和「查空间物品」这条查询，不是 7～8s 的主要来源**；主要来源更可能是：开发模式、冷启动、串行链路、以及大 payload 的序列化/传输。

---

## 五、Schema 还能做的优化（锦上添花，不是治 7～8s 的药）

你现在的 schema 已经比较合理（有 `userId`、`spaceId`、`isDeleted`、`status`、`type` 等索引）。如果还想再抠一点查询时间，可以考虑：

### 1. 空间页：按 userId 查 space + include assets

- 已有：`Space @@index([userId])`，`Asset @@index([spaceId, isDeleted])`。
- 可选：若经常按「某用户 + 未删除」查所有 asset，可加复合索引，例如：  
  `@@index([userId, isDeleted])` 不在 Space 上（Space 没有 isDeleted）；Asset 上已有 `[spaceId, isDeleted]`，一般够用。  
  若以后有「按 userId 直接查 assets」的 SQL，再考虑在应用层或视图中用 space 的 userId 做联合查询并配合索引。

### 2. 待办 / Action 查询

- 已有：`Action @@index([spaceId, status, dueAt])`、`@@index([type, status, dueAt])`。
- 当前待办页是「按 userId（通过 space） + status OPEN + type in (RESTOCK, NEW_ASSET)」查，现有索引已经能覆盖到，一般不需要为「路由慢」专门改 schema。

### 3. Session 查库

- `Session` 按 `id` 查（主键），已经最优。
- 不需要为「路由 7～8s」在 Session 上再加索引。

### 4. 避免大字段拖慢传输与序列化（比加索引更值得先做）

- `Space.cells` 是 Json，若平面图很大，会拉长 RSC payload。
- 若某些接口只需要「空间列表（id/name 等）」，可考虑**不查 cells** 或单独接口再按需拉 cells，减少首屏 payload，对「路由切换体感」帮助会比再抠一条 SQL 更大。

---

## 六、建议的排查顺序（先搞清楚 7～8s 花在哪）

1. **本地生产模式测一次**  
   `pnpm build && pnpm start`，再测同一次路由切换。若明显小于 7～8s，说明 dev 模式占了大头。

2. **看是否冷启动**  
   若是部署在 Vercel 等：第一次打开慢、第二次快，多半是冷启动；可考虑用 Edge 或常驻实例减轻冷启动。

3. **给链路加简单计时（临时 log）**  
   在根 layout、authenticated layout、spaces page 里各打一个 `console.time/timeEnd`（或用 APM），看：  
   - getMessages / getAuth / getSpacesWithAssets 各占多少；  
   - 序列化/返回是否明显变慢（例如 payload 很大时）。

4. **再考虑 schema**  
   在确认「查空间物品」这条 SQL 在真实请求里也只占 1s 左右、且没有漏索引之后，再按上面「五」做少量索引或拆分大字段，更多是锦上添花，而不是解决「路由 7～8s」的主手段。

---

**一句话**：查空间物品快，是因为那条查询本身简单、索引够用；路由切换慢，是因为一次路由请求 = 整条 RSC 链路（鉴权、i18n、layout、页面查询、序列化），7～8s 主要花在这条链路上（dev/冷启动/串行/大 payload），而不是单条 SQL 或 schema 设计。Schema 可以再小修小补，但先优化链路和部署环境，收益更大。
