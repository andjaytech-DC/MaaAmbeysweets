<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => 'Email or password is incorrect.']);
        }

        return [
            'token' => $user->createToken('web')->plainTextToken,
            'user' => $user->only(['id', 'name', 'email', 'phone', 'role']),
        ];
    }

    public function register(Request $request)
    {
        $request->merge(['phone' => Order::normalizePhone($request->input('phone'))]);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'regex:/^[6-9]\d{9}$/'],
            'password' => ['required', 'string', 'min:8', 'max:100'],
        ], [
            'email.unique' => 'An account with this email already exists. Try logging in.',
            'phone.regex' => 'Enter a valid 10-digit mobile number.',
            'password.min' => 'Password must be at least 8 characters.',
        ]);

        $user = User::create($data + ['role' => 'customer']);

        return response()->json([
            'token' => $user->createToken('web')->plainTextToken,
            'user' => $user->only(['id', 'name', 'email', 'phone', 'role']),
        ], 201);
    }

    public function me(Request $request)
    {
        return $request->user()->only(['id', 'name', 'email', 'phone', 'role']);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }
}
