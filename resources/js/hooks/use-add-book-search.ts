import { router } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { create as addBook } from '@/routes/books';
import type { Candidate } from '@/types';

export type BookSearch = {
    term: string;
    publisherFilter: string;
    searching: boolean;
    setTerm: (term: string) => void;
    setPublisherFilter: (publisherFilter: string) => void;
    submit: (event: FormEvent) => void;
};

type BookSearchCallbacks = {
    onBeforeSearch: () => void;
    onPublisherMatch: (workKey: string) => void;
};

export function useAddBookSearch(
    initial: { query: string; publisher: string },
    callbacks: BookSearchCallbacks,
): BookSearch {
    const [term, setTerm] = useState(initial.query);
    const [publisherFilter, setPublisherFilter] = useState(initial.publisher);
    const [searching, setSearching] = useState(false);

    function submit(event: FormEvent) {
        event.preventDefault();
        callbacks.onBeforeSearch();
        router.get(
            addBook.url(),
            {
                q: term.trim() || undefined,
                publisher: publisherFilter.trim() || undefined,
            },
            {
                preserveState: true,
                replace: true,
                onStart: () => setSearching(true),
                onFinish: () => setSearching(false),
                onSuccess: (page) => {
                    const first = (page.props.results as Candidate[])[0];

                    if (publisherFilter.trim() && first?.work_key) {
                        callbacks.onPublisherMatch(first.work_key);
                    }
                },
            },
        );
    }

    return {
        term,
        publisherFilter,
        searching,
        setTerm,
        setPublisherFilter,
        submit,
    };
}
