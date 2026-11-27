<?php

namespace App\Http\Requests;

final class InputLimits
{
    public const NAME = 60;

    public const BIO = 160;

    public const API_KEY_MIN = 20;

    public const API_KEY_MAX = 200;

    public const SUGGESTION_TEXT = 200;

    /** One author name, as typed in a request or written by the model. */
    public const SUGGESTION_AUTHOR_NAME = 100;

    /** Authors a request may list after they are matched to yours: one name can match several. */
    public const SUGGESTION_AUTHORS = 20;

    /** Names the model may answer with: anything beyond is ignored. */
    public const SUGGESTION_MODEL_AUTHORS = 5;

    public const SUGGESTION_PAGES = 10000;
}
