"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Form } from "@/components/form/form";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/form/field-error";
import { SubmitButton } from "@/components/form/submit-button";
import { createAsset } from "@/features/space/actions/create-asset";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";

type CreateAssetDrawerProps = {
	spaceId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
};

const CreateAssetDrawer = ({
	spaceId,
	open,
	onOpenChange,
	onSuccess,
}: CreateAssetDrawerProps) => {
	const [actionState, action] = useActionState(
		createAsset.bind(null, spaceId),
		EMPTY_ACTION_STATE
	);

	const handleSuccess = () => {
		if (actionState.status === "SUCCESS") {
			onOpenChange(false);
			onSuccess?.();
		}
	};

	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent side="right">
				<DrawerHeader>
					<DrawerTitle>新建物品</DrawerTitle>
				</DrawerHeader>
				<div className="px-6 pb-6">
					<Form action={action} actionState={actionState} onSuccess={handleSuccess}>
						<div className="space-y-4">
							<div>
								<Input
									name="name"
									placeholder="物品名称"
									defaultValue={actionState.payload?.get("name") as string}
									required
								/>
								<FieldError actionState={actionState} name="name" />
							</div>
							<div>
								<Input
									name="description"
									placeholder="物品描述（可选）"
									defaultValue={actionState.payload?.get("description") as string}
								/>
								<FieldError actionState={actionState} name="description" />
							</div>
						</div>
						<DrawerFooter>
							<SubmitButton label="创建" />
						</DrawerFooter>
					</Form>
				</div>
			</DrawerContent>
		</Drawer>
	);
};

export { CreateAssetDrawer };
