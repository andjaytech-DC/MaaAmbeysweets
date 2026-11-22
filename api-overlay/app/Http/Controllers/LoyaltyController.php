<?php

namespace App\Http\Controllers;

use App\Models\LoyaltyEntry;
use Illuminate\Http\Request;

class LoyaltyController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();

        return [
            'balance' => $user->pointsBalance(),
            'history' => LoyaltyEntry::where('user_id', $user->id)->orderByDesc('id')->limit(20)
                ->get(['type', 'points', 'created_at']),
        ];
    }
}
