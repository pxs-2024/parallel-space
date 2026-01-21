import { useState } from "react";
import { getAuth } from "../queries/get-auth";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { UserPublic } from "@/lib/auth/types";

const useAuth = () => {
	const [user, setUser] = useState<UserPublic | null>(null);
	const [isFetched, setIsFetched] = useState(false);

	const pathName = usePathname();

	useEffect(() => {
		const fetchUser = async () => {
			const auth = await getAuth();
			setUser(auth ? auth.user : null);
			setIsFetched(true);
		};
		fetchUser();
	}, [pathName]);
	return { user, isFetched };
};

export { useAuth };
