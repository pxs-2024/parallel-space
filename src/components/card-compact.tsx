import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";

type CardCompactProps = {
	title: string;
	description: string;
	content?: React.ReactNode;
	className?: string;
	footer?: React.ReactNode;
};

const CardCompact = ({ title, description, content, className = "", footer }: CardCompactProps) => {
	return (
		<Card className={className || undefined}>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			{content && (
			<CardContent className="min-h-0 flex-1 overflow-visible pt-3 pb-2">
				{content}
			</CardContent>
		)}
			{footer && <CardFooter>{footer}</CardFooter>}
		</Card>
	);
};

export { CardCompact };