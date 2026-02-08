import { useEffect, useRef } from "react";
import { ActionState } from "../utils/to-action-state";

type OnArgs = {
	actionState: ActionState;
};

type UserActionFeedbackOptions = {
	onSuccess?: (args: OnArgs) => void;
	onError?: (args: OnArgs) => void;
};

/**
 * 使用动作反馈
 * @param actionState - 动作状态
 * @param Options - 选项
 * @returns 
 */
const useActionFeedback = (actionState: ActionState, options: UserActionFeedbackOptions) => {
	const prevTimestamp = useRef(actionState.timestamp);
	const optionsRef = useRef(options);
	optionsRef.current = options;

	useEffect(() => {
		const isNewer = actionState.timestamp > prevTimestamp.current;
		if (!isNewer) return;
		prevTimestamp.current = actionState.timestamp;
		const opts = optionsRef.current;
		if (actionState.status === "SUCCESS") {
			opts.onSuccess?.({ actionState });
		} else if (actionState.status === "ERROR") {
			opts.onError?.({ actionState });
		}
	}, [actionState.timestamp, actionState.status, actionState]);
};

export { useActionFeedback };
