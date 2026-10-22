<?php

namespace App\Enums;

/** Where a book on the shopping list can be bought. */
enum StoreType: string
{
    case UsedBookstore = 'used_bookstore';
    case Bookstore = 'bookstore';
    case Online = 'online';

    public function label(): string
    {
        return match ($this) {
            self::UsedBookstore => __('Sebo'),
            self::Bookstore => __('Livraria'),
            self::Online => __('Online'),
        };
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $store) => ['value' => $store->value, 'label' => $store->label()],
            self::cases(),
        );
    }
}
