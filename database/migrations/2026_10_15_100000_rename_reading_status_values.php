<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** Troca os status salvos em português pelos valores em inglês do enum ReadingStatus. */
return new class extends Migration
{
    /** @var array<string, string> */
    private const RENAMES = [
        'quero_ler' => 'want_to_read',
        'lendo' => 'reading',
        'lido' => 'read',
        'abandonado' => 'abandoned',
    ];

    public function up(): void
    {
        $this->rename(self::RENAMES);
    }

    public function down(): void
    {
        $this->rename(array_flip(self::RENAMES));
    }

    /**
     * @param  array<string, string>  $map
     */
    private function rename(array $map): void
    {
        foreach ($map as $from => $to) {
            DB::table('readings')->where('status', $from)->update(['status' => $to]);
        }
    }
};
