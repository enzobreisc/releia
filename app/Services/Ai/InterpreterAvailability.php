<?php

namespace App\Services\Ai;

enum InterpreterAvailability: string
{
    case Ready = 'ready';
    case ServerUnreachable = 'server_unreachable';
    case ModelMissing = 'model_missing';
}
