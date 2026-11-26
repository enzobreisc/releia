<?php

namespace App\Services\Ai;

enum EmbeddingAvailability: string
{
    case Ready = 'ready';
    case ServerUnreachable = 'server_unreachable';
    case ModelMissing = 'model_missing';
}
