import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { update as updateProfile } from '@/routes/profile';

type ReaderFields = { name: string | null; bio: string | null };

export function useReaderEditor(reader: ReaderFields) {
    const [editing, setEditing] = useState(false);
    const form = useForm({ name: reader.name ?? '', bio: reader.bio ?? '' });

    function save(event: FormEvent) {
        event.preventDefault();
        form.put(updateProfile.url(), {
            preserveScroll: true,
            onSuccess: () => setEditing(false),
        });
    }

    function startEditing() {
        setEditing(true);
    }

    function cancel() {
        form.reset();
        setEditing(false);
    }

    return { editing, form, save, startEditing, cancel };
}

export type ReaderEditor = ReturnType<typeof useReaderEditor>;
