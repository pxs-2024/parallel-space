"use client";

/**
 * 全屏像素画布背景：常驻显示，从中心扩散后持续闪烁，粒子缓慢漂移（如夜空），无交互。
 * 支持主题切换（next-themes）、主题色与 prefers-reduced-motion。
 *
 * 性能：30fps、标签页不可见时暂停、resize 防抖；低端设备可增大 gap（如 18～20）减少粒子数。
 */
import * as React from "react";
import { useTheme } from "next-themes";

type PixelBgConfig = {
	ctx: CanvasRenderingContext2D;
	width: number;
	height: number;
	x: number;
	y: number;
	color: string;
	speed: number;
	delay: number;
};

class PixelBg {
	private ctx: CanvasRenderingContext2D;
	private width: number;
	private height: number;
	private baseX: number;
	private baseY: number;
	private color: string;
	private speed: number;
	private size = 0;
	private sizeStep: number;
	private minSize = 0.5;
	private maxSize: number;
	private delay: number;
	private counter = 0;
	private counterStep: number;
	private isShimmer = false;
	private isReverse = false;
	/** 闪烁相位，使粒子不同步 */
	readonly phase: number;
	/** 漂移速度（像素/帧），缓慢如夜空 */
	private readonly driftVx: number;
	private readonly driftVy: number;
	private offsetX = 0;
	private offsetY = 0;

	constructor(config: PixelBgConfig) {
		const { ctx, width, height, x, y, color, speed, delay } = config;
		this.ctx = ctx;
		this.width = width;
		this.height = height;
		this.baseX = x;
		this.baseY = y;
		this.color = color;
		this.speed = this.rand(0.1, 0.9) * speed;
		this.sizeStep = Math.random() * 0.35;
		this.maxSize = this.rand(1.2, 2.2);
		this.delay = delay;
		this.counterStep = Math.random() * 4 + (width + height) * 0.008;
		this.phase = Math.random() * Math.PI * 2;
		// 每个粒子随机方向、缓慢漂移
		const angle = Math.random() * Math.PI * 2;
		const driftSpeed = this.rand(0.08, 0.25);
		this.driftVx = Math.cos(angle) * driftSpeed;
		this.driftVy = Math.sin(angle) * driftSpeed;
	}

	private rand(min: number, max: number) {
		return Math.random() * (max - min) + min;
	}

	private wrap(v: number, size: number) {
		return ((v % size) + size) % size;
	}

	draw(now: number) {
		this.offsetX += this.driftVx;
		this.offsetY += this.driftVy;
		const drawX = this.wrap(this.baseX + this.offsetX, this.width);
		const drawY = this.wrap(this.baseY + this.offsetY, this.height);

		const centerOffset = 1.25 - this.size * 0.5;
		// 闪烁：在 shimmer 状态下透明度轻微波动
		if (this.isShimmer) {
			const twinkle = 0.65 + 0.35 * Math.sin(now * 0.0025 + this.phase);
			this.ctx.globalAlpha = twinkle;
		}
		this.ctx.fillStyle = this.color;
		this.ctx.fillRect(
			drawX + centerOffset,
			drawY + centerOffset,
			this.size,
			this.size
		);
		this.ctx.globalAlpha = 1;
	}

	/** 常驻模式：只做出现 + 持续闪烁，不消失 */
	appear(now: number) {
		if (this.counter <= this.delay) {
			this.counter += this.counterStep;
			return;
		}
		if (this.size >= this.maxSize) this.isShimmer = true;
		if (this.isShimmer) {
			if (this.size >= this.maxSize) this.isReverse = true;
			else if (this.size <= this.minSize) this.isReverse = false;
			this.size += this.isReverse ? -this.speed : this.speed;
		} else {
			this.size += this.sizeStep;
		}
		this.draw(now);
	}
}

const DEFAULT_COLORS = [
	"var(--primary)",
	"var(--chart-1)",
	"var(--chart-2)",
];

/** 浅色模式下的鲜艳配色，在白底上更醒目 */
const LIGHT_VIVID_COLORS = [
	"#6366f1", // indigo
	"#8b5cf6", // violet
	"#06b6d4", // cyan
	"#ec4899", // pink
	"#f59e0b", // amber
	"#10b981", // emerald
];

function getSpeed(speed: number, reducedMotion: boolean) {
	if (reducedMotion || speed <= 0) return 0;
	if (speed >= 100) return 0.08;
	return (speed * 0.0008) as number;
}

function getGap(gap: number) {
	return Math.min(40, Math.max(6, gap));
}

