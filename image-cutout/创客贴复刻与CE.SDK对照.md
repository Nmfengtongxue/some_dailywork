# 创客贴复刻（yft-design）与 IMG.LY CE.SDK 抠图编辑器对照

整理日期：2026-11-09  
范围：本地已经在用的两套「在线画布」，以及它们和日常工作工具里喜报生成的关系。  
结论先看第 1 节，细节从第 2 节起。

---

## 1. 一句话结论

这不是同一类产品，也**不该合成一个编辑器**。

| 项目 | 本质 | 该当什么 |
| --- | --- | --- |
| **yft-design**（创客贴复刻） | 自有源码的中文海报工作台：Fabric.js 画布 + PSD/PDF + 模板化潜力 | **主排版台**：喜报、海报、展板、批量套版、公司资产 |
| **IMG.LY CE.SDK**（`image-cutout/`，large） | 商业设计 SDK + 浏览器端 ISNet 抠图 | **高质量抠图与自由设计试验台**，不要当公司业务主入口 |
| **喜报生成**（`congrats-generator.html`） | 按创客贴交互做的业务页：名单、头像、膳食中心模板 | **业务闭环**，继续独立；抠图用库，不必整页换成 CE.SDK |

取长补短的正确姿势：**抠图用 IMG.LY 的模型，排版和公司模板用 yft / 喜报页。**

---

## 2. 两边分别是什么

### 2.1 创客贴复刻：yft-design

本地路径：

```text
/Users/Apple/Downloads/2026-05-09  日常工作/2026-08-25 网页剪辑与设计工具/yft-design
```

