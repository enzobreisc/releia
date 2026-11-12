<?php

use App\Support\StatsPeriod;
use Carbon\Carbon;

beforeEach(fn () => Carbon::setTestNow('2026-11-12 10:00:00'));

afterEach(fn () => Carbon::setTestNow());

test('a year period runs from January 1st to December 31st', function () {
    $period = StatsPeriod::year(2026);

    expect($period->start->format('Y-m-d'))->toBe('2026-01-01')
        ->and($period->end->format('Y-m-d'))->toBe('2026-12-31')
        ->and($period->history)->toBeFalse();
});

test('a leap year has 366 days', function () {
    expect(StatsPeriod::year(2028)->daysInYear())->toBe(366);
});

test('a common year has 365 days, including a century year that is not a leap year', function (int $year) {
    expect(StatsPeriod::year($year)->daysInYear())->toBe(365);
})->with([2026, 2100]);

test('a history period runs from the first record until today', function () {
    $period = StatsPeriod::history(new DateTimeImmutable('2025-03-10 15:45:00'));

    expect($period->start->format('Y-m-d'))->toBe('2025-03-10')
        ->and($period->end->format('Y-m-d'))->toBe('2026-11-12')
        ->and($period->history)->toBeTrue();
});

test('the last N days include today and count N days', function () {
    $period = StatsPeriod::lastDays(7);

    expect($period->start->format('Y-m-d'))->toBe('2026-11-06')
        ->and($period->end->format('Y-m-d'))->toBe('2026-11-12')
        ->and($period->elapsedDays())->toBe(7);
});

test('the elapsed days of the current year stop at today', function () {
    expect(StatsPeriod::year(2026)->elapsedDays())->toBe(316);
});

test('the elapsed days of a past year cover the whole year', function () {
    expect(StatsPeriod::year(2025)->elapsedDays())->toBe(365);
});

test('a future year has no elapsed days', function () {
    expect(StatsPeriod::year(2027)->elapsedDays())->toBe(0);
});

test('the last day of a past year is its December 31st', function () {
    expect(StatsPeriod::year(2025)->lastDay()->format('Y-m-d'))->toBe('2025-12-31');
});

test('the last day of the current year is today, not a future date', function () {
    expect(StatsPeriod::year(2026)->lastDay()->format('Y-m-d'))->toBe('2026-11-12');
});
