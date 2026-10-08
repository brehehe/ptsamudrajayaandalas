<?php

namespace App\Support;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use JsonException;
use RuntimeException;

class FirebaseCloudMessaging
{
    private const TOKEN_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

    public function isConfigured(): bool
    {
        return filled(config('services.firebase.project_id'))
            && filled(config('services.firebase.credentials_base64'));
    }

    /**
     * @param  array{
     *     title: string,
     *     body: string,
     *     url: string,
     *     action_label?: string,
     *     tone?: string,
     *     entity_type?: string|null,
     *     entity_id?: string|null,
     *     notification_id?: string|null
     * }  $payload
     */
    public function send(string $deviceToken, array $payload): bool
    {
        if (! $this->isConfigured()) {
            return false;
        }

        $projectId = (string) config('services.firebase.project_id');
        $response = Http::acceptJson()
            ->withToken($this->accessToken())
            ->connectTimeout(3)
            ->timeout(10)
            ->post("https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send", [
                'message' => [
                    'token' => $deviceToken,
                    'data' => $this->stringData($payload),
                    'webpush' => [
                        'headers' => [
                            'TTL' => '86400',
                            'Urgency' => 'high',
                        ],
                        'fcm_options' => [
                            'link' => $this->absoluteUrl($payload['url']),
                        ],
                    ],
                ],
            ]);

        if ($response->successful()) {
            return true;
        }

        if ($this->isInvalidTokenResponse($response)) {
            return false;
        }

        $response->throw();

        return false;
    }

    private function accessToken(): string
    {
        $projectId = (string) config('services.firebase.project_id');
        $cacheKey = 'firebase-fcm-access-token:'.hash('sha256', $projectId);
        $cachedToken = Cache::get($cacheKey);

        if (is_string($cachedToken) && $cachedToken !== '') {
            return $cachedToken;
        }

        $credentials = $this->credentials();
        $tokenUri = $credentials['token_uri'] ?: 'https://oauth2.googleapis.com/token';
        $response = Http::asForm()
            ->connectTimeout(3)
            ->timeout(10)
            ->post($tokenUri, [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $this->signedAssertion($credentials, $tokenUri),
            ])
            ->throw();

        $accessToken = $response->json('access_token');
        if (! is_string($accessToken) || $accessToken === '') {
            throw new RuntimeException('Firebase OAuth tidak mengembalikan access token.');
        }

        $expiresIn = max(300, (int) $response->json('expires_in', 3600));
        Cache::put($cacheKey, $accessToken, now()->addSeconds($expiresIn - 120));

        return $accessToken;
    }

    /**
     * @return array{client_email: string, private_key: string, token_uri: string}
     */
    private function credentials(): array
    {
        $encodedCredentials = (string) config('services.firebase.credentials_base64');
        $decodedCredentials = base64_decode($encodedCredentials, true);

        if ($decodedCredentials === false) {
            throw new RuntimeException('FIREBASE_CREDENTIALS_BASE64 tidak valid.');
        }

        try {
            $credentials = json_decode($decodedCredentials, true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new RuntimeException('Kredensial Firebase bukan JSON yang valid.', previous: $exception);
        }

        if (! is_array($credentials)) {
            throw new RuntimeException('Kredensial Firebase tidak valid.');
        }

        $clientEmail = $credentials['client_email'] ?? null;
        $privateKey = $credentials['private_key'] ?? null;
        $tokenUri = $credentials['token_uri'] ?? 'https://oauth2.googleapis.com/token';
        $credentialProjectId = $credentials['project_id'] ?? null;

        if (! is_string($clientEmail) || ! is_string($privateKey) || ! is_string($tokenUri)) {
            throw new RuntimeException('Kredensial Firebase tidak memiliki field wajib.');
        }

        if ($credentialProjectId !== config('services.firebase.project_id')) {
            throw new RuntimeException('Project ID kredensial Firebase tidak sesuai konfigurasi.');
        }

        return [
            'client_email' => $clientEmail,
            'private_key' => $privateKey,
            'token_uri' => $tokenUri,
        ];
    }

    /**
     * @param  array{client_email: string, private_key: string, token_uri: string}  $credentials
     */
    private function signedAssertion(array $credentials, string $tokenUri): string
    {
        $issuedAt = now()->timestamp;
        $segments = [
            $this->base64UrlEncode(json_encode([
                'alg' => 'RS256',
                'typ' => 'JWT',
            ], JSON_THROW_ON_ERROR)),
            $this->base64UrlEncode(json_encode([
                'iss' => $credentials['client_email'],
                'scope' => self::TOKEN_SCOPE,
                'aud' => $tokenUri,
                'iat' => $issuedAt,
                'exp' => $issuedAt + 3600,
            ], JSON_THROW_ON_ERROR)),
        ];
        $unsignedToken = implode('.', $segments);
        $signature = '';

        if (! openssl_sign($unsignedToken, $signature, $credentials['private_key'], OPENSSL_ALGO_SHA256)) {
            throw new RuntimeException('Gagal menandatangani permintaan OAuth Firebase.');
        }

        $segments[] = $this->base64UrlEncode($signature);

        return implode('.', $segments);
    }

    /**
     * @param  array<string, string|null>  $payload
     * @return array<string, string>
     */
    private function stringData(array $payload): array
    {
        return collect($payload)
            ->reject(fn (mixed $value): bool => $value === null)
            ->map(fn (mixed $value): string => is_bool($value) ? ($value ? '1' : '0') : (string) $value)
            ->all();
    }

    private function absoluteUrl(string $path): string
    {
        return Str::startsWith($path, ['http://', 'https://']) ? $path : url($path);
    }

    private function isInvalidTokenResponse(Response $response): bool
    {
        return collect($response->json('error.details', []))
            ->contains(fn (mixed $detail): bool => is_array($detail)
                && ($detail['errorCode'] ?? null) === 'UNREGISTERED');
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
