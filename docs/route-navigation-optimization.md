# 路由切换慢 — 原因分析与优化方案

## 一、现状与原因

### 1. 无 Loading 状态（影响最大）

- **现象**：点击侧栏/导航后，要等整页 RSC 和接口都完成才看到内容，中间无任何反馈。
- **原因**：`(authenticated)` 及子路由下没有 `loading.tsx`，Next.js 会等 layout + page 全部就绪后再渲染。
- **位置**：`src/app/[locale]/(authenticated)/` 无 `loading.tsx`。

### 2. Layout 阻塞在鉴权

- **现象**：每次切路由都要先等鉴权完成。
- **原因**：`(authenticated)/layout.tsx` 里 `await getAuthOrRedirect()`，会串行执行：
  - `getAuth()` → `getCurrentSession()` → 读 Cookie → `validateSessionToken(token)`（**一次 DB 查询 + 哈希**）
- **结果**：每次导航至少一次 DB 往返，且整棵 layout 树要等这次请求完成才继续。

### 3. 鉴权被重复请求

- **服务端**：layout 里已执行 `getAuthOrRedirect()`。
- **客户端**：Header、Sidebar 使用 `useAuth()`，内部 `useEffect(..., [pathname])` 在**每次 pathname 变化**时再调一次 `getAuth()`（server action）。
- **结果**：一次导航 = 服务端 1 次鉴权 + 客户端可能再 1 次，且 Sidebar/Header 要等这次请求才显示用户状态。

### 4. 页面数据偏重且无流式

- **Spaces 页**：`Promise.all([getSpaces(), getAllSpacesAssets()])`，拉取所有空间 + 所有物品，数据量大。
- **Todo 页**：`getTodoPageData(auth)` + `getSpaces()`，多表查询。
- **原因**：没有用 `Suspense` 做流式渲染，用户要等「layout + 整页数据」全部完成才看到内容。

### 5. 重组件未做按需加载

- **现象**：Spaces 页的平面图（FloorPlanSpacesView、Canvas、Engine 等）都在主 chunk，首屏 JS 体积大。
- **原因**：未使用 `next/dynamic`，所有页面组件都是静态 import。

### 6. 根 Layout 较重

- 根 layout 同步加载：3 套字体（Geist、Geist_Mono、本地）、`getMessages(locale)`、`PixelCanvasBackground`、Sidebar/Header 等。
- 每次请求都会执行 `getMessages` 和字体/背景逻辑，加重首屏与导航时的负担。

---

## 二、优化方案（按优先级）

### 优先级 1：加 Loading UI（立即提升体感）

**目标**：点击链接后立刻出现 loading，再逐步显示真实内容。

**做法**：

1. 在 `src/app/[locale]/(authenticated)/loading.tsx` 增加一个骨架/旋转图标，作为整块认证区的 fallback。
2. 可选：在数据特别重的页面再加一层 loading，例如：
   - `(authenticated)/spaces/loading.tsx`
   - `(authenticated)/todo/loading.tsx`

**效果**：导航时先看到 loading，再替换为页面，体感会明显变快。

---

### 优先级 2：减少客户端重复鉴权

**目标**：Header/Sidebar 不因 pathname 变化就再请求一次 auth。

**做法**：

- **方案 A（推荐）**：在服务端 layout 里拿到 `auth` 后，通过 React Context 或 props 把 `user` 传给 Header/Sidebar（或封装一个 `AuthProvider`），客户端只消费这份数据，不再在 `useAuth()` 里按 pathname 调 `getAuth()`。
- **方案 B**：若暂时保留 `useAuth()`，至少把依赖从 `[pathname]` 改为 `[]`，只在 mount 时请求一次；同时考虑把结果放到 Context，避免多个组件各自请求。

**效果**：每次路由切换少 1 次 auth 请求，侧栏/顶栏不会因 pathname 再闪一次 loading。

---

### 优先级 3：用 Suspense 做数据流式渲染

**目标**：先出页面骨架，再逐步显示重数据，而不是等所有数据一起好。

**做法**：

- 在 Spaces、Todo 等页面，把「依赖接口」的 UI 包在 `<Suspense fallback={…}>` 里。
- 在 fallback 里放表格/列表/平面图占位骨架。
- 数据请求仍在 server component 里做，用 `loading.tsx` + Suspense 双层，让 shell 先出来、重数据后流式替换。

**效果**：可交互的框架先出现，重数据加载不再阻塞整页首屏。

---

### 优先级 4：重页面组件按需加载（next/dynamic）

**目标**：减小首包体积，把平面图等大组件放到单独 chunk，需要时再加载。

**做法**：

- 对 `FloorPlanSpacesView`（或整块 Spaces 页内容）使用 `next/dynamic(..., { loading: () => <SpacesSkeleton /> })`。
- 其它类似的大块客户端组件（如 Todo 页里较重的面板）也可按需 dynamic import。

**效果**：首屏 JS 更小，切到对应路由时再加载大组件，与数据请求可并行。

---

### 优先级 5：会话校验做短时缓存（可选）

**目标**：同一用户短时间内的多次导航不每次都打 DB。

**做法**：

- 在 `validateSessionToken` 或调用它的上层（如 `getAuth`）外再包一层内存缓存（如 `node-cache` 或 Map），key 为 token 或 sessionId，TTL 约 10–60 秒。
- 注意：登出或改密码时要能失效该缓存（例如登出时删 key 或缩短 TTL）。

**效果**：同一会话内连续切路由时，部分请求可命中缓存，减少 DB 压力与延迟。

---

### 优先级 6：根 Layout 与 i18n 的轻量化（可选）

**目标**：减少每次请求在根 layout 上的耗时。

**做法**：

- 对 `getMessages` 使用 `unstable_cache` 或等价缓存，避免每次请求都重新解析/读取。
- 字体：确认只在实际用到的路由加载必要字体，或使用 `display: swap` 等减少阻塞。
- `PixelCanvasBackground`：若不影响首屏关键路径，可考虑 lazy 或降低优先级。

**效果**：根 layout 更快，有利于所有页面的首次渲染与导航。

---

## 三、建议实施顺序

| 步骤 | 项           | 预估工作量 | 体感提升 |
|------|--------------|------------|----------|
| 1    | 添加 loading.tsx（认证区 + 可选 spaces/todo） | 小 | 高 |
| 2    | 用 Context/单次请求消除 useAuth 重复请求      | 中 | 中高 |
| 3    | 重数据用 Suspense 流式渲染                   | 中 | 中 |
| 4    | FloorPlanSpacesView 等 next/dynamic          | 小 | 中 |
| 5    | 会话短时缓存（可选）                          | 小 | 中（高并发时更明显） |
| 6    | 根 layout / i18n 轻量化（可选）               | 中 | 中低 |

建议先做 **1 + 2**，再按需做 3、4；5、6 视 DB 压力和首屏指标再考虑。

---

## 四、相关文件索引

- Layout 鉴权：`src/app/[locale]/(authenticated)/layout.tsx`
- 鉴权实现：`src/features/auth/queries/get-auth-or-redirect.ts`、`get-auth.ts`
- 会话校验（DB）：`src/lib/auth/session.ts` 中 `validateSessionToken`
- 客户端鉴权：`src/features/auth/hooks/use-auth.ts`
- 使用 useAuth：`src/app/_navigation/header.tsx`、`src/app/_navigation/sidebar/components/sidebar.tsx`
- 重页面：`src/app/[locale]/(authenticated)/spaces/page.tsx`、`todo/page.tsx`
- 平面图组件：`src/features/space/components/floor-plan-spaces-view.tsx`
