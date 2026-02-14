"use client";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type InputNameDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	name: string;
	onNameChange: (value: string) => void;
	description: string;
	onDescriptionChange: (value: string) => void;
	onConfirm: () => void;
	/** 弹窗标题，默认「生成图形」 */
	title?: string;
};

export function InputNameDialog({
	open,
	onOpenChange,
	name,
	onNameChange,
	description,
	onDescriptionChange,
	onConfirm,
	title = "生成图形",
}: InputNameDialogProps) {
	const handleConfirm = () => {
		onConfirm();
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4 py-2">
					<div className="grid gap-2">
						<Label htmlFor="name">名称</Label>
						<Input
							id="name"
							type="text"
							placeholder="请输入图形名称"
							value={name}
							onChange={(e) => onNameChange(e.target.value)}
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="desc">描述</Label>
						<Input
							id="desc"
							type="text"
							placeholder="请输入描述（可选）"
							value={description}
							onChange={(e) => onDescriptionChange(e.target.value)}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						取消
					</Button>
					<Button onClick={handleConfirm}>确定</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