- 来源：[dromara/yft-design](https://github.com/dromara/yft-design)，自称开源版稿定设计。
- 2026-08-26 已按**创客贴类产品**做过审计：`yft-design/docs/product-audit-and-roadmap.md`。
- 技术栈：Vue 3、Fabric.js 6、Pinia、Element Plus、Vite。许可证 **MIT**。
- 本地已补：浏览器端 `ag-psd` **导出分层 PSD**（不依赖官方后端）。
- 启动（官方说明）：`pnpm install && pnpm dev`，本机曾用过 `http://localhost:5174`。

已有能力（审计原文归纳）：

- 多页、标尺、参考线、吸附、图层、分组、布尔运算。
- 文字、图片、形状、表格、二维码、条码。
- 裁切、蒙版、滤镜、描边、阴影。
- **抠图**：右侧「抠图」打开 `ImageMatting`（可手涂修补）；自动抠图走后端 `POST /api/design/matting/file`（`universal` / `people`）。
- 导入 PSD / PDF / SVG；导出图 / SVG / PDF / PSD / JSON。
- 模板、Pixabay、AI 文案/配图入口、中英切换。

短板也写在那份审计里：首页入口、自动保存、模板检索、批量套版、上下文工具栏、云文档。编辑内核 4/5，易用性和闭环只有 2/5。

同目录还有 **poster-studio（乔木画布）**：更偏小红书封面 + AI 生图 + Remove.bg，不是创客贴复刻，本文不把它当对照主体。

日常工作仓库里的 **喜报生成** 只复刻了创客贴的**交互习惯**（选中开面板、⌘Z、空格拖画布、Ctrl 滚轮缩放），不是完整创客贴。它已经接了 `@imgly/background-removal` 的 **medium（isnet_fp16，约 80MB）** 做头像一键抠图。

### 2.2 IMG.LY CE.SDK large：`image-cutout/`

本地路径（本仓库，未上线）：

```text
some_dailywork-master/image-cutout/
启动：./start.sh → http://127.0.0.1:5178/
```

- 官方 CE.SDK 1.85.3 + `@imgly/plugin-background-removal-web`。
- 抠图：浏览器 WASM / WebGPU，模型 **large = isnet**，约 **176MB**，首次从 `cdn.img.ly` / `staticimgly.com` 拉取。
- UI 对齐官方：模板、元素、上传、图片、文字、形状、贴纸、图层、撤销、缩放、导出图片/PDF、选中后「去除背景」。
- 中英切换是本地加的。
- 无 license 时导出带 **IMG.LY 水印**（评估模式）。插件许可证是 **AGPL-3.0**，CE.SDK 本身要商业授权才能无水印商用。

---

## 3. 逐项对比

| 维度 | yft-design（创客贴复刻） | CE.SDK large（本仓库） |
| --- | --- | --- |
| 产品定位 | 中文在线设计台，可长成「公司自己的创客贴」 | 嵌入式商业编辑器 + 一键抠图演示 |
| 画布引擎 | Fabric.js，对象模型自己控 | IMG.LY CreativeEngine（自研 scene） |
| 抠图 | 手涂修补强；自动抠依赖**远程 API**，本地默认不通 | **本地 ONNX**，人像/物体边缘在 large 上明显更好 |
| 首次体积 | 编辑器本身；抠图不强制下模型 | CE.SDK 资源 + **176MB** 模型 |
| 离线 | 画布可离线；自动抠图不行 | 模型缓存后可离线抠；仍依赖 CDN 资源除非自托管 |
| 中文与交互 | 原生中文，接近创客贴信息架构 | 官方英德为主，本地补了常用中文 |
| 模板 / 素材 | 可塞公司喜报、展板、字体、头像库 | 官方 demo / premium 源，和公司业务无关 |
| PSD / PDF | **导入还原 + 分层导出**，这是相对创客贴的差异化 | 设计编辑为主，不是 PSD 工作流 |
| 批量 / 业务 | 审计已规划 CSV 套版、改尺寸、品牌锁定；喜报页已有名单逻辑 | 没有名单、没有膳食中心模板、没有批量头像 |
| 导出商用 | MIT，导出无第三方水印 | 评估水印；商用要买 CE.SDK license |
| 定制成本 | 源码在自己手里，改面板、接 Excel、接 CloudBase 都合理 | 只能走 plugin / asset source / i18n，业务字段很难嵌进去 |
| 工程质量 | 功能全但散，缺测试和保存闭环 | 官方 UI 完成度高，自己几乎不用画界面 |
| 法律 | MIT，注意模板/字体版权仍要自己管 | AGPL 插件 + 专有 SDK，上线前必须过授权 |

抠图原理不在一个层级：

- yft 自动抠：把图 POST 到 `yft.design` 或自建 matting 服务，返回 PNG + mask。
- CE.SDK：`@imgly/background-removal` 在浏览器跑 ISNet，`small/medium/large` 对应量化 / fp16 / 全精度；喜报页已经用过 medium。

---

## 4. 谁长、谁短

**yft 该保留的长处**

1. 源码和数据在自己这边，能接公司花名册、头像库、喜报底图、CloudBase。
2. PSD/PDF 进出，适合「外面用创客贴/PS 出的稿，进来改字改图」。
3. 手涂抠图：头发丝、半透明、自动抠错的地方可以修。
4. MIT，批量出图、内网部署没有水印和 AGPL 包袱。
5. 已经有一份对着创客贴的产品路线，方向不是再堆滤镜。

**yft 的短处（CE.SDK / IMG.LY 能补）**

1. 一键抠图质量、稳定性不如 large ISNet；没自建后端时自动抠等于不可用。
2. 画布手感、吸附、官方素材库、开箱即用的「选中 → 去除背景」不如 CE.SDK。
3. 保存、首页、模板检索还没按审计做完。

**CE.SDK 该保留的长处**

1. 抠图效果（尤其人像、复杂边缘）和官方编辑器完成度。
2. 不用自己实现 dock / undo / export / layers。
3. 和喜报页已经用的 `@imgly/background-removal` **是同一条技术线**，只是这里用 large、喜报用 medium。

**CE.SDK 的短处（yft / 喜报能补）**

1. 评估水印、授权、AGPL，不能当公司对外出图的默认引擎。
2. 接不进「选人、填金额、膳食中心单位、批量 ZIP」。
3. 首次 176MB，内网或弱网不友好；CDN 被拦就起不来。
4. 场景 JSON 和 Fabric JSON / PSD 不互通，迁作品成本高。

---

## 5. 结合方式（按推荐顺序）

原则：**引擎不要合并，能力要串起来。** 把 CE.SDK 整页嵌进 yft，或把 yft 重写成 CE.SDK，都是高成本、低收益。

### 方案 A（优先）：流水线，而不是一个 App

```text
照片 / 证件照
    → IMG.LY 抠图（喜报页 medium，或 image-cutout large，或只调库）
    → 透明 PNG
    → yft 排海报 / 喜报页套模板 / 导出 PNG·PDF·PSD
```

适合现在：两套都已经能跑，不用改架构。large 只给难抠的人像、商品、宠物；日常头像继续 medium。

### 方案 B（高价值）：yft 的「抠图」按钮改走本地 IMG.LY

把 `ImageMatting` 里对 `/api/design/matting/file` 的调用，换成已验证的：

- `@imgly/background-removal`（与喜报 `cutout.bundle.js` 同一套）
- 默认 **medium**，难例再切 **large**
- 自动抠完仍进入现有手涂修补，不扔掉 yft 的修边缘

这样创客贴复刻得到「能离线用的一键抠图」，CE.SDK 页面可以继续当官方 UI 对照，不必当生产入口。

注意：该 npm 包是 AGPL。只在**内网 / 本地工具**用，和对外 SaaS 不是同一风险；若 yft 以后要公开部署，需要单独过一遍授权。

### 方案 C：喜报页继续用库，不要换 CE.SDK 壳

喜报的价值是模板几何、名单、单位、CloudBase 资源映射。CE.SDK 做不好这些。保持：

- 头像一键抠图 = IMG.LY medium（已上）
- 难抠个案 = 先在 `image-cutout` 用 large，再把 PNG 丢回喜报 / yft

### 方案 D（不要做）

- 用 CE.SDK 重做喜报、重做创客贴。
- 把 yft 和 CE.SDK 画布对象互相实时同步（scene ≠ Fabric JSON）。
- 未买 license 就把 CE.SDK 导出图当正式宣传品。

### 和乔木画布 poster-studio

poster-studio 擅长 AI 生图和社媒比例。生图结果同样应先落地成 PNG，再进 yft 或喜报。去背景优先统一到 IMG.LY，少维护 Remove.bg Key。

---

## 6. 和日常工作工具怎么摆

```text
日常工作工具
├── 图像处理 / 图片分割、水印、批量底图
├── 喜报生成          ← 业务套版 + medium 抠头像
├── IMG.LY 抠图编辑器 ← 本仓库 image-cutout，large，仅本地预览
└── （仓库外）yft-design ← 创客贴向海报台，PSD/PDF/批量的主位

外部素材
└── 创客贴网站导出的 PNG/PDF  → 可进 yft 再改，或当喜报底图
```

建议职责：

| 你要做的事 | 用哪个 |
| --- | --- |
| 改业绩数字、换头像、出膳食中心喜报 | 喜报生成 |
| 把头像扣干净 | 喜报一键抠图；扣不好再去 CE.SDK large |
| 做新海报、改 PSD、导出分层给印刷 | yft-design |
| 对照官方「去除背景」交互、试 large 效果 | `image-cutout` |
| 小红书封面 + 文生图 | poster-studio，成品再进 yft |

---

## 7. 若继续投入，建议顺序

1. **不改架构**：难抠图走 `http://127.0.0.1:5178/`，PNG 再进喜报或 yft。验证 large 是否值得给全员用。
2. **抽公共抠图模块**：以喜报已有的 `congrats-assets/cutout.bundle.js` 为准，给 yft「抠图」按钮和 image-cutout 共用同一 API（`removeBackground` + 进度条 + GPU/CPU 回退）。
3. **yft 按原审计做保存和首页**，不要把精力花在模仿 CE.SDK 的 dock。
4. 只有确认要无水印、长期嵌 CE.SDK，再谈 license；否则生产出图以 yft / 喜报 / 纯 imgly 库为准。

---

## 8. 相关路径速查

| 说明 | 路径 |
| --- | --- |
| 创客贴复刻 | `…/2026-08-25 网页剪辑与设计工具/yft-design` |
| 创客贴向产品审计 | `yft-design/docs/product-audit-and-roadmap.md` |
| 乔木画布 | `…/2026-08-25 网页剪辑与设计工具/poster-studio` |
| CE.SDK large | `some_dailywork-master/image-cutout/` |
| 喜报 + medium 抠图 | `some_dailywork-master/congrats-generator.html`、`congrats-assets/cutout.bundle.js` |
| 本对照文档 | `some_dailywork-master/image-cutout/创客贴复刻与CE.SDK对照.md` |
