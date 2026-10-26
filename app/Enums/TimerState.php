<?php

namespace App\Enums;

/** What the reading timer is doing, as the phone widget shows it. */
enum TimerState: string
{
    case Idle = 'idle';
    case Reading = 'reading';
    case Paused = 'paused';
}
