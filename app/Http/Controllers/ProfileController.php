<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => session('status'),
            'profileInfo' => [
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->getPrimaryRoleName(),
                'title' => $user->isStaff() ? 'Staf Lapangan' : ($user->isDirector() ? 'Direktur Utama' : ($user->isOwner() ? 'Owner Perusahaan' : 'Admin Operasional')),
                'phone' => '0812 3456 7890',
                'department' => $user->isStaff() ? 'Operasional Lapangan' : ($user->isOperationalAdmin() ? 'Administrasi & Keagenan' : 'Direksi & Manajemen'),
                'location' => 'Surabaya',
                'company' => 'PT. Samudra Jaya Andalas',
            ],
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
