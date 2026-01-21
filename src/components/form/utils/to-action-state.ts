import { file, ZodError } from "zod";
import { fi } from "zod/locales";

export type ActionState<T = any> = {
	status?: "SUCCESS" | "ERROR";
	message: string;
	payload?: FormData;
	fieldErrors: Record<string, string[] | undefined>;
	timestamp: number;
	data?: T;
};

export const EMPTY_ACTION_STATE: ActionState = {
	message: "",
	fieldErrors: {},
	timestamp: Date.now(),
};

/**
 * 将错误转换为 ActionState
 * @param error - 错误
 * @param formData - 表单数据
 * @returns ActionState
 */
export const fromErrorToActionState = (error: unknown, formData: FormData): ActionState => {
	if (error instanceof ZodError) {
		return {
			status: "ERROR",
			message: "",
			payload: formData,
			fieldErrors: error.flatten().fieldErrors,
			timestamp: Date.now(),
		};
	} else if (error instanceof Error) {
		return {
			status: "ERROR",
			message: error.message,
			payload: formData,
			fieldErrors: {},
			timestamp: Date.now(),
		};
	} else {
		return {
			status: "ERROR",
			message: "An unknown error occurred",
			payload: formData,
			fieldErrors: {},
			timestamp: Date.now(),
		};
	}
};

/**
 * 
 * @param status - 状态
 * @param message - 消息
 * @param payload - 表单数据
 * @param data - 数据
 * @returns ActionState
 */
export const toActionState = (
	status: "SUCCESS" | "ERROR",
	message: string,
	payload?: FormData,
	data?: unknown
): ActionState => {
	return {
		status,
		message,
		payload,
		fieldErrors: {},
		timestamp: Date.now(),
		data,
	};
};
