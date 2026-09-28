<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        if (
            $this->app->environment('production')
            || str_starts_with((string) config('app.url'), 'https://')
            || (! $this->app->runningInConsole() && (
                request()->isSecure()
                || request()->header('x-forwarded-proto') === 'https'
                || request()->header('x-forwarded-ssl') === 'on'
                || request()->server('HTTP_X_FORWARDED_PROTO') === 'https'
            ))
        ) {
            URL::forceScheme('https');
        }
    }
}
