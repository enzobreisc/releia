import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { EditorForm } from './types';

export function useAuthorDraft(form: EditorForm) {
    const [authorDraft, setAuthorDraft] = useState('');

    function addAuthor() {
        const name = authorDraft.trim().replace(/,$/, '');

        if (name !== '' && !form.data.authors.includes(name)) {
            form.setData('authors', [...form.data.authors, name]);
        }

        setAuthorDraft('');
    }

    function onAuthorKey(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            addAuthor();
        } else if (
            event.key === 'Backspace' &&
            // Holding the key repeats the event and would delete several authors at once.
            !event.repeat &&
            authorDraft === '' &&
            form.data.authors.length > 0
        ) {
            form.setData('authors', form.data.authors.slice(0, -1));
        }
    }

    return { authorDraft, setAuthorDraft, addAuthor, onAuthorKey };
}
