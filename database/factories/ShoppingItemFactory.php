<?php

namespace Database\Factories;

use App\Enums\StoreType;
use App\Models\ShoppingItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ShoppingItem>
 */
class ShoppingItemFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'book_id' => null,
            'title' => fake()->sentence(3),
            'author' => fake()->name(),
            'isbn' => null,
            'cover_url' => null,
            'url' => null,
            'store_type' => fake()->randomElement(StoreType::cases()),
            'is_priority' => false,
            'estimated_price_cents' => fake()->numberBetween(1000, 9000),
            'price_checked_at' => null,
            'bought_at' => null,
        ];
    }
}
