import { Button } from '@/components/form';

export function DangerButton({
    children,
    onClick,
    disabled,
}: {
    children: string;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <Button
            variant="danger"
            onClick={onClick}
            disabled={disabled}
            className="h-10 text-[13px]"
        >
            {children}
        </Button>
    );
}
