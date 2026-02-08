// Next.js 16：middleware 已重命名为 proxy，沿用相同逻辑
import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

export default createMiddleware(routing);

export const config = {
	matcher: ['/((?!api|_next/static|_next/image|favicon.ico|assets).*)'],
};
