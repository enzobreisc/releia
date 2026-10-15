<?php

namespace Database\Factories;

use App\Enums\BookSource;
use App\Enums\ReadingStatus;
use App\Models\Book;
use App\Models\Reading;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Book>
 */
class BookFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(3),
            'publisher' => fake()->company(),
            'published_year' => fake()->numberBetween(1900, 2026),
            'pages' => fake()->numberBetween(80, 900),
            'genre' => fake()->randomElement(['Romance', 'Ficção', 'Tecnologia', 'História']),
            'source' => BookSource::Manual,
        ];
    }

    /**
     * @param  list<string>  $authors
     */
    public function withAuthors(array $authors): static
    {
        return $this->afterCreating(function (Book $book) use ($authors) {
            $book->syncAuthors($authors);
            $book->refreshSearchText();
        });
    }

    public function onShelf(ReadingStatus $status): static
    {
        return $this->has(Reading::factory()->state(['status' => $status]));
    }

    public function configure(): static
    {
        return $this->afterCreating(fn (Book $book) => $book->refreshSearchText());
    }
}
