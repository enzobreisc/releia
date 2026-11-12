<?php

namespace App\Services\AuthorPhoto;

interface AuthorPhotoSource
{
    /**
     * @param  list<AuthorRecord>  $records  records of the same person
     */
    public function findPhotoUrl(array $records): ?string;
}
