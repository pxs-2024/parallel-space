export type Position = {
	x: number;
	y: number;
	id: string;
}

export type Viewport = {
	vx:number,
	vy:number,
	scale:number,
}

export type Space = {
	id: string;
	name: string;
	description: string;
}


export type ContainerAsset = {
	id: string;
	name: string;
	description: string;
	orderIndex: number;
};