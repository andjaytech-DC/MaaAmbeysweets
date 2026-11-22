<?php

namespace App\Http\Requests;

use App\Models\Order;
use Illuminate\Foundation\Http\FormRequest;

class OrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // guests may order; a logged-in customer is linked automatically
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'phone' => Order::normalizePhone($this->input('phone')),
            'recipient_phone' => $this->filled('recipient_phone') ? Order::normalizePhone($this->input('recipient_phone')) : null,
            'is_gift' => filter_var($this->input('is_gift', false), FILTER_VALIDATE_BOOLEAN),
        ]);
    }

    public function rules(): array
    {
        return [
            'customer_name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'regex:/^[6-9]\d{9}$/'],
            'email' => ['nullable', 'email', 'max:255'],
            'fulfilment' => ['required', 'in:delivery,pickup'],
            'address_line' => ['required_if:fulfilment,delivery', 'nullable', 'string', 'max:255'],
            'city' => ['required_if:fulfilment,delivery', 'nullable', 'string', 'max:100'],
            'pincode' => ['required_if:fulfilment,delivery', 'nullable', 'digits:6', function ($attr, $value, $fail) {
                $area = config('shop.service_pincodes');
                if ($this->input('fulfilment') === 'delivery' && $area && ! in_array($value, $area, true)) {
                    $fail('Sorry, we do not deliver to this pincode yet. Choose pickup, or message us on WhatsApp.');
                }
            }],
            'notes' => ['nullable', 'string', 'max:500'],
            'coupon' => ['nullable', 'string', 'max:30'],
            'use_points' => ['nullable', 'integer', 'min:0'],
            'is_gift' => ['boolean'],
            'recipient_name' => ['required_if:is_gift,true', 'nullable', 'string', 'max:120'],
            'recipient_phone' => ['required_if:is_gift,true', 'nullable', 'regex:/^[6-9]\d{9}$/'],
            'gift_message' => ['nullable', 'string', 'max:300'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.option' => ['nullable', 'string', 'max:30'],
            'items.*.choices' => ['nullable', 'array', 'max:24'],
            'items.*.choices.*' => ['integer', 'exists:products,id'],
            'items.*.qty' => ['required', 'integer', 'min:1', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.regex' => 'Enter a valid 10-digit mobile number.',
            'recipient_name.required_if' => 'Enter who the gift is for.',
            'recipient_phone.required_if' => 'Enter the receiver\'s mobile number so the rider can reach them.',
            'recipient_phone.regex' => 'Enter a valid 10-digit mobile number for the receiver.',
            'address_line.required_if' => 'Enter the delivery address.',
            'city.required_if' => 'Enter the city.',
            'pincode.required_if' => 'Enter the 6-digit pincode.',
            'pincode.digits' => 'Pincode must be 6 digits.',
            'items.required' => 'Your cart is empty.',
            'items.min' => 'Your cart is empty.',
        ];
    }
}
