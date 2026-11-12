export type PinnedBook = {
    id: number;
    title: string;
    authors: string;
    genre: string | null;
    cover_url: string | null;
    rating: number | null;
};

export type ActivityItem =
    | {
          type: 'finished';
          book_id: number;
          title: string;
          date: string;
          rating: number | null;
      }
    | {
          type: 'session';
          book_id: number;
          title: string;
          date: string;
          pages: number;
      }
    | { type: 'added'; book_id: number; title: string; date: string }
    | { type: 'reread'; book_id: number; title: string; date: string };

export type Reader = { name: string | null; bio: string | null };

export type ReaderTotals = {
    books_read: number;
    pages_read: number;
    pages_per_day: number | null;
    streak: number;
    longest_streak: number;
};

export type GenreCount = { label: string; count: number };

export type PinOption = { id: number; title: string };
