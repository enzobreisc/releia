<?php

namespace App\Services\Ai;

interface RequestInterpreter
{
    /**
     * @throws InterpreterUnavailable
     */
    public function interpret(string $text): ReadingFilters;

    public function availability(): InterpreterAvailability;
}
