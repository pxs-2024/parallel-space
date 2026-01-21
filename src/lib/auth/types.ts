export type SessionPublic = {
	id: string;
	userId: string;
	createdAt: Date;
	user: UserPublic;
};

export type UserPublic = {
	id: string;
	username: string;
	email: string;
};

export type SessionWithToken = SessionPublic & {
	token: string; // <ID>.<SECRET>
};