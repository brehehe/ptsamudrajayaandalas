<?php

namespace Database\Factories;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PushSubscription>
 */
class PushSubscriptionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'token' => fake()->unique()->regexify('[A-Za-z0-9_-]{180}'),
            'platform' => 'web',
            'device_name' => fake()->randomElement(['Chrome Desktop', 'Chrome Android', 'Safari Mobile']),
            'user_agent' => fake()->userAgent(),
            'last_seen_at' => now(),
        ];
    }
}
