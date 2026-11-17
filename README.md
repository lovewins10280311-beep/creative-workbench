# CREATIVE LOOP · Cloudflare Pages 版本

公开仓库只包含工作台代码。原本地 Python 服务和任何产品资料、视频、密钥均不在此仓库中。

## 能做什么

在浏览器首次填写产品 Brief 和访问口令后，只提供一条 **你主动选择的 TikTok 公公开视频链接**，工作台自动发起提取、获取口播/字幕、做机制拆解，并生成目标产品的待验证短视频脚本。不会自动搜索对标或发布视频。提取不到口播时会报错，不把标题当逐字稿。

自动提取由 Apify 的 `clockworks/tiktok-video-scraper` Actor 完成，内容拆解由 Cloudflare Workers AI 完成；两项服务均可能产生用量费用。公开仓库与网页不包含任何令牌。

## Pages 部署

1. Cloudflare → Workers & Pages → Create application → Pages → Import an existing Git repository，选本仓库。
2. Project name：`creative-workbench`；Production branch：`main`；Framework preset：`None`；Build command：`exit 0`；Build output directory：`dist`；Root directory 留空。点击 **Save and Deploy**。
3. Pages 项目 → Settings → Variables and Secrets → Add，新增并加密：
   - `APIFY_TOKEN`：你自己的 Apify API token。请勿发在聊天中或提交到 GitHub。
   - `WORKBENCH_KEY`：自设高强度访问口令；浏览器工作台里填同一口令。
4. Pages 项目 → Settings → Bindings → Add → Workers AI，Variable name 填 **`AI`**。
5. 上述配置后重新部署一次，使 Secrets 和 Binding 生效。打开 Pages URL，在“首次设置”填写产品 Brief 和口令，再贴你自己提供的 TikTok 链接测试。

本仓库连接 Cloudflare Pages 的 `main` 分支；配置 Secret 和 AI 绑定后，推送本 README 的文档更新即可触发一次新的生产部署，不需在网页中输入密钥。

注意：仓库 Public 不等于 API 无保护。未设置 WORKBENCH_KEY、APIFY_TOKEN 与 AI 绑定时，自动处理接口会拒绝运行。请勿把未公开产品经营资料填进公开仓库；网页填写的 Brief 与结果仅存当前浏览器 localStorage，需自己定期“导出备份”。视频数据会在你的 Apify 账号中产生任务与结果；需要遵守目标平台和适用地区的规则。

## 本地检查

用 Node.js 运行 `npm test` 或 `node --test tests/*.test.mjs`。自动流程的线上端到端测试还需要用户在 Cloudflare/Apify 账号中完成配置后，用真实公开视频链接验证；这里没有代用户开通或产生用量费用。

## 已知限制

- 私密、删除、区域封锁、无口播/字幕的视频可能无法处理。平台字幕也可能是翻译字幕，生成前必须核对。
- 当前自动拆解依据元数据与口播文本，不包含逐帧视觉识别；镜头证据若未在口播中明确出现，会标为待核对。不能把它当作已验证的拍摄事实。
- 生成脚本是待验证草案，不会替代产品事实、健康宣称、达人真实性和目标市场广告合规审核。
- 一个浏览器中的资料不会自动同步到另一个浏览器或电脑。

参考：[Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/get-started/) · [Pages Bindings 与 Secrets](https://developers.cloudflare.com/pages/functions/bindings/) · [Apify Actor 文档](https://apify.com/clockworks/tiktok-video-scraper)
