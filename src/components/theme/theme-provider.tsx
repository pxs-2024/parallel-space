import { ThemeProvider as BaseThemesProvider } from "next-themes";

type ThemeProviderProps = {
	children: React.ReactNode;
};

const ThemeProvider = ({ children }: ThemeProviderProps) => {
	return (
		<BaseThemesProvider attribute="class" defaultTheme="system" enableSystem>
			{children}
		</BaseThemesProvider>
	);
};

export { ThemeProvider };
