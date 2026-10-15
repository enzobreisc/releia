<?php

namespace Database\Factories;

use App\Models\ReadingSession;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ReadingSession>
 */
class ReadingSessionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $from = fake()->numberBetween(1, 200);

        return [
            'read_on' => fake()->dateTimeBetween('-1 year')->format('Y-m-d'),
            'page_from' => $from,
            'page_to' => $from + fake()->numberBetween(5, 40),
            'minutes' => fake()->optional()->numberBetween(10, 90),
        ];
    }
}
