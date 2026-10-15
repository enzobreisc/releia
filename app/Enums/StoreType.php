<?php

namespace App\Enums;

/** Onde o livro da lista de compras pode ser comprado. */
enum StoreType: string
{
    case UsedBookstore = 'used_bookstore';
    case Bookstore = 'bookstore';
    case Online = 'online';

    public function label(): string
    {
        return match ($this) {
            self::UsedBookstore => 'Sebo',
            self::Bookstore => 'Livraria',
            self::Online => 'Online',
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
