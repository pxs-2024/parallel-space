import type { Cell, FPState, Point, Space, View } from "./types";
import type { Command } from "./history";
import { Store } from "./store";
import { cellsToBorderSegments, unionCells, subtractCells, clampCell } from "../utils";

export class SetHoverCmd implements Command<FPState> {
	name = "SetHover";
	private prev!: string | null;
	constructor(private next: string | null) {}
	execute(store: Store<FPState>) {
		this.prev = store.getState().hoverSpaceId;
		store.mutate((s) => ({ ...s, hoverSpaceId: this.next }));
	}
	undo(store: Store<FPState>) {
		store.mutate((s) => ({ ...s, hoverSpaceId: this.prev }));
	}
}

export class SetOverlayCmd implements Command<FPState> {
	name = "SetOverlay";
	private prev!: FPState["overlay"];
	constructor(private next: FPState["overlay"]) {}
	execute(store: Store<FPState>) {
		this.prev = store.getState().overlay;
		store.mutate((s) => ({ ...s, overlay: this.next }));
	}
	undo(store: Store<FPState>) {
		store.mutate((s) => ({ ...s, overlay: this.prev }));
	}
}

export class ApplySelectionCmd implements Command<FPState> {
	name = "ApplySelection";
	private prev!: Cell[];
	constructor(private mode: "union" | "subtract", private cells: Cell[]) {}
	execute(store: Store<FPState>) {
		this.prev = store.getState().selectedCells;
		store.mutate((s) => ({
			...s,
			selectedCells:
				this.mode === "union"
					? unionCells(s.selectedCells, this.cells.map(clampCell))
					: subtractCells(s.selectedCells, this.cells.map(clampCell)),
		}));
	}
	undo(store: Store<FPState>) {
		store.mutate((s) => ({ ...s, selectedCells: this.prev }));
	}
}

export class ToggleCellCmd implements Command<FPState> {
	name = "ToggleCell";
	private prev!: Cell[];
	constructor(private cell: Cell) {}
	execute(store: Store<FPState>) {
		const c = clampCell(this.cell);
		const prev = store.getState().selectedCells;
		this.prev = prev;
		const key = `${c.x},${c.y}`;
		const has = prev.some((p) => `${p.x},${p.y}` === key);
		store.mutate((s) => ({
			...s,
			selectedCells: has ? prev.filter((p) => `${p.x},${p.y}` !== key) : [...prev, c],
		}));
	}
	undo(store: Store<FPState>) {
		store.mutate((s) => ({ ...s, selectedCells: this.prev }));
	}
}

// 本地模式的 MoveSpace（persist 模式由 Engine 选择是否 optimistic）
export class MoveSpaceLocalCmd implements Command<FPState> {
	name = "MoveSpaceLocal";
	private prevCells!: Cell[];
	constructor(private spaceId: string, private nextCells: Cell[]) {}
	getUpdatedSpaceIds() {
		return [this.spaceId];
	}
	execute(store: Store<FPState>) {
		const st = store.getState();
		const sp = st.spaces.find((s) => s.id === this.spaceId);
		this.prevCells = sp?.cells ?? [];
		const clamped = this.nextCells.map(clampCell);
		store.mutate((s) => ({
			...s,
			spaces: s.spaces.map((x) =>
				x.id === this.spaceId ? { ...x, cells: clamped, segs: cellsToBorderSegments(clamped) } : x
			),
		}));
	}
	undo(store: Store<FPState>) {
		const prev = this.prevCells.map(clampCell);
		store.mutate((s) => ({
			...s,
			spaces: s.spaces.map((x) =>
				x.id === this.spaceId ? { ...x, cells: prev, segs: cellsToBorderSegments(prev) } : x
			),
		}));
	}
}

/** 应用「编辑空间」的选区为该空间的新图形并退出编辑状态 */
export class ApplyEditingSpaceCmd implements Command<FPState> {
	name = "ApplyEditingSpace";
	private prevCells!: Cell[];
	constructor(private spaceId: string, private nextCells: Cell[]) {}
	getUpdatedSpaceIds() {
		return [this.spaceId];
	}
	execute(store: Store<FPState>) {
		const st = store.getState();
		const sp = st.spaces.find((s) => s.id === this.spaceId);
		this.prevCells = sp?.cells ?? [];
		const clamped = this.nextCells.map(clampCell);
		store.mutate((s) => ({
			...s,
			spaces: s.spaces.map((x) =>
				x.id === this.spaceId ? { ...x, cells: clamped, segs: cellsToBorderSegments(clamped) } : x
			),
			editingSpaceId: null,
			selectedCells: [],
		}));
	}
	undo(store: Store<FPState>) {
		const prev = this.prevCells.map(clampCell);
		store.mutate((s) => ({
			...s,
			spaces: s.spaces.map((x) =>
				x.id === this.spaceId ? { ...x, cells: prev, segs: cellsToBorderSegments(prev) } : x
			),
			editingSpaceId: this.spaceId,
			selectedCells: [...prev],
		}));
	}
}

