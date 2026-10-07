<?php

test('public registration is disabled', function () {
    $response = $this->get('/register');

    $response->assertNotFound();

    $this->post('/register', [
        'name' => 'Pengguna Tidak Sah',
        'email' => 'unauthorized@example.com',
        'password' => 'secret-password',
        'password_confirmation' => 'secret-password',
    ])->assertNotFound();

    $this->assertGuest();
});
