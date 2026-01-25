/**
 * 数值限制函数
 * 将数值限制在指定范围内
 * @param n 要限制的数值
 * @param min 最小值
 * @param max 最大值
 * @returns 限制后的数值
 */
const clamp = (n: number, min: number, max: number): number => Math.max(min, Math.min(max, n));

export { clamp };