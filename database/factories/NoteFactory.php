<?php

namespace Database\Factories;

use App\Enums\NoteKind;
use App\Models\Book;
use App\Models\Note;
use App\Services\NoteService;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Note>
 */
class NoteFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'book_id' => Book::factory(),
            'page' => fake()->optional()->numberBetween(1, 300),
            'kind' => fake()->randomElement(NoteKind::cases()),
            'body_md' => fake()->sentence(),
            'next_review_at' => null,
        ];
    }

    /** Tags e texto de busca, como o serviço faria ao salvar. */
    public function configure(): static
    {
        return $this->afterCreating(fn (Note $note) => app(NoteService::class)->refreshDerived($note));
    }
}
