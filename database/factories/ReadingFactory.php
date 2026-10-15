<?php

namespace Database\Factories;

use App\Enums\ReadingStatus;
use App\Models\Reading;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Reading>
 */
class ReadingFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'status' => ReadingStatus::QueroLer,
        ];
    }
}
