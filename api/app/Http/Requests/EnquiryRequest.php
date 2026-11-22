<?php

namespace App\Http\Requests;

use App\Models\Order;
use Illuminate\Foundation\Http\FormRequest;

class EnquiryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['phone' => Order::normalizePhone($this->input('phone'))]);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'regex:/^[6-9]\d{9}$/'],
            'email' => ['nullable', 'email', 'max:255', 'required_if:contact_via,email'],
            'occasion' => ['required', 'in:wedding,festival,corporate,party,other'],
            'items_text' => ['required', 'string', 'max:1000'],
            'quantity_text' => ['required', 'string', 'max:100'],
            'needed_by' => ['nullable', 'date', 'after_or_equal:today'],
            'fulfilment' => ['required', 'in:delivery,pickup'],
            'city' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'contact_via' => ['required', 'in:whatsapp,call,email'],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.regex' => 'Enter a valid 10-digit mobile number.',
            'email.required_if' => 'Enter your email so we can confirm by email.',
            'items_text.required' => 'Tell us which sweets you need.',
            'quantity_text.required' => 'Tell us roughly how much you need, for example 20 kg laddu or 50 boxes.',
            'needed_by.after_or_equal' => 'Choose today or a later date.',
        ];
    }
}
