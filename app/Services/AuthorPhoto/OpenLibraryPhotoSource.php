<?php

namespace App\Services\AuthorPhoto;

class OpenLibraryPhotoSource implements AuthorPhotoSource
{
    public function findPhotoUrl(array $records): ?string
    {
        foreach ($records as $record) {
            if ($record->photoUrls !== []) {
                return $record->photoUrls[0];
            }
        }

        return null;
    }
}
