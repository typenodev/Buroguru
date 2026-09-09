export interface BuroguruConfig {
site: {
name: string
description: string
url: string
favicon?: string
}
author: {
name: string
bio: string
avatar: string
email?: string
social: {
github?: string
twitter?: string
linkedin?: string
notion?: string
website?: string
}
}
appearance: {
fontFamily: 'serif' | 'sans' | 'mono'
customFont?: string
primaryColor: string
secondaryColor?: string
logo?: string
}
blog: {
postsPerPage: number
showExcerpt: boolean
showTags: boolean
defaultThumbnail?: string
/** 文章内图片排版方式 */
imageLayout?: {
/** gallery=按图片尺寸自动排布的 justified 画廊；two-column=双栏网格；stack=原来的全宽堆叠 */
mode?: 'gallery' | 'two-column' | 'stack'
/** justified 画廊的基准行高（桌面端 px，移动端自动缩小） */
rowHeight?: number
/** 图片间距 px */
gap?: number
/** 图片圆角 px */
radius?: number
/** 点击图片是否打开灯箱大图 */
lightbox?: boolean
/** 双栏模式是否统一裁剪为 4:3，关闭则保留图片原始比例 */
uniformRatio?: boolean
}
/** 文章底部「相关文章」推荐 */
relatedPosts?: {
/** 是否显示相关文章 */
enabled?: boolean
/** 推荐数量 */
count?: number
/** 区块标题 */
title?: string
}
}
homepage: {
hero: {
title: string
description: string
primaryButton: {
text: string
href: string
}
secondaryButton: {
text: string
href: string
}
}
recentPosts: {
title: string
viewAllText: string
count: number
}
}
footer: {
text?: string
showBuiltWith: boolean
links?: Array<{
name: string
href: string
}>
}
}
export const defaultConfig: BuroguruConfig = {
site: {
name: "Buroguru",
description: "A modern blog framework that transforms your Notion workspace into a beautiful blog",
url: "https://buroguru.zudo.cc"
},
author: {
name: "Your Name",
bio: "Welcome to my blog! I write about technology, life, and everything in between.",
avatar: "/images/avatar.png",
social: {
github: "https://github.com/yourusername",
notion: "https://notion.so/yourusername"
}
},
appearance: {
    fontFamily: 'serif',
    primaryColor: '222.2 84% 4.9%',
    secondaryColor: '210 40% 96%',
    logo: '/images/Buroguru.png'
  },
blog: {
postsPerPage: 10,
showExcerpt: true,
showTags: true,
imageLayout: {
mode: 'gallery',
rowHeight: 260,
gap: 8,
radius: 8,
lightbox: true,
uniformRatio: true
},
relatedPosts: {
enabled: true,
count: 3,
title: "Related Posts"
}
},
homepage: {
hero: {
title: "Your Blog Title",
description: "A brief description of your blog",
primaryButton: {
text: "Get Started",
href: "/posts/get-started"
},
secondaryButton: {
text: "About",
href: "/about"
}
},
recentPosts: {
title: "Recent Posts",
viewAllText: "View all posts",
count: 3
}
},
footer: {
text: "Built with ❤️",
showBuiltWith: true
}
}
const config: BuroguruConfig = {
site: {
name: "PhotoBook",
description: "Every Page, a Memory. Every Memory, a Story.",
url: "https://buroguru.netlify.app"
},
author: {
name: "typenodev",
bio: "",
avatar: "/images/avatar.png",
social: {
github: "https://github.com/typenodev"
}
},
appearance: {
fontFamily: 'sans',
customFont: 'Noto Sans SC',
primaryColor: '222.2 84% 4.9%'
},
blog: {
postsPerPage: 10,
showExcerpt: true,
showTags: true,
// 文章内图片排版：mode 可选 'gallery'（按图片尺寸自动排布的画廊）/ 'two-column'（双栏网格）/ 'stack'（原全宽堆叠）
imageLayout: {
mode: 'gallery',
rowHeight: 260,
gap: 8,
radius: 8,
lightbox: true,
uniformRatio: true
},
// 文章底部「相关文章」：按标签重合度推荐，标签不足时自动用最新文章补齐
relatedPosts: {
enabled: true,
count: 3,
title: "相关文章"
}
},
homepage: {
hero: {
title: "PhotoBook",
description: "Every Page, a Memory. Every Memory, a Story.",
primaryButton: {
text: "开始阅读",
href: "/posts"
},
secondaryButton: {
text: "关于",
href: "/about"
}
},
recentPosts: {
title: "最新文章",
viewAllText: "查看全部文章",
count: 3
}
},
footer: {
text: "© 2026 typenodev",
showBuiltWith: true
}
}
export default config
