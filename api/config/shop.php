<?php

// Shop rules. CHANGE THESE to the real delivery charges before launch.
return [
    'delivery_fee' => (float) env('SHOP_DELIVERY_FEE', 40),
    'free_delivery_above' => (float) env('SHOP_FREE_DELIVERY_ABOVE', 500),
    'min_order' => (float) env('SHOP_MIN_ORDER', 0),
    // Pincodes you deliver to, comma separated in api/.env (SHOP_PINCODES=208001,208002). Empty = accept any pincode.
    'service_pincodes' => array_values(array_filter(array_map('trim', explode(',', (string) env('SHOP_PINCODES', ''))))),
    'service_area_label' => env('SHOP_AREA_LABEL', ''),
    // Optional: email address that gets a copy of every bulk enquiry (needs MAIL_* settings in api/.env).
    'name' => env('SHOP_NAME', 'Maa Ambey Sweets'),
    'notify_driver' => env('SHOP_NOTIFY_DRIVER', 'log'), // log | webhook
    'notify_webhook_url' => env('SHOP_NOTIFY_WEBHOOK_URL'),
    'notify_email' => env('SHOP_NOTIFY_EMAIL'),
    // Loyalty points. PLACEHOLDERS: confirm with the owner. 0.1 = 1 point per Rs 10; 1 point = Rs 0.25 (about 2.5% back).
    'points_per_rupee' => (float) env('SHOP_POINTS_PER_RUPEE', 0.1),
    'point_value' => (float) env('SHOP_POINT_VALUE', 0.25),
    'min_redeem' => (int) env('SHOP_MIN_REDEEM', 100),
    'max_redeem_percent' => (int) env('SHOP_MAX_REDEEM_PERCENT', 20),
    'expiry_warning_days' => (int) env('SHOP_EXPIRY_WARNING_DAYS', 3),
    'statuses' => ['received', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled'],
];
