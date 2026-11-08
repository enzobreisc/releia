import type { Forecast } from '@/types';

const MIN_SCALE = 1;

export function calculateForecastBars(forecast: Forecast) {
    const scale = Math.max(forecast.goal ?? 0, forecast.projection, MIN_SCALE);

    return {
        booksPercent: (forecast.books / scale) * 100,
        projectionPercent: (forecast.projection / scale) * 100,
    };
}
