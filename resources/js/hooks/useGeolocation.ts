import { useEffect, useState } from 'react';

export interface GeolocationState {
    latitude: number | null;
    longitude: number | null;
    locationName: string;
    loading: boolean;
    error: string | null;
    refresh: () => void;
}

export function useGeolocation(defaultLocationName = ''): GeolocationState {
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [locationName, setLocationName] = useState<string>(defaultLocationName);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const detectLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation tidak didukung oleh browser Anda.');
            return;
        }

        setLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                setLatitude(lat);
                setLongitude(lon);

                // Reverse geocoding to human-readable address
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
                        { headers: { 'Accept-Language': 'id' } }
                    );
                    if (res.ok) {
                        const data = await res.json();
                        const addr = data.address || {};
                        const parts = [
                            addr.quay || addr.harbour || addr.port || addr.industrial || addr.road || addr.suburb || data.display_name?.split(',')[0],
                            addr.city_district || addr.city || addr.town || addr.county,
                        ].filter(Boolean);

                        const detected = parts.join(', ');
                        if (detected) {
                            setLocationName(detected);
                        }
                    }
                } catch {
                    setLocationName(defaultLocationName);
                } finally {
                    setLoading(false);
                }
            },
            (err) => {
                // User denied or unavailable
                setError(err.message);
                setLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 60000,
            }
        );
    };

    useEffect(() => {
        detectLocation();
    }, []);

    return {
        latitude,
        longitude,
        locationName,
        loading,
        error,
        refresh: detectLocation,
    };
}