const RESIZE_DEBOUNCE_MS = 400;

/** 将 var(--xxx) 解析为当前主题下的实际颜色，供 canvas 使用 */
function resolveColors(colorTokens: string[]): string[] {
	if (typeof document === "undefined") return colorTokens;
	const root = document.documentElement;
	const style = getComputedStyle(root);
	return colorTokens.map((token) => {
		const match = token.match(/^var\((--[a-zA-Z0-9-]+)\)$/);
		if (!match) return token;
		const value = style.getPropertyValue(match[1]).trim();
		return value || token;
	});
}

export type PixelCanvasBackgroundProps = {
	colors?: string[];
	gap?: number;
	speed?: number;
	className?: string;
};

export function PixelCanvasBackground({
	colors = DEFAULT_COLORS,
	gap = 14,
	speed = 30,
	className,
}: PixelCanvasBackgroundProps) {
	const { resolvedTheme } = useTheme();
	const canvasRef = React.useRef<HTMLCanvasElement>(null);
	const pixelsRef = React.useRef<PixelBg[]>([]);
	const animationRef = React.useRef<number>(0);
	const timePreviousRef = React.useRef(performance.now());
	const reducedMotionRef = React.useRef(
		typeof window !== "undefined" &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches
	);

	const init = React.useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const width = window.innerWidth;
		const height = window.innerHeight;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		canvas.width = width;
		canvas.height = height;
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;

		// 仅当 resolvedTheme 未就绪时用 document 判断，否则以 resolvedTheme 为准，避免切换瞬间误判
		const isLight =
			resolvedTheme === undefined
				? typeof document !== "undefined" &&
					!document.documentElement.classList.contains("dark")
				: resolvedTheme === "light";
		const colorTokens = isLight ? LIGHT_VIVID_COLORS : colors;
		const resolved = resolveColors(colorTokens);
		const gapVal = getGap(gap);
		const speedVal = getSpeed(speed, reducedMotionRef.current);
		const centerX = width / 2;
		const centerY = height / 2;
		const getDistance = (x: number, y: number) =>
			Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

		const pixels: PixelBg[] = [];
		for (let x = 0; x < width; x += gapVal) {
			for (let y = 0; y < height; y += gapVal) {
				const color =
					resolved[Math.floor(Math.random() * resolved.length)] ?? resolved[0];
				const delay = reducedMotionRef.current ? 0 : getDistance(x, y);
				pixels.push(
					new PixelBg({ ctx, width, height, x, y, color, speed: speedVal, delay })
				);
			}
		}
		pixelsRef.current = pixels;
	}, [colors, gap, speed, resolvedTheme]);

	// 主题切换或窗口 resize 时重新初始化；主题切换后延迟 50ms 再 init，确保 next-themes 已更新 DOM
	// resize 防抖：停止改变窗口大小后 RESIZE_DEBOUNCE_MS 才执行 init，避免拖拽时频繁重算粒子
	React.useEffect(() => {
		const initTimer = setTimeout(init, 50);
		let resizeTimer: ReturnType<typeof setTimeout> | null = null;
		const onResize = () => {
			if (resizeTimer) clearTimeout(resizeTimer);
			resizeTimer = setTimeout(() => {
				resizeTimer = null;
				init();
			}, RESIZE_DEBOUNCE_MS);
		};
		window.addEventListener("resize", onResize);
		return () => {
			clearTimeout(initTimer);
			if (resizeTimer) clearTimeout(resizeTimer);
			window.removeEventListener("resize", onResize);
		};
	}, [init, resolvedTheme]);

	// 30fps 足够背景闪烁观感；每帧从 ref 读取当前粒子数组，主题切换 re-init 后立即生效
	React.useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!canvas || !ctx) return;

		const FPS = 30;
		const interval = 1000 / FPS;
		let last = timePreviousRef.current;

		const tick = (now: number) => {
			animationRef.current = requestAnimationFrame(tick);
			if (document.hidden) return;
			const pixels = pixelsRef.current;
			if (!pixels.length) return;
			if (now - last < interval) return;
			last = now - ((now - last) % interval);
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			for (let i = 0; i < pixels.length; i++) {
				pixels[i].appear(now);
			}
		};
		animationRef.current = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(animationRef.current);
	}, []);

	return (
		<div
			className={className}
			aria-hidden
			role="presentation"
			style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
		>
			<canvas
				ref={canvasRef}
				className="size-full"
				style={{ display: "block", width: "100%", height: "100%" }}
			/>
		</div>
	);
}
