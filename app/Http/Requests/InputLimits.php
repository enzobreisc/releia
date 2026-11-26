<?php

namespace App\Http\Requests;

final class InputLimits
{
    public const NAME = 60;

    public const BIO = 160;

    public const API_KEY_MIN = 20;

    public const API_KEY_MAX = 200;
}
