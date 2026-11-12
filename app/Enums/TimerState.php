<?php

namespace App\Enums;

enum TimerState: string
{
    case Idle = 'idle';
    case Reading = 'reading';
    case Paused = 'paused';
}
