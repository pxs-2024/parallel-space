// 项目根目录的 middleware.ts（不是 app 目录下！）
import createMiddleware from 'next-intl/middleware';
import {routing} from './src/i18n/routing';

export default createMiddleware(routing);

// 匹配所有路由（排除静态资源、API 等)
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|assets).*)']
};
