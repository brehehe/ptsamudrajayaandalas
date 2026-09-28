import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'sja_theme';

export function useTheme() {
    const [theme, setThemeState] = useState<Theme>(() => {
        if (typeof window === 'undefined') return 'system';
        const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
        return stored || 'system';
    });

    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window === 'undefined') return 'light';
        return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });

    const applyTheme = useCallback((targetTheme: Theme) => {
        const isDark =
            targetTheme === 'dark' ||
            (targetTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

        if (isDark) {
            document.documentElement.classList.add('dark');
            setResolvedTheme('dark');
        } else {
            document.documentElement.classList.remove('dark');
            setResolvedTheme('light');
        }

        if (targetTheme === 'system') {
            localStorage.removeItem(STORAGE_KEY);
        } else {
            localStorage.setItem(STORAGE_KEY, targetTheme);
        }

        window.dispatchEvent(
            new CustomEvent('sja_theme_change', {
                detail: { theme: targetTheme, resolved: isDark ? 'dark' : 'light' },
            })
        );
    }, []);

    const setTheme = useCallback(
        (newTheme: Theme) => {
            setThemeState(newTheme);
            applyTheme(newTheme);
        },
        [applyTheme]
    );

    const toggleTheme = useCallback(() => {
        const nextTheme: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
    }, [resolvedTheme, setTheme]);

    useEffect(() => {
        const handleSync = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail) {
                setThemeState(customEvent.detail.theme);
                setResolvedTheme(customEvent.detail.resolved);
            }
        };

        const handleStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) {
                const newTheme = (e.newValue as Theme) || 'system';
                setThemeState(newTheme);
                applyTheme(newTheme);
            }
        };

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleMediaChange = () => {
            if (theme === 'system') {
                applyTheme('system');
            }
        };

        window.addEventListener('sja_theme_change', handleSync);
        window.addEventListener('storage', handleStorage);
        mediaQuery.addEventListener('change', handleMediaChange);

        return () => {
            window.removeEventListener('sja_theme_change', handleSync);
            window.removeEventListener('storage', handleStorage);
            mediaQuery.removeEventListener('change', handleMediaChange);
        };
    }, [theme, applyTheme]);

    return {
        theme,
        resolvedTheme,
        isDark: resolvedTheme === 'dark',
        setTheme,
        toggleTheme,
    };
}

export default useTheme;