// cleanSegments：你后续接入算法即可，这里只示范结构
export class CleanSegmentsCmd implements Command<FPState> {
	name = "CleanSegments";
	private prevSpaces!: Space[];
	constructor(private points: Point[]) {}
	execute(store: Store<FPState>) {
		this.prevSpaces = store.getState().spaces;
		// TODO: 把 points 应用到 spaces 的 segs/cells（你自己的算法）
		store.mutate((s) => ({ ...s })); // placeholder
	}
	undo(store: Store<FPState>) {
		store.mutate((s) => ({ ...s, spaces: this.prevSpaces }));
	}
}

export class SetViewCmd implements Command<FPState> {
	name = "SetView";
	private prev!: View;
	constructor(private next: View) {}
	execute(store: Store<FPState>) {
		this.prev = store.getState().view;
		store.mutate((s) => ({ ...s, view: this.next }));
	}
	undo(store: Store<FPState>) {
		store.mutate((s) => ({ ...s, view: this.prev }));
	}
}

export class MoveSpaceCmd implements Command<FPState> {
	name = "MoveSpace";
	private prevSpace!: Space;
	constructor(private spaceId: string, private dx: number, private dy: number) {}
	getUpdatedSpaceIds() {
		return [this.spaceId];
	}
	execute(store: Store<FPState>) {
		// 同时更新cells和segs
		const space = store.getState().spaces.find((s) => s.id === this.spaceId);
		if (!space) return;
		this.prevSpace = space;
		if (!space) return;
		const dx = this.dx;
		const dy = this.dy;
		const nextCells = space.cells.map((c) => ({ x: c.x + dx, y: c.y + dy }));
		const nextSegs = space.segs?.map((s) => s.map((seg) => ({ x1: seg.x1 + dx, y1: seg.y1 + dy, x2: seg.x2 + dx, y2: seg.y2 + dy }))) ?? [];
		store.mutate((s) => ({
			...s,
			spaces: s.spaces.map((x) =>
				x.id === this.spaceId ? { ...x, cells: nextCells, segs: nextSegs } : x
			),
		}));
	}
	undo(store: Store<FPState>) {
		const space = store.getState().spaces.find((s) => s.id === this.spaceId);
		if (!space) return;
		store.mutate((s) => ({
			...s,
			spaces: s.spaces.map((x) =>
				x.id === this.spaceId ? { ...this.prevSpace } : x
			),
		}));
	}
}

export class GenerateSpaceCmd implements Command<FPState> {
	name = "GenerateSpace";
	private prevSpaces!: Space[];
	constructor(private points: Point[]) {}
	execute(store: Store<FPState>) {
		this.prevSpaces = store.getState().spaces;
		store.mutate((s) => ({ ...s }));
	}
	undo(store: Store<FPState>) {
		store.mutate((s) => ({ ...s, spaces: this.prevSpaces }));
	}
}

/** 将当前选区作为新空间提交（名称、描述、单元格） */
export class AddSpaceCmd implements Command<FPState> {
	name = "AddSpace";
	private prevSpaces!: Space[];
	private prevSelected!: Cell[];
	private createdSpaceId: string | null = null;
	constructor(
		private spaceName: string,
		private description: string | undefined,
		private cells: Cell[]
	) {}
	getCreatedSpaceIds() {
		return this.createdSpaceId ? [this.createdSpaceId] : [];
	}
	execute(store: Store<FPState>) {
		this.prevSpaces = store.getState().spaces;
		this.prevSelected = store.getState().selectedCells;
		const clamped = this.cells.map(clampCell);
		const segs = cellsToBorderSegments(clamped);
		this.createdSpaceId = `${Date.now()}-${Math.random()}`;
		const newSpace: Space = {
			id: this.createdSpaceId,
			name: this.spaceName,
			description: this.description,
			cells: clamped,
			segs,
		};
		store.mutate((s) => ({
			...s,
			spaces: [...s.spaces, newSpace],
			selectedCells: [],
		}));
	}
	undo(store: Store<FPState>) {
		store.mutate((s) => ({
			...s,
			spaces: this.prevSpaces,
			selectedCells: this.prevSelected,
		}));
	}
}