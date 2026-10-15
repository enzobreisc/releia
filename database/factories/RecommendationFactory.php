<?php

namespace Database\Factories;

use App\Enums\RecommendationStatus;
use App\Models\Book;
use App\Models\Recommendation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Recommendation>
 */
class RecommendationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(3),
            'author' => fake()->name(),
            'reason' => 'mesmo autor que um livro seu',
            'based_on_book_id' => Book::factory(),
            'status' => RecommendationStatus::New,
        ];
    }
}
