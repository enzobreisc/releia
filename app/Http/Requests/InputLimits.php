<?php

namespace App\Http\Requests;

/** Maximum lengths of the free-text fields shared by the profile and the bookshelves. */
final class InputLimits
{
    public const NAME = 60;

    public const BIO = 160;
}
