import config, { type BuroguruConfig, defaultConfig } from '../buroguru-config'

// 图片排版配置：兼容 buroguru-config.ts 尚未声明 imageLayout 字段的情况
type ImageLayoutConfig = {
  mode?: 'gallery' | 'two-column' | 'stack'
  rowHeight?: number
  gap?: number
  radius?: number
  lightbox?: boolean
  uniformRatio?: boolean
}

function readImageLayout(source: unknown): ImageLayoutConfig | undefined {
  return (source as { imageLayout?: ImageLayoutConfig } | undefined)?.imageLayout
}

// Merge user config with default config
function mergeConfig(userConfig: Partial<BuroguruConfig>, defaultConfig: BuroguruConfig): BuroguruConfig {
  const blogMerged = {
    ...defaultConfig.blog,
    ...userConfig.blog,
    imageLayout: { ...readImageLayout(defaultConfig.blog), ...readImageLayout(userConfig.blog) },
  } as BuroguruConfig['blog']

  return {
    site: { ...defaultConfig.site, ...userConfig.site },
    author: { 
      ...defaultConfig.author, 
      ...userConfig.author,
      social: { ...defaultConfig.author.social, ...userConfig.author?.social }
    },
    appearance: { ...defaultConfig.appearance, ...userConfig.appearance },
    blog: blogMerged,
    homepage: {
      ...defaultConfig.homepage,
      ...userConfig.homepage,
      hero: { ...defaultConfig.homepage.hero, ...userConfig.homepage?.hero },
      recentPosts: { ...defaultConfig.homepage.recentPosts, ...userConfig.homepage?.recentPosts }
    },
    footer: { ...defaultConfig.footer, ...userConfig.footer }
  }
}

// Export the merged configuration
export const siteConfig = mergeConfig(config, defaultConfig)

// Export individual config sections for easier access
export const { site, author, appearance, blog, homepage, footer } = siteConfig

// Helper functions

export function getSocialLinks() {
  return Object.entries(author.social)
    .filter(([, url]) => url)
    .map(([platform, url]) => ({ platform, url: url! }))
}

export function getPostsPerPage() {
  return blog.postsPerPage
}

export function shouldShowBuiltWith() {
  return footer.showBuiltWith
}

export function getCustomCSS() {
  const css = []
  
  // Custom font import
  if (appearance.customFont) {
    css.push(`@import url('https://fonts.googleapis.com/css2?family=${appearance.customFont.replace(/\s+/g, '+')}:wght@400;500;600;700&display=swap');`)
  }
  
  css.push(':root {')
  
  // Font family CSS
  if (appearance.customFont) {
    css.push(`  --font-serif: '${appearance.customFont}', serif;`)
    css.push(`  --font-sans: '${appearance.customFont}', sans-serif;`)
    css.push(`  --font-mono: '${appearance.customFont}', monospace;`)
  } else if (appearance.fontFamily === 'sans') {
    css.push('  --font-serif: ui-sans-serif, system-ui, sans-serif;')
  } else if (appearance.fontFamily === 'mono') {
    css.push('  --font-serif: ui-monospace, monospace;')
  } else {
    // Default to serif if fontFamily is 'serif' or undefined
    css.push('  --font-serif: ui-serif, Georgia, serif;')
  }
  
  // Primary color
  if (appearance.primaryColor) {
    // Remove hsl() wrapper if present, otherwise use as-is
    const colorValue = appearance.primaryColor.replace(/^hsl\(/, '').replace(/\)$/, '')
    css.push(`  --primary: ${colorValue};`)
    css.push(`  --primary-foreground: 0 0% 98%;`) // White text on primary background
  }
  
  // Secondary color
  if (appearance.secondaryColor) {
    // Remove hsl() wrapper if present, otherwise use as-is
    const colorValue = appearance.secondaryColor.replace(/^hsl\(/, '').replace(/\)$/, '')
    css.push(`  --secondary: ${colorValue};`)
  }
  
  css.push('}')
  
  // Dark mode color adjustments
  if (appearance.primaryColor || appearance.secondaryColor) {
    css.push('.dark {')
    
    if (appearance.primaryColor) {
      // In dark mode, use the original dark theme primary colors
      css.push(`  --primary: 0 0% 98%;`) // Light button in dark mode (standard approach)
      css.push(`  --primary-foreground: 0 0% 9%;`) // Dark text on light button
    }
    
    if (appearance.secondaryColor) {
      css.push(`  --secondary: 0 0% 14.9%;`) // Standard dark mode secondary
    }
    
    css.push('}')
  }
  
  // Apply font to serif class
  if (appearance.customFont) {
    css.push(`.font-serif { font-family: '${appearance.customFont}', serif !important; }`)
  } else if (appearance.fontFamily === 'sans') {
    css.push('.font-serif { font-family: ui-sans-serif, system-ui, sans-serif !important; }')
  } else if (appearance.fontFamily === 'mono') {
    css.push('.font-serif { font-family: ui-monospace, monospace !important; }')
  }
  
  return css.join('\n')
} 