"use client";

import { useTranslations } from "next-intl";

const HERO_LINE_ANIM = "auth-hero-line 1.1s cubic-bezier(0.22, 1, 0.36, 1) forwards";
const HERO_SHINE_ANIM = "auth-hero-shine 4s ease-in-out 1.2s infinite";

/**
 * 登录/注册页左上角网站描述，带入场与渐变流动动画
 */
export function AuthPageHero() {
	const t = useTranslations("auth");

	return (
		<div
			className="pointer-events-none absolute left-0 top-0 z-10 flex min-h-[120px] flex-col gap-2 px-8 pt-6 sm:px-12 sm:pt-10"
			aria-hidden
		>
			{/* 标题：从左滑入 + 渐变流动 */}
			<h2
				className="text-2xl font-semibold tracking-tight sm:text-3xl"
				style={{
					opacity: 0,
					animation: HERO_LINE_ANIM,
					animationDelay: "0.15s",
				}}
			>
				<span
					className="inline-block bg-[linear-gradient(90deg,var(--primary),var(--chart-2),var(--primary))] bg-[length:200%_100%] bg-clip-text text-transparent"
					style={{
						backgroundPosition: "100% 50%",
						animation: HERO_SHINE_ANIM,
					}}
				>
					{t("siteTagline")}
				</span>
			</h2>
			{/* 副标题：延迟滑入 */}
			<p
				className="max-w-[280px] text-sm text-muted-foreground sm:max-w-[320px] sm:text-base"
				style={{
					opacity: 0,
					animation: HERO_LINE_ANIM,
					animationDelay: "0.5s",
				}}
			>
				{t("siteDescription")}
			</p>
			{/* 装饰线 */}
			<div
				className="mt-2 h-0.5 w-24 rounded-full bg-primary/50"
				style={{
					opacity: 0,
					animation: HERO_LINE_ANIM,
					animationDelay: "0.75s",
				}}
			/>
		</div>
	);
}
