![image](https://github.com/user-attachments/assets/51200b19-ec44-4f08-82f0-7879d095ae0c)


# Welcome to **Buroguru** – 用 Notion 創作部落格！

Buroguru lets you blog directly from Notion — clean, simple, and minimal.

---

## 這是什麼 What is this?

Notion 是一款超直覺的筆記與資料管理工具。
Notion is a super intuitive tool for note-taking and organizing information.

我一直覺得它應該有更大的潛力，不只是寫筆記而已。
I’ve always felt it has more potential — beyond just writing notes.

所以我開發了 **Buroguru**，讓你可以直接把 Notion 當作部落格後台來使用。
That’s why I built **Buroguru** — to use Notion as a lightweight CMS for blogging.

設定過程很簡單，幾個步驟就可以開始寫文、發文，乾淨又衛生。
The setup is simple: just a few steps and you’re publishing from Notion — clean and effortless.

---

## 要怎麼用 How to use it?

加入部落格輕量陣營，只需要這三步：
Join the lightweight blogging movement in just three steps:

* 建立 Notion 資料庫與整合
  Create a Notion database and integration

* Fork [這個 repository](https://github.com/WuSandWitch/Buroguru)，設定幾個 key
  Fork [this repository](https://github.com/WuSandWitch/Buroguru) and configure a few keys

* 調整設定檔來客製化你的部落格外觀
  Customize your blog through the config file

📚 詳細教學請看：[快速開始 Quick Start](https://buroguru.zudo.cc/posts/get-started-en)

---

## 它是怎麼運作的 How it works?

Buroguru 透過腳本與 Notion API 溝通，取得內容並轉成 markdown。
Buroguru fetches content from Notion via API and renders it as markdown.

前端使用 Next.js，自動部署在 Vercel 上。
The frontend runs on Next.js and is auto-deployed via Vercel.

GitHub Actions 每 8 小時會自動同步與重新部署，完全免操作。
GitHub Actions syncs and redeploys every 8 hours — no manual work needed.

你只要在 Notion 寫文，剩下交給它搞定 ✨
You just write in Notion. Everything else is handled for you ✨

---

## 最後 One more thing

如果你喜歡這個專案，歡迎幫我按個 GitHub ⭐️，對我會是很大的鼓勵。
If you find this project helpful, consider leaving a ⭐️ on GitHub — it really means a lot.

有任何問題或想法，歡迎開 issue 或直接聯絡我 👉 [Owen Wu](https://wusandwitch.zudo.cc)
Feel free to open an issue or reach out to me 👉 [Owen Wu](https://wusandwitch.zudo.cc)

Let’s make blogging as smooth as writing notes. 💡
讓寫部落格，變得像寫筆記一樣自然。💡
-----update-----
# Buroguru 进阶改造：增量同步、HEIC 转码与全站密码保护

Buroguru 是一个把 Notion 内容同步到 Git 的 SSG 博客模板，靠 GitHub Actions 定时拉取 Notion、生成 Markdown、再由 Next.js 构建上线。它开箱即用，但在真实自建部署里，我们陆续撞上了三个不算小的问题：**每次同步全量重跑、iPhone 的 HEIC 图片在 CI 里解码失败、以及公开仓库里的内容裸奔**。

这篇文章记录了这三次改造的过程、踩过的坑和最终方案，供同样在折腾 Buroguru（或类似 Notion→Git 流水线）的朋友参考。

---

## 一、增量同步：别再每次全量重跑

### 问题

最早的同步脚本是「全量」模式：每次 Workflow 触发都把 Notion 数据库里的页面全部拉一遍、重新生成 Markdown、重新下载所有图片。两个痛点很明显：

1. **慢且浪费配额**：Notion API 有速率限制（频繁触发会 429），全量拉取在内容变多后越来越慢。
2. **图片反复下载、旧文件堆积**：图片文件名用随机 uuid 生成，每次同步都是新名字，旧图永远不会被复用，仓库里的 `public/images` 越堆越大。

### 方案

改造的核心思路是**给每篇文章打一个「上次编辑时间」的戳，比对决定跳过**。

1. **增量判定**：在生成 Markdown 时，把 Notion 返回的 `last_edited_time` 写进 frontmatter 的一个自定义字段（我们叫它 `notionLastEdited`）。下次同步时，先拿本地记录的 `notionLastEdited` 和 Notion 当前的 `last_edited_time` 比对，相等就直接跳过该页——不重新拉取、不重新生成、也不重新下载图片。

2. **图片复用**：下载图片时去掉签名 query（`?` 之后的参数，它只是过期时间，不影响图片本身），对 pathname 取 SHA-1 的前 16 位作为文件名：

   ```ts
   import { createHash } from 'crypto';

   // 在同步循环里
   const lastEdited = (postData as any).last_edited_time as string;

   // 图片文件名改为 URL hash，相同图片跨次直接命中
   const imgHash = createHash('sha1')
     .update(new URL(imgUrl).pathname)
     .digest('hex')
     .slice(0, 16);
   const fileName = `${imgHash}.${ext}`;
   ```

   这样同一张图无论同步多少次都落到同一个文件，既跳过重复下载，也不会再产生废弃的旧 uuid 文件。

### 健壮性细节

增量同步最怕「静默成功」。我们强制把两类异常情况变成**非零退出**，让 Workflow 立刻红掉而不是假装成功：

- 本次同步 **0 篇写入** 时 `exit 1`（通常是 API 鉴权或网络出问题，而不是真的没内容更新）；
- 任何 `catch` 异常都 `exit 1`。

推送环节的冲突处理也调过：先 `git commit`，再 `git fetch + git merge -X ours`（内容冲突以本地为准），**不要用 `git pull --rebase`**——rebase 在并发或历史分叉时容易把提交搞丢。配合 `concurrency` group 防止上一次还没跑完下一次就启动，最后用 `git add -A` 兜住所有新增/变更文件、用 `GITHUB_TOKEN` 直接 push。

---

## 二、HEIC 转码：让 iPhone 图片在 CI 里也能解码

### 背景：Notion 图片的特殊性

这里有个容易踩的认知坑。**Notion 公开 API（`notionhq/client`）只返回 `prod-files-secure.s3` 的签名 URL，有效期约 1 小时**，它不会给你网页版 `img.notionusercontent.com` 那种带 `tok` 的转码地址——那个 `tok` 是 Notion 服务端签发的 JWT，前端无法伪造。

也就是说，任何走 API 的第三方（Buroguru、NotionNext 等）拿到的都是原始文件，**必须自己处理图片格式兼容**。NotionNext 的做法是用 Cloudflare Worker 纯代理 `www.notion.so/image/` 并加一年 immutable 缓存——那只解决 URL 过期，并不解决 HEIC 解码。

### 问题：sharp 和 ImageMagick 都搞不定

iPhone 默认导出 HEIC。我们希望在同步阶段就把 HEIC 转成 JPEG/PNG，结果两个常规方案先后翻车：

- **sharp 直接报错**：`bad seek` / `iloc security limit exceeded`。根因是 libheif 默认安全限制 16 个 item，即便加 `unlimited: true` 能绕过 iloc 限制，`bad seek` 仍然失败，多 item 的 iPhone HEIC 解不开。
- **ImageMagick 兜底也失效**：本地沙箱是 IM7 + libheif 1.19.8，能解 HEIC；但 **GitHub Actions 环境里是 IM6.9，根本不支持 HEIC 解码**，`convert` 直接失败。靠 `apt` 装系统 IM 完全不可靠，版本差异太大。

### 最终方案：sharp 失败回退 WASM

放弃双引擎（sharp + ImageMagick）后，改用**两级转码**：

1. 先尝试 `sharp`；
2. `sharp` 失败，回退到 `heic-convert`（libheif 编译成 JS 的 WASM 实现）。

```jsonc
// package.json
"dependencies": {
  "heic-convert": "^2.1.0"  // 注意：1.4.0 不存在，会 ETARGET
}
```

配套一个类型声明文件，否则 Netlify / Next.js 构建会报 `Could not find a declaration file`：

```ts
// script/heic-convert.d.ts
declare module 'heic-convert' {
  export default function heicConvert(opts: {
    buffer: Buffer;
    format: 'JPEG' | 'PNG';
    quality?: number;
  }): Promise<Buffer>;
}
```

为了让转码在 CI 里稳，还加了几道保险：

- **下载重试 3 次**；
- **并发上限 4**，避免一次性把 Notion 图片和 CPU 打满；
- **单张解码 90s 超时**；
- **WASM 串行锁**：libheif-js 的 WASM 实例不是线程安全的，必须串行解码，否则会随机崩。

最大的好处是：**纯 WASM，不依赖任何系统库**，Workflow 里不再需要 `apt` 装 libheif/imagemagick，本地、CI、生产环境行为完全一致。

---

## 三、全站密码保护：公开仓库也不裸奔

### 需求

我们的部署仓库是公开的，但博客内容并不想对所有人开放。理想状态是：**仓库保持公开，内容在浏览器端加密访问**。

### 方案：Next.js middleware + 解锁页

否决了「用 Cloudflare Worker 套在域名前做密码」的方案（多一层边缘代理，缓存和鉴权行为难控），最终采用**方案 A**：

1. **middleware 拦截**：`middleware.ts` 拦截所有请求，未授权访问一律 307 跳转到 `/unlock`；
2. **解锁页**：`/unlock` 是个简单表单，提交密码到后端 API 校验；
3. **签发 Cookie**：校验通过后，用 `HMAC-SHA256`（密钥 `AUTH_SECRET`）签发出一个 `httpOnly` Cookie，有效期 7 天；
4. **middleware 校验 Cookie**：后续请求带着 Cookie，middleware 验签通过才放行。

敏感配置完全不进仓库：

- `SITE_PASS`：正确密码；
- `AUTH_SECRET`：HMAC 签名密钥。

这两个变量**只在 Netlify 后台的环境变量里配置**，仓库里永远只有读取逻辑、没有明文。这样即便仓库公开，也不会泄露任何凭据。

---

## 四、顺手升级：Node 20 → 22

GitHub Actions 开始对 Node 20 发出废弃提示（`setup-node` 弃用告警）。我们把 `sync-posts.yml` 里的 `node-version` 从 `'20'` 升到 `'22'`（Active LTS），确保依赖安装和构建长期稳定，也顺手消掉了 CI 里的 deprecation 噪音。

---

## 五、踩坑小结

这几轮改造里，有几个反复出现的「小坑」值得单独记一笔：

- **大段模板字符串/缩进改动，用 `file_edit` 极易静默失败**。涉及多行缩进或反引号时，改用 Python 做字节级精确插入，并写回后立即读一遍确认落盘。
- **TypeScript 语法校验用 esbuild 最快**：`npx esbuild file.ts --outfile=/dev/null`（注意**不要加** `--loader=ts`，让它按扩展名推断），`EXIT=0` 即通过。
- **增量同步有三处必须落盘**，缺一不可：
  1. 顶部 `import { createHash } from 'crypto';`
  2. 循环内 `const lastEdited = (postData as any).last_edited_time as string;`（在比对/传参之前定义）；
  3. 图片文件名改成 hash 形式。

