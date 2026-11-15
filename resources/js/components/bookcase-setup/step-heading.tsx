export function StepHeading({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-[32px] leading-tight font-extrabold tracking-tighter">
                {title}
            </h1>
            <p className="max-w-110 text-[15px] font-medium text-muted">
                {description}
            </p>
        </div>
    );
}
