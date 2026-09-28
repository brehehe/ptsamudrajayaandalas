<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        @if (request()->isSecure() || request()->header('x-forwarded-proto') === 'https' || str_starts_with((string) config('app.url'), 'https://') || !app()->environment('local'))
            <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
        @endif

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <!-- Theme Initialization (Prevents FOUC) -->
        <script>
            (function() {
                try {
                    const theme = localStorage.getItem('sja_theme');
                    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                        document.documentElement.classList.add('dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                    }
                } catch (e) {}
            })();
        </script>

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
