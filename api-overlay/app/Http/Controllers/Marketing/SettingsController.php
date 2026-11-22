<?php

namespace App\Http\Controllers\Marketing;

use App\Models\MarketingExpense;
use App\Models\MarketingSetting;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SettingsController extends MarketingController
{
    /** GET /api/creator-program - what the public partnership page needs. */
    public function publicProgram()
    {
        $s = MarketingSetting::all_();

        return ['applications_open' => $s['applications_open'] === '1', 'disclosure_text' => $s['disclosure_text']];
    }

    public function show()
    {
        return MarketingSetting::all_();
    }

    public function update(Request $request)
    {
        $v = $request->validate([
            'applications_open' => ['nullable', 'boolean'],
            'notify_email' => ['nullable', 'email:rfc', 'max:190'],
            'reminder_after_days' => ['nullable', 'integer', 'min:1', 'max:90'],
            'disclosure_text' => ['nullable', 'string', 'max:600'],
        ]);
        foreach ($v as $k => $val) {
            $val = is_bool($val) ? ($val ? '1' : '0') : (string) ($val ?? '');
            MarketingSetting::updateOrCreate(['key' => $k], ['value' => $val]);
        }

        return MarketingSetting::all_();
    }

    // ----- other expenses (sampling and paid fees come from their own records) -----

    public function expenses(Request $request)
    {
        return MarketingExpense::when($request->filled('campaign_id'), fn ($q) => $q->where('campaign_id', (int) $request->query('campaign_id')))->orderByDesc('id')->limit(300)->get();
    }

    public function storeExpense(Request $request)
    {
        $v = $request->validate([
            'campaign_id' => ['nullable', 'integer', 'exists:campaigns,id'],
            'creator_id' => ['nullable', 'integer', 'exists:creators,id'],
            'kind' => ['required', Rule::in(['other'])],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:10000000'],
            'spent_on' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:300'],
        ]);

        return response()->json(MarketingExpense::create($v), 201);
    }

    public function destroyExpense(MarketingExpense $expense)
    {
        $expense->delete();

        return response()->noContent();
    }
}
