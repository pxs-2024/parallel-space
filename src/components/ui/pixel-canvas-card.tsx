"use client";

/**
 * 像素画布卡片：悬浮/聚焦时从中心扩散的像素动画背景，支持主题色与 prefers-reduced-motion。
 */
import { useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

type PixelConfig = {
	ctx: CanvasRenderingContext2D;
	width: number;
	height: number;
	x: number;
	y: number;
	color: string;
	speed: number;
	delay: number;
};

class Pixel {
	private width: number;
	private height: number;
	private ctx: CanvasRenderingContext2D;
	private x: number;
	private y: number;
	private color: string;
	private speed: number;
	private size = 0;
	private sizeStep: number;
	private minSize = 0.5;
	private maxSize: number;
	private delay: number;
	private counter = 0;
	private counterStep: number;
	isIdle = true;
	private isReverse = false;
	private isShimmer = false;

	constructor(config: PixelConfig) {
		const { ctx, width, height, x, y, color, speed, delay } = config;
		this.ctx = ctx;
		this.width = width;
		this.height = height;
		this.x = x;
		this.y = y;
		this.color = color;
		this.speed = this.rand(0.1, 0.9) * speed;
		this.sizeStep = Math.random() * 0.4;
		this.maxSize = this.rand(1.5, 2.5);
		this.delay = delay;
		this.counterStep =
			Math.random() * 4 + (width + height) * 0.01;
	}

	private rand(min: number, max: number) {
		return Math.random() * (max - min) + min;
	}

	draw() {
		const centerOffset = 1.25 - this.size * 0.5;
		this.ctx.fillStyle = this.color;
		this.ctx.fillRect(
			this.x + centerOffset,
			this.y + centerOffset,
			this.size,
			this.size
		);
	}

	appear() {
		this.isIdle = false;
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
		this.draw();
	}

	disappear() {
		this.isShimmer = false;
		this.counter = 0;
		if (this.size <= 0) {
			this.isIdle = true;
			return;
		}
		this.size -= 0.1;
		this.draw();
	}
}

export type PixelCanvasCardProps = {
	/** 像素颜色列表，支持主题变量如 var(--primary) 或 hex */
	colors?: string[];
	/** 像素间距 4–50 */
	gap?: number;
	/** 动画速度 0–100，会尊重 prefers-reduced-motion */
	speed?: number;
	/** 悬浮/聚焦时的边框与高亮色 */
	activeColor?: string;
	className?: string;
	children?: React.ReactNode;
};

const DEFAULT_COLORS = [
	"var(--primary)",
	"var(--chart-1)",
	"var(--chart-2)",
];

function getSpeed(speed: number, reducedMotion: boolean) {
	if (reducedMotion || speed <= 0) return 0;
	if (speed >= 100) return 0.1;
	return (speed * 0.001) as number;
}

function getGap(gap: number) {
	return Math.min(50, Math.max(4, gap));
}

export function PixelCanvasCard({
	colors = DEFAULT_COLORS,
	gap = 10,
	speed = 25,
	activeColor = "var(--primary)",
	className,
	children,
}: PixelCanvasCardProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const pixelsRef = useRef<Pixel[]>([]);
	const animationRef = useRef<number>(0);
	const timePreviousRef = useRef(performance.now());
	const reducedMotionRef = useRef(
		typeof window !== "undefined" &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches
	);

	const runAnimation = useCallback(
		(fnName: "appear" | "disappear") => {
			const canvas = canvasRef.current;
			const ctx = canvas?.getContext("2d");
			const pixels = pixelsRef.current;
			if (!canvas || !ctx || !pixels.length) return;

			const FPS = 60;
			const interval = 1000 / FPS;
			let last = timePreviousRef.current;

			const tick = (now: number) => {
				if (now - last < interval) {
					animationRef.current = requestAnimationFrame(tick);
					return;
				}
				last = now - ((now - last) % interval);
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				let allIdle = true;
				for (let i = 0; i < pixels.length; i++) {
					pixels[i][fnName]();
					if (!pixels[i].isIdle) allIdle = false;
				}
				if (!allIdle) animationRef.current = requestAnimationFrame(tick);
			};
			animationRef.current = requestAnimationFrame(tick);
		},
		[]
	);

	const init = useCallback(() => {
		const container = containerRef.current;
		const canvas = canvasRef.current;
		if (!container || !canvas) return;

		const rect = container.getBoundingClientRect();
		const width = Math.floor(rect.width);
		const height = Math.floor(rect.height);
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		canvas.width = width;
		canvas.height = height;
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;

		const gapVal = getGap(gap);
		const speedVal = getSpeed(speed, reducedMotionRef.current);
		const centerX = width / 2;
		const centerY = height / 2;

		const getDistance = (x: number, y: number) =>
			Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

		const pixels: Pixel[] = [];
		for (let x = 0; x < width; x += gapVal) {
			for (let y = 0; y < height; y += gapVal) {
				const color =
					colors[Math.floor(Math.random() * colors.length)] ?? DEFAULT_COLORS[0];
				const delay = reducedMotionRef.current ? 0 : getDistance(x, y);
				pixels.push(
					new Pixel({ ctx, width, height, x, y, color, speed: speedVal, delay })
				);
			}
		}
		pixelsRef.current = pixels;
	}, [colors, gap, speed]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		init();
		const ro = new ResizeObserver(init);
		ro.observe(container);
		return () => ro.disconnect();
	}, [init]);

	useEffect(() => {
		return () => {
			if (animationRef.current) cancelAnimationFrame(animationRef.current);
		};
	}, []);

	const handleEnter = useCallback(() => runAnimation("appear"), [runAnimation]);
	const handleLeave = useCallback(() => runAnimation("disappear"), [runAnimation]);

	return (
		<div
			ref={containerRef}
			className={cn(
				"pixel-canvas-card relative flex min-h-0 overflow-hidden border border-border aspect-4/5",
				"isolation-isolate transition-[border-color] duration-300 ease-out",
				"hover:border-(--pixel-card-active) focus-within:border-(--pixel-card-active)",
				"before:absolute before:inset-0 before:content-['']",
				"before:bg-[radial-gradient(circle_at_bottom_left,transparent_55%,var(--card))]",
				"before:shadow-[inset_-0.5cqi_0.5cqi_2.5cqi_var(--background)]",
				"before:pointer-events-none before:transition-opacity before:duration-500 before:ease-out",
				"hover:before:opacity-0 focus-within:before:opacity-0",
				"after:absolute after:inset-0 after:m-auto after:size-[min(100%,100%)] after:max-w-full after:max-h-full after:aspect-square after:content-['']",
				"after:bg-[radial-gradient(circle,var(--background),transparent_65%)]",
				"after:opacity-0 after:transition-opacity after:duration-500 after:ease-out",
				"hover:after:opacity-100 focus-within:after:opacity-100",
				"select-none outline-none focus-within:outline-2 focus-within:outline-ring focus-within:outline-offset-2",
				className
			)}
			style={
				{
					"--pixel-card-active": activeColor,
				} as React.CSSProperties
			}
			onMouseEnter={handleEnter}
			onMouseLeave={handleLeave}
			onFocus={(e) => {
				if (!(e.currentTarget as HTMLDivElement).contains(e.relatedTarget as Node))
					handleEnter();
			}}
			onBlur={(e) => {
				if (!(e.currentTarget as HTMLDivElement).contains(e.relatedTarget as Node))
					handleLeave();
			}}
		>
			<canvas
				ref={canvasRef}
				className="pointer-events-none absolute inset-0 size-full"
				aria-hidden
			/>
			{children ? (
				<div className="relative z-10 flex items-center justify-center text-muted-foreground transition-[color,transform] duration-300 ease-out group-hover:text-foreground group-hover:scale-110 [.pixel-canvas-card:hover_&]:text-foreground [.pixel-canvas-card:hover_&]:scale-110 [.pixel-canvas-card:focus-within_&]:text-foreground [.pixel-canvas-card:focus-within_&]:scale-110">
					{children}
				</div>
			) : null}
		</div>
	);
}
