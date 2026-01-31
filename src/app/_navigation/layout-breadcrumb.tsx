"use client";

import * as React from "react";
import { usePathname, Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type BreadcrumbSegment = {
	href: string;
	label: string;
	isCurrent: boolean;
};

function useBreadcrumbSegments(): BreadcrumbSegment[] {
	const pathname = usePathname();
	const tSide = useTranslations("side");
	const tAccount = useTranslations("account");
	const tBreadcrumb = useTranslations("breadcrumb");

	const segments = pathname.split("/").filter(Boolean);
	if (segments.length === 0) return [];

	const result: BreadcrumbSegment[] = [];
	let href = "";

	for (let i = 0; i < segments.length; i++) {
		const seg = segments[i];
		href += `/${seg}`;
		const isLast = i === segments.length - 1;

		let label: string;
		if (segments[0] === "decisions") {
			label = tSide("decisions");
		} else if (segments[0] === "spaces") {
			if (i === 0) label = tSide("spaces");
			else if (i === 1 && seg !== "actions") label = tBreadcrumb("spaceDetail");
			else if (seg === "actions") label = tBreadcrumb("actions");
			else label = seg;
		} else if (segments[0] === "history") {
			label = tSide("history");
		} else if (segments[0] === "account") {
			if (i === 0) label = tSide("account");
			else if (seg === "profile") label = tAccount("profile");
			else if (seg === "password") label = tAccount("password");
			else label = seg;
		} else {
			label = seg;
		}

		result.push({ href, label, isCurrent: isLast });
	}

	return result;
}

export function LayoutBreadcrumb() {
	const segments = useBreadcrumbSegments();

	if (segments.length === 0) return null;

	return (
		<Breadcrumb className="mb-4">
			<BreadcrumbList>
				{segments.map((seg, index) => (
					<React.Fragment key={seg.href}>
						<BreadcrumbItem>
							{seg.isCurrent ? (
								<BreadcrumbPage>{seg.label}</BreadcrumbPage>
							) : (
								<BreadcrumbLink asChild>
									<Link href={seg.href}>{seg.label}</Link>
								</BreadcrumbLink>
							)}
						</BreadcrumbItem>
						{index < segments.length - 1 && <BreadcrumbSeparator />}
					</React.Fragment>
				))}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
