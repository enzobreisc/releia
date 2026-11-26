<?php

namespace App\Services\Recommendation;

/** Where a search source comes from: a rating, the "want to read" shelf or the shopping list. */
enum SourceOrigin: string
{
    case Rated = 'rated';
    case WantToRead = 'want_to_read';
    case Shopping = 'shopping';
}
