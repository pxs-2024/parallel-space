import {getRequestConfig} from 'next-intl/server';
import {routing} from './routing';

export default getRequestConfig(async ({requestLocale}) => {
  // 从 requestLocale 获取，如果为 undefined 则使用默认值
  // 注意：在 App Router 中使用 [locale] 路由时，requestLocale 应该从 middleware 中获取
  // 如果一直是 undefined，可能是因为 middleware 配置问题，这里使用默认值作为后备
  let locale = await requestLocale;
  
  // 验证 locale 是否有效
  const validLocales = routing.locales as readonly string[];
  if (!locale || !validLocales.includes(locale)) {
    locale = routing.defaultLocale;
  }

	return {
		locale: locale as typeof routing.defaultLocale,
		messages: (await import(`../../messages/${locale}.json`)).default,
	};
});