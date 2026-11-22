<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CouponRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // admin-only via route middleware
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('code')) {
            $this->merge(['code' => strtoupper(trim((string) $this->input('code')))]);
        }
    }

    public function rules(): array
    {
        $id = $this->route('coupon')?->id;

        return [
            'code' => ['required', 'string', 'max:30', 'regex:/^[A-Z0-9_-]+$/', Rule::unique('coupons', 'code')->ignore($id)],
            'title' => ['required', 'string', 'max:120'],
            'type' => ['required', 'in:percent,flat'],
            'value' => ['required', 'numeric', 'gt:0', function ($a, $v, $fail) {
                if ($this->input('type') === 'percent' && $v > 100) {
                    $fail('A percentage discount cannot be more than 100.');
                }
            }],
            'min_order' => ['nullable', 'numeric', 'min:0'],
            'max_discount' => ['nullable', 'numeric', 'gt:0'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['nullable', 'boolean'],
            'is_public' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'code.regex' => 'Use only capital letters, numbers, - and _ in the code.',
            'code.unique' => 'This code already exists.',
            'ends_at.after_or_equal' => 'The end date cannot be before the start date.',
        ];
    }
}
