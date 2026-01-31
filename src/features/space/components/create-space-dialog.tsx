"use client";

import { useState, useActionState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/form/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/form/field-error";
import { SubmitButton } from "@/components/form/submit-button";
import { createSpace } from "@/features/space/actions/create-space";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";

type CreateSpaceDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
};

const CreateSpaceDialog = ({
	open,
	onOpenChange,
	onSuccess,
}: CreateSpaceDialogProps) => {
	const [actionState, action] = useActionState(createSpace, EMPTY_ACTION_STATE);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");

	useEffect(() => {
		if (actionState?.payload && actionState.status === "ERROR") {
			setName((actionState.payload.get("name") as string) ?? "");
			setDescription((actionState.payload.get("description") as string) ?? "");
		}
	}, [actionState?.payload, actionState?.status]);

	useEffect(() => {
		if (!open) {
			setName("");
			setDescription("");
		}
	}, [open]);

	const handleSuccess = () => {
		if (actionState.status === "SUCCESS") {
			onOpenChange(false);
			setName("");
			setDescription("");
			onSuccess?.();
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[400px]">
				<DialogHeader>
					<DialogTitle>新增空间</DialogTitle>
				</DialogHeader>
				<Form action={action} actionState={actionState} onSuccess={handleSuccess}>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="space-name">空间名称 *</Label>
							<Input
								id="space-name"
								name="name"
								placeholder="请输入空间名称"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
								autoFocus
							/>
							<FieldError actionState={actionState} name="name" />
						</div>
						<div className="space-y-2">
							<Label htmlFor="space-description">空间描述</Label>
							<Input
								id="space-description"
								name="description"
								placeholder="请输入空间描述（可选）"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
							/>
							<FieldError actionState={actionState} name="description" />
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							取消
						</Button>
						<SubmitButton label="创建" />
					</DialogFooter>
				</Form>
			</DialogContent>
		</Dialog>
	);
};

export { CreateSpaceDialog };
