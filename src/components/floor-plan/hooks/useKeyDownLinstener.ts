import { useEffect, useRef } from "react";

const useSpaceKeyListener = () => {
	const spaceKeyRef = useRef(false);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.code === "Space") {
				e.preventDefault();
				spaceKeyRef.current = true;
			}
		};
		const onKeyUp = (e: KeyboardEvent) => {
			if (e.code === "Space") spaceKeyRef.current = false;
		};
		window.addEventListener("keydown", onKeyDown, { passive: false });
		window.addEventListener("keyup", onKeyUp);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
		};
	}, []);

	return spaceKeyRef;
};

export { useSpaceKeyListener };
