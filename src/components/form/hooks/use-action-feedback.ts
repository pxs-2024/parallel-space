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
const useActionFeedback = (actionState: ActionState, Options: UserActionFeedbackOptions) => {
	const prevTimestamp = useRef(actionState.timestamp);

	useEffect(() => {
		const isNewer = actionState.timestamp > prevTimestamp.current;
		if (!isNewer) {
			return;
		} // 如果actionState的时间戳小于prevTimestamp，则不执行后续逻辑
		prevTimestamp.current = actionState.timestamp;

		if (actionState.status === "SUCCESS") {
			Options.onSuccess?.({ actionState });
		} else if (actionState.status === "ERROR") {
			Options.onError?.({ actionState });
		}
	});
};

export { useActionFeedback };
