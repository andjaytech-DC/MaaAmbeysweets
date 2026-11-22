<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // access is enforced by auth:sanctum + EnsureAdmin middleware
    }

    protected function prepareForValidation(): void
    {
        // weight options arrive as a JSON string in multipart forms
        if (is_string($this->input('weight_options'))) {
            $decoded = json_decode($this->input('weight_options'), true);
            $this->merge(['weight_options' => is_array($decoded) ? $decoded : []]);
        }

        // multipart forms send booleans as strings ("true"/"1"/"on")
        if ($this->has('is_active')) {
            $this->merge([
                'is_active' => filter_var($this->input('is_active'), FILTER_VALIDATE_BOOLEAN),
            ]);
        }
    }

    public function rules(): array
    {
        $id = $this->route('product')?->id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'sku' => ['required', 'string', 'max:64', Rule::unique('products', 'sku')->ignore($id)],
            'barcode' => ['nullable', 'string', 'max:64', Rule::unique('products', 'barcode')->ignore($id)],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'description' => ['nullable', 'string', 'max:5000'],
            'price' => ['required', 'numeric', 'min:0'],
            'mrp' => ['nullable', 'numeric', 'min:0', 'gte:price'],
            'unit' => ['nullable', 'string', 'max:50'],
            'shelf_life' => ['nullable', 'string', 'max:60'],
            'ingredients' => ['nullable', 'string', 'max:2000'],
            'weight_options' => ['nullable', 'array', 'max:8'],
            'weight_options.*.label' => ['required', 'string', 'max:30', 'distinct'],
            'weight_options.*.price' => ['required', 'numeric', 'min:0'],
            'hamper_capacity' => ['nullable', 'integer', 'between:2,24'],
            'hamper_eligible' => ['nullable', 'boolean'],
            'stock' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
            'images' => ['nullable', 'array', 'max:8'],
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:'.(int) config('media.max_kb', 5120)],
            'remove_image_ids' => ['nullable', 'array'],
            'remove_image_ids.*' => ['integer'],
        ];
    }

    public function messages(): array
    {
        return [
            'sku.unique' => 'This SKU is already used by another product.',
            'barcode.unique' => 'This barcode is already used by another product.',
            'mrp.gte' => 'MRP cannot be lower than the selling price.',
            'weight_options.*.label.required' => 'Each weight option needs a label such as 500 g.',
            'weight_options.*.label.distinct' => 'Weight option labels must be different.',
            'weight_options.*.price.required' => 'Each weight option needs a price.',
            'images.*.max' => 'Each image must be 5 MB or smaller.',
            'images.*.image' => 'Only JPG, PNG or WebP images are allowed.',
        ];
    }
}
