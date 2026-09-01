# 公司日常管理工具集

一组无需后端、可直接部署到静态站点的办公工具。Excel、图片和人员数据主要在浏览器本地处理。

## 工具导航

| 页面 | 用途 | 主要依赖 |
| --- | --- | --- |
| `regional-statistics.html` | 区域宣发数据筛选、转发统计和导出 | SheetJS、SortableJS |
| `checkin-statistics.html` | 未打卡人员对比、名单维护和导出 | SheetJS、html2canvas |
| `excel_filter.html` | 电商订单关键词筛选和金额汇总 | SheetJS |
| `image-batch-processing.html` | 早安图文、推广海报等批量图片叠加 | JSZip、FileSaver |
| `congrats-generator.html` | 个人/膳食中心喜报编辑与批量生成 | Fabric.js、pinyin-pro |
| `excel_query_multi_table.html` | 最多 10 个 Excel 表的联合查询 | SheetJS |
| `image-splitter/index.html` | 图片分割与打包下载 | JSZip |
| `photo-watermark/index.html` | 离线图片水印处理 | 本地脚本、JSZip |
| `privacy.html` | 数据处理、浏览器存储和第三方依赖边界 | 无外部依赖 |

入口页为 `index.html`，常用工具可加入、移出和拖拽排序，偏好只保存在当前浏览器；桌面端使用常驻分组侧栏，移动端使用导航抽屉，`other-tools.html` 提供扩展工具目录。

## 本地运行

不要直接双击 HTML 文件；部分浏览器能力和跨域资源在 `file://` 下会受限。建议在项目根目录启动静态服务器：

```bash
python3 -m http.server 8000
```

浏览器打开 <http://localhost:8000>。

## 项目自检

项目不依赖 npm 安装即可完成基础校验：

```bash
node scripts/validate-project.mjs
```

自检会覆盖：

- 11 个入口页面和 10 个脚本是否存在；
- HTML 中引用的本地资源是否缺失；
- 单页内是否存在重复 `id`；
- 业务 JavaScript 是否存在语法错误；
- 页面是否包含移动端 viewport 声明。
- 所有页面是否接入共享设计系统；
- 多表查询页是否重新出现内联脚本、内联事件或远程统计代码。

## 数据与隐私边界

- 上传的 Excel 和图片由浏览器读取，业务页面没有配套后端上传接口。
- 页面仍会从 CDN 加载部分前端依赖，因此“文件本地处理”不等于“完全离线”。详细清单见 `privacy.html`。
- 照片水印页原有的 Umami 统计加载已移除；共享导航不发送分析事件。
- 多表查询页使用项目内固定版本的 SheetJS，并通过 CSP 禁止运行时网络数据请求；其他旧页面仍待逐步本地化依赖。
- 人员姓名和头像属于敏感业务数据。公开部署前请确认仓库与 GitHub Pages 的访问范围符合公司要求。
- 浏览器刷新会清空部分仅保存在内存中的编辑状态；重要结果请及时导出。

## 维护约定

1. 新增工具页时，同时更新 `index.html`、本 README 和 `scripts/validate-project.mjs`。
2. 动态展示 Excel 或用户输入时优先使用 `textContent`；必须拼接 HTML 时先转义，避免 DOM 注入。
3. 新增外部依赖时固定明确版本，生产部署建议增加 SRI 或改为仓库内托管。
4. 修改后至少执行项目自检，并在 375px 和桌面宽度下各完成一次核心流程。
5. 不要把历史副本、临时导出图、压缩包和 `.DS_Store` 提交到主分支。
6. 全局颜色、字体、间距和交互状态统一维护在 `tokens.css`、`design.md` 与 `assets/design-system.css`，页面不得另建新的主视觉体系。

## 当前架构限制

这是“多入口纯前端工具集”，目前已经具备 Split Studio 共享外壳、分组侧栏、命令搜索、设计令牌、静态校验和明确的隐私说明，但仍没有统一状态层、完整业务测试或全部本地化的依赖包。它适合受控内部环境使用；继续扩展时，优先完成第三方依赖本地化、Excel 解析与导出模块复用，再考虑引入构建工具。
