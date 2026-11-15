import { useState } from 'react';
import type { FormEvent } from 'react';
import { GroupChip } from '@/components/bookcase-setup/group-chip';
import { Dialog } from '@/components/dialog';
import { Button, Field, Input } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import { MERGED_NAME_SEPARATOR } from '@/lib/shelf/setup';
import type { ShelfDraft } from '@/lib/shelf/setup';
import type { ShelfGroup } from '@/types';

const MAX_NAME_LENGTH = 60;
const MIN_MERGED_GROUPS = 2;

export function MergeGroupsDialog({
    groups,
    onMerge,
    onClose,
}: {
    groups: ShelfGroup[];
    onMerge: (merge: ShelfDraft) => void;
    onClose: () => void;
}) {
    const { t, translateText } = useTranslation();
    const [pickedKeys, setPickedKeys] = useState<string[]>([]);
    const [name, setName] = useState('');
    const suggestedName = groups
        .filter((group) => pickedKeys.includes(group.key))
        .map((group) => translateText(group.label))
        .join(MERGED_NAME_SEPARATOR)
        .slice(0, MAX_NAME_LENGTH);

    function toggle(key: string) {
        setPickedKeys((picked) =>
            picked.includes(key)
                ? picked.filter((other) => other !== key)
                : [...picked, key],
        );
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        onMerge({ name: name.trim() || suggestedName, groupKeys: pickedKeys });
        onClose();
    }

    return (
        <Dialog title={t('Unir prateleiras')} onClose={onClose}>
            <form onSubmit={submit} className="flex flex-col gap-4">
                <p className="text-[13px] font-medium text-secondary">
                    {t('Marque os grupos que vão dividir a mesma prateleira.')}
                </p>
                <div className="flex flex-wrap gap-2">
                    {groups.map((group) => (
                        <GroupChip
                            key={group.key}
                            group={group}
                            selected={pickedKeys.includes(group.key)}
                            onToggle={() => toggle(group.key)}
                        />
                    ))}
                </div>
                <Field label={t('Nome')}>
                    <Input
                        maxLength={MAX_NAME_LENGTH}
                        value={name}
                        placeholder={suggestedName}
                        onChange={(event) => setName(event.target.value)}
                    />
                </Field>
                <div className="flex justify-end gap-2.5">
                    <Button variant="ghost" onClick={onClose}>
                        {t('Cancelar')}
                    </Button>
                    <Button
                        type="submit"
                        disabled={pickedKeys.length < MIN_MERGED_GROUPS}
                    >
                        {t('Unir')}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
