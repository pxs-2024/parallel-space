import type { Cell } from "./types";
import { isValidCell, isConnected } from "../utils";

export type HitGenerateResult =
	| { ok: true; cells: Cell[] }
	| { ok: false; error: string };

/**
 * 生成图形前校验选区：范围有效、连续、非空
 */
export function hitGenerate(cells: Cell[]): HitGenerateResult {
	if (cells.length === 0) {
		return { ok: false, error: "请先选择至少一个格子" };
	}
	const invalidCells = cells.filter((c) => !isValidCell(c));
	if (invalidCells.length > 0) {
		return { ok: false, error: "选中的方块超出画布范围" };
	}
	if (!isConnected(cells)) {
		return { ok: false, error: "选中的方块不连续" };
	}
	return { ok: true, cells: cells.map((c) => ({ ...c })) };
}
