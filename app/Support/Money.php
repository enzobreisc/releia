<?php

namespace App\Support;

/** Conversão de valores digitados em reais para centavos inteiros. */
final class Money
{
    /**
     * Aceita "34,90", "34.90", "1.234,56", "R$ 5,5" e "10". Devolve null se não for um valor.
     * Sem float: o número é montado a partir dos dígitos, para não haver erro de arredondamento.
     */
    public static function parseReais(?string $value): ?int
    {
        $value = trim(str_replace(['R$', ' ', "\u{a0}"], '', (string) $value));

        if ($value === '') {
            return null;
        }

        // Vírgula é o separador decimal do português; o ponto antes dela é de milhar.
        if (str_contains($value, ',')) {
            $value = str_replace(['.', ','], ['', '.'], $value);
        }

        if (preg_match('/^\d+(\.\d{1,2})?$/', $value) !== 1) {
            return null;
        }

        [$reais, $centavos] = array_pad(explode('.', $value, 2), 2, '');
        $centavos = str_pad(substr($centavos, 0, 2), 2, '0');

        return (int) $reais * 100 + (int) $centavos;
    }
}
