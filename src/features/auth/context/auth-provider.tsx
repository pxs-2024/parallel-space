"use client";

import {
	createContext,
	useContext,
	type ReactNode,
} from "react";
import type { UserPublic } from "@/lib/auth/types";

type AuthContextValue = {
	user: UserPublic | null;
	isFetched: true;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
	initialUser,
	children,
}: {
	initialUser: UserPublic | null;
	children: ReactNode;
}) {
	return (
		<AuthContext.Provider value={{ user: initialUser, isFetched: true }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuthContext(): AuthContextValue {
	const ctx = useContext(AuthContext);
	// 未包裹 Provider 时（如测试）降级为未登录，避免报错
	if (ctx === null) {
		return { user: null, isFetched: true };
	}
	return ctx;
}
