import { buttonClass } from '@/components/form';
import { resetDemo } from '../state/store';
import { useEscapeKey } from './use-escape-key';
import { useShellCopy } from './use-shell-copy';

export function RestoreDialog({ onClose }: { onClose: () => void }) {
    const copy = useShellCopy().restore;

    useEscapeKey(onClose);

    const restore = () => {
        resetDemo();
        window.location.assign(import.meta.env.BASE_URL);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4">
            <div
                role="alertdialog"
                aria-modal="true"
                aria-label={copy.dialogLabel}
                className="flex w-full max-w-110 flex-col gap-3.5 rounded-md bg-elevated p-6 inset-ring inset-ring-strong"
            >
                <h2 className="text-xl font-extrabold">{copy.title}</h2>
                <p className="text-sm leading-relaxed font-medium text-secondary">
                    {copy.body}
                </p>
                <div className="flex justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className={buttonClass('ghost')}
                    >
                        {copy.cancel}
                    </button>
                    <button
                        type="button"
                        onClick={restore}
                        className={buttonClass('primary')}
                    >
                        {copy.confirm}
                    </button>
                </div>
            </div>
        </div>
    );
}
