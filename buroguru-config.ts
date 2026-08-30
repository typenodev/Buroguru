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
logo: "/images/logo.png"
},
blog: {
postsPerPage: 10,
showExcerpt: true,
showTags: true
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
name: "typenodev 的技术博客",
description: "用 Notion 作 CMS 记录技术与思考",
url: "https://buroguru.netlify.app"
},
author: {
name: "typenodev",
bio: "记录技术实践与踩坑笔记。",
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
showTags: true
},
homepage: {
hero: {
title: "typenodev 的技术博客",
description: "用 Notion 作为 CMS 记录技术与思考。",
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
