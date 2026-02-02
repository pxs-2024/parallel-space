"use client";

import { Fragment, useState, useActionState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/form/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/form/field-error";
import { SubmitButton } from "@/components/form/submit-button";
import { createAsset } from "@/features/space/actions/create-asset";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import { ChevronLeft, ChevronRight } from "lucide-react";

// 定义 AssetKind 枚举，避免在客户端导入 Prisma 类型
enum AssetKind {
	STATIC = "STATIC",
	CONSUMABLE = "CONSUMABLE",
	TEMPORAL = "TEMPORAL",
	VIRTUAL = "VIRTUAL",
}

type CreateAssetDialogProps = {
	spaceId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
	initialPosition?: { x: number; y: number } | null;
};

const ASSET_KIND_OPTIONS = [
	{ value: AssetKind.STATIC, label: "静态物品" },
	{ value: AssetKind.CONSUMABLE, label: "消耗型物品" },
	{ value: AssetKind.TEMPORAL, label: "时间型物品" },
	{ value: AssetKind.VIRTUAL, label: "虚拟物品" },
] as const;

const CreateAssetDialog = ({
	spaceId,
	open,
	onOpenChange,
	onSuccess,
	initialPosition,
}: CreateAssetDialogProps) => {
	const [step, setStep] = useState(1);
	const [kind, setKind] = useState<AssetKind>(AssetKind.STATIC);
	const [actionState, action] = useActionState(
		createAsset.bind(null, spaceId),
		EMPTY_ACTION_STATE
	);
	const [step1Data, setStep1Data] = useState<{ name: string; description: string }>({
		name: "",
		description: "",
	});

	// 当 actionState 有错误时，恢复步骤1的数据
	useEffect(() => {
		if (actionState?.payload && actionState.status === "ERROR") {
			const name = actionState.payload.get("name") as string;
			const description = actionState.payload.get("description") as string;
			if (name !== undefined || description !== undefined) {
				setStep1Data({
					name: name || "",
					description: description || "",
				});
			}
		}
	}, [actionState?.payload, actionState?.status]);

	const handleSuccess = () => {
		if (actionState.status === "SUCCESS") {
			onOpenChange(false);
			setStep(1);
			setKind(AssetKind.STATIC); // 重置
			setStep1Data({ name: "", description: "" }); // 重置
			onSuccess?.();
		}
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			setStep(1);
			setKind(AssetKind.STATIC); // 关闭时重置
			setStep1Data({ name: "", description: "" }); // 重置
		}
		onOpenChange(open);
	};

	// 格式化日期为 datetime-local 输入格式
	const formatDateForInput = (date: Date | string | undefined): string => {
		if (!date) return "";
		const d = typeof date === "string" ? new Date(date) : date;
		return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
			.toISOString()
			.slice(0, 16);
	};

	// 计算总步数
	const totalSteps = kind === AssetKind.STATIC ? 1 : 2;
	const isLastStep = step === totalSteps;

	// 验证当前步骤
	const validateStep = (): boolean => {
		if (step === 1) {
			// 验证名称
			return !!step1Data.name?.trim();
		}
		return true;
	};

	const handleNext = () => {
		if (validateStep()) {
			setStep((prev) => Math.min(prev + 1, totalSteps));
		}
	};

	const handlePrevious = () => {
		setStep((prev) => Math.max(prev - 1, 1));
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto scrollbar-hide">
				<DialogHeader>
					<DialogTitle>新建物品</DialogTitle>
					{/* 步骤指示器 */}
					{totalSteps > 1 && (
						<div className="flex items-center gap-2 pt-2">
							{Array.from({ length: totalSteps }).map((_, index) => {
								const stepNum = index + 1;
								const isActive = step === stepNum;
								const isCompleted = step > stepNum;
								return (
									<Fragment key={stepNum}>
										<div
											className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
												isActive
													? "bg-primary text-primary-foreground"
													: isCompleted
														? "bg-primary/20 text-primary"
														: "bg-muted text-muted-foreground"
											}`}
										>
											{isCompleted ? "✓" : stepNum}
										</div>
										{index < totalSteps - 1 && (
											<div
												className={`h-0.5 flex-1 transition-colors ${
													isCompleted ? "bg-primary" : "bg-muted"
												}`}
											/>
										)}
									</Fragment>
								);
							})}
						</div>
					)}
				</DialogHeader>
				<Form action={action} actionState={actionState} onSuccess={handleSuccess}>
					<div className="space-y-4 py-4">
						{/* 步骤1：基本信息 */}
						{step === 1 ? (
							<div className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="name">物品名称 *</Label>
									<Input
										id="name"
										name="name"
										placeholder="请输入物品名称"
										value={step1Data.name}
										onChange={(e) => setStep1Data((prev) => ({ ...prev, name: e.target.value }))}
										required
										autoFocus
									/>
									<FieldError actionState={actionState} name="name" />
								</div>

								<div className="space-y-2">
									<Label htmlFor="description">物品描述</Label>
									<Input
										id="description"
										name="description"
										placeholder="请输入物品描述（可选）"
										value={step1Data.description}
										onChange={(e) =>
											setStep1Data((prev) => ({ ...prev, description: e.target.value }))
										}
									/>
									<FieldError actionState={actionState} name="description" />
								</div>

								<div className="space-y-2">
									<Label htmlFor="kind">物品类型 *</Label>
									<input type="hidden" name="kind" value={kind} />
									<Select
										value={kind}
										onValueChange={(value) => {
											setKind(value as AssetKind);
											// 如果选择静态物品，直接可以提交，否则进入下一步
											if (value === AssetKind.STATIC) {
												setStep(1);
											}
										}}
									>
										<SelectTrigger id="kind" className="w-full">
											<SelectValue placeholder="选择物品类型" />
										</SelectTrigger>
										<SelectContent>
											{ASSET_KIND_OPTIONS.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FieldError actionState={actionState} name="kind" />
								</div>
								
								{/* 位置信息 */}
								{initialPosition && (
									<>
										<input type="hidden" name="x" value={initialPosition.x} />
										<input type="hidden" name="y" value={initialPosition.y} />
									</>
								)}
							</div>
						) : (
							// 步骤2时，隐藏步骤1的字段但保留在表单中
							<>
								<input type="hidden" name="name" value={step1Data.name} />
								<input type="hidden" name="description" value={step1Data.description} />
								<input type="hidden" name="kind" value={kind} />
								{/* 位置信息 */}
								{initialPosition && (
									<>
										<input type="hidden" name="x" value={initialPosition.x} />
										<input type="hidden" name="y" value={initialPosition.y} />
									</>
								)}
							</>
						)}

						{/* 步骤2：根据类型显示相关字段 */}
						{step === 2 && (
							<div className="space-y-4">
								{kind === AssetKind.CONSUMABLE && (
									<>
										<h3 className="text-sm font-medium mb-4">消耗型物品设置</h3>
										<div className="space-y-2">
											<Label htmlFor="quantity">数量</Label>
											<Input
												id="quantity"
												name="quantity"
												type="number"
												min="0"
												placeholder="请输入数量"
												defaultValue={actionState.payload?.get("quantity") as string}
											/>
											<FieldError actionState={actionState} name="quantity" />
										</div>
										<div className="space-y-2">
											<Label htmlFor="unit">单位</Label>
											<Input
												id="unit"
												name="unit"
												placeholder="如：个、瓶、kg等"
												defaultValue={actionState.payload?.get("unit") as string}
											/>
											<FieldError actionState={actionState} name="unit" />
										</div>
										<div className="space-y-2">
											<Label htmlFor="reorderPoint">补货提醒点</Label>
											<Input
												id="reorderPoint"
												name="reorderPoint"
												type="number"
												min="0"
												placeholder="数量低于此值时触发提醒"
												defaultValue={actionState.payload?.get("reorderPoint") as string}
											/>
											<FieldError actionState={actionState} name="reorderPoint" />
										</div>
										<div className="space-y-2">
											<Label htmlFor="consumeIntervalDays">消耗周期（天）</Label>
											<Input
												id="consumeIntervalDays"
												name="consumeIntervalDays"
												type="number"
												min="1"
												placeholder="每隔多少天消耗一次"
												defaultValue={actionState.payload?.get("consumeIntervalDays") as string}
											/>
											<FieldError actionState={actionState} name="consumeIntervalDays" />
										</div>
										<div className="space-y-2">
											<Label htmlFor="consumeAmountPerTime">每次消耗数量</Label>
											<Input
												id="consumeAmountPerTime"
												name="consumeAmountPerTime"
												type="number"
												min="0"
												placeholder="每次消耗多少个"
												defaultValue={actionState.payload?.get("consumeAmountPerTime") as string}
											/>
											<FieldError actionState={actionState} name="consumeAmountPerTime" />
										</div>
									</>
								)}

								{kind === AssetKind.TEMPORAL && (
									<>
										<h3 className="text-sm font-medium mb-4">时间型物品设置</h3>
										<div className="space-y-2">
											<Label htmlFor="dueAt">过期时间</Label>
											<Input
												id="dueAt"
												name="dueAt"
												type="datetime-local"
												defaultValue={formatDateForInput(
													actionState.payload?.get("dueAt") as string | undefined
												)}
											/>
											<FieldError actionState={actionState} name="dueAt" />
										</div>
									</>
								)}

								{kind === AssetKind.VIRTUAL && (
									<>
										<h3 className="text-sm font-medium mb-4">虚拟物品设置</h3>
										<div className="space-y-2">
											<Label htmlFor="refUrl">参考链接</Label>
											<Input
												id="refUrl"
												name="refUrl"
												type="url"
												placeholder="https://example.com"
												defaultValue={actionState.payload?.get("refUrl") as string}
											/>
											<FieldError actionState={actionState} name="refUrl" />
										</div>
										<div className="space-y-2">
											<Label htmlFor="expiresAt">过期时间</Label>
											<Input
												id="expiresAt"
												name="expiresAt"
												type="datetime-local"
												defaultValue={formatDateForInput(
													actionState.payload?.get("expiresAt") as string | undefined
												)}
											/>
											<FieldError actionState={actionState} name="expiresAt" />
										</div>
									</>
								)}
							</div>
						)}
					</div>
					<DialogFooter className="gap-2">
						{step > 1 && (
							<Button type="button" variant="outline" onClick={handlePrevious}>
								<ChevronLeft className="mr-2 h-4 w-4" />
								上一步
							</Button>
						)}
						{!isLastStep ? (
							<Button type="button" onClick={handleNext}>
								下一步
								<ChevronRight className="ml-2 h-4 w-4" />
							</Button>
						) : (
							<SubmitButton label="创建" />
						)}
					</DialogFooter>
				</Form>
			</DialogContent>
		</Dialog>
	);
};

export { CreateAssetDialog };
