import { useState } from 'react';
import { DemoMenu } from './demo-menu';
import { RestoreDialog } from './restore-dialog';

/** The phone tab bar's "Mais" opens the same menu as the header's ⋯ button. */
export function MobileMenuSheet({ onClose }: { onClose: () => void }) {
    const [isRestoring, setRestoring] = useState(false);

    if (isRestoring) {
        return <RestoreDialog onClose={onClose} />;
    }

    return <DemoMenu onClose={onClose} onRestore={() => setRestoring(true)} />;
}
