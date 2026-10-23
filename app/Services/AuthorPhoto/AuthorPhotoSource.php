<?php

namespace App\Services\AuthorPhoto;

/** An external place to find the photo of an author already identified by Open Library records. */
interface AuthorPhotoSource
{
    /**
     * @param  list<AuthorRecord>  $records  records of the same person
     */
    public function findPhotoUrl(array $records): ?string;
}
