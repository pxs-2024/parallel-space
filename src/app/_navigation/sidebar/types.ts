export type NavItem = {
	title: string;
	href: string;
	separator?: boolean; // 是否显示分割线
	icon: React.ReactElement<{ className: string }>;
};
