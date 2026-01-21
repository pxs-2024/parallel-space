import { Locale, NextIntlClientProvider } from "next-intl";

type LocalMessageProviderProps = {
  locale: Locale;
	children: React.ReactNode;
  messages: Record<string, string>;
};

const LocalMessageProvider = ({ locale, children, messages }: LocalMessageProviderProps) => {
	return (
		<NextIntlClientProvider locale={locale} messages={messages}>
			{children}
		</NextIntlClientProvider>
	);
};

export { LocalMessageProvider };
