import type { ReactNode } from 'react';

export function ErrorAlert({ children }: { children: ReactNode }) {
    return (
        <div
            role="alert"
            className="flex flex-col items-start gap-1.5 rounded-sm bg-danger-fill/15 px-3.5 py-3 text-xs leading-relaxed text-danger inset-ring inset-ring-danger-line"
        >
            {children}
        </div>
    );
}
