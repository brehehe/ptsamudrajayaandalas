<?php

namespace App\Providers;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Expression;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
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
        Event::listen('eloquent.booted: *', function ($eventName, array $data) {
            $model = $data[0];
            $modelClass = get_class($model);

            if (str_starts_with($modelClass, 'App\\')) {
                $modelClass::addGlobalScope('default_order', function (Builder $builder) {
                    $query = $builder->getQuery();
                    if (empty($query->orders) && empty($query->groups) && empty($query->aggregate) && empty($query->distinct) && empty($query->unions)) {
                        // Check if any custom selected columns contain aggregate functions
                        $hasAggregate = false;
                        if (! empty($query->columns)) {
                            foreach ($query->columns as $column) {
                                $colStr = $column instanceof Expression
                                    ? $column->getValue(DB::connection()->getQueryGrammar())
                                    : (string) $column;

                                if (preg_match('/\b(count|sum|avg|min|max|stddev|variance|string_agg|array_agg|json_agg|jsonb_agg)\s*\(/i', $colStr)) {
                                    $hasAggregate = true;
                                    break;
                                }
                            }
                        }

                        if (! $hasAggregate) {
                            $model = $builder->getModel();
                            if ($model->getKeyName()) {
                                $builder->orderBy($model->getTable().'.'.$model->getKeyName(), 'asc');
                            }
                        }
                    }
                });
            }
        });

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
