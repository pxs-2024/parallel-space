import { toast } from "sonner";
import { useActionFeedback } from "./hooks/use-action-feedback";
import { ActionState } from "./utils/to-action-state";

type FormProps = {
	action: (payload: FormData) => void;
	actionState: ActionState;
	children: React.ReactNode;
	onSuccess?: (actionState: ActionState) => void;
	onError?: (actionState: ActionState) => void;
};

/**
 * 
 * @param action - 动作
 * @param actionState - 动作状态
 * @param children - 子组件
 * @param onSuccess - 成功回调
 * @param onError - 错误回调
 * @returns 
 */
const Form = ({ action, actionState, children, onSuccess, onError }: FormProps) => {
	useActionFeedback(actionState, {
		onSuccess({ actionState }) {
			if (actionState.message) {
				toast.success(actionState.message);
			}
			onSuccess?.(actionState);
		},
		onError({ actionState }) {
			if (actionState.message) {
				toast.error(actionState.message);
			}
			onError?.(actionState);
		},
	});

	return (
		<form action={action} className="flex flex-col gap-y-2">
			{children}
		</form>
	);
};

export { Form };
