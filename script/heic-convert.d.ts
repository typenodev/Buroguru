/**
 * heic-convert 无官方类型声明,这里手动补充。
 * 仅声明 API 形状,满足 Next.js 构建时的 tsc 类型检查。
 */
declare module 'heic-convert' {
  interface HeicConvertOptions {
    buffer: Buffer;
    format: 'JPEG' | 'PNG';
    quality?: number;
    width?: number;
    height?: number;
  }

  function heicConvert(options: HeicConvertOptions): Promise<Buffer>;

  export default heicConvert;
}
