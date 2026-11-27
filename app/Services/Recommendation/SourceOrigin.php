<?php

namespace App\Services\Recommendation;

/** Where a search source comes from: a rating, the "want to read" shelf, the shopping list or a request. */
enum SourceOrigin: string
{
    case Rated = 'rated';
    case WantToRead = 'want_to_read';
    case Shopping = 'shopping';
    case Requested = 'requested';
}
