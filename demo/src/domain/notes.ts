import type { ReadModel } from './read-model';

export function tagNamesOf(model: ReadModel, noteId: number): string[] {
    return model.tagNamesByNote.get(noteId) ?? [];
}
