<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BatchController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CouponController;
use App\Http\Controllers\EnquiryController;
use App\Http\Controllers\LoyaltyController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductImageController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\Marketing\AffiliateController;
use App\Http\Controllers\Marketing\AnalyticsController;
use App\Http\Controllers\Marketing\ApplicationController;
use App\Http\Controllers\Marketing\CampaignController;
use App\Http\Controllers\Marketing\CollaborationController;
use App\Http\Controllers\Marketing\ContentController;
use App\Http\Controllers\Marketing\CreatorController;
use App\Http\Controllers\Marketing\SampleController;
use App\Http\Controllers\Marketing\SettingsController;
use App\Http\Controllers\Marketing\SocialChannelController;
use App\Http\Middleware\EnsureAdmin;
use Illuminate\Support\Facades\Route;

// Public
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/site-media', [MediaController::class, 'publicIndex']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/lookup/{code}', [ProductController::class, 'lookup']);
Route::get('/products/{id}', [ProductController::class, 'show'])->whereNumber('id');
Route::get('/products/{id}/reviews', [ReviewController::class, 'index'])->whereNumber('id');

Route::post('/enquiries', [EnquiryController::class, 'store'])->middleware('throttle:10,1');
Route::get('/offers', [CouponController::class, 'offers']);
Route::post('/coupons/check', [CouponController::class, 'check'])->middleware('throttle:30,1');
Route::get('/shop-config', [OrderController::class, 'config']);
Route::post('/orders', [OrderController::class, 'store'])->middleware('throttle:20,1');
Route::get('/orders/track', [OrderController::class, 'track'])->middleware('throttle:20,1');
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

// Creator marketing: public side
Route::get('/social-channels', [SocialChannelController::class, 'publicIndex']);
Route::get('/creator-stories', [ContentController::class, 'stories']);
Route::get('/creator-program', [SettingsController::class, 'publicProgram']);
Route::post('/creator-applications', [ApplicationController::class, 'store'])->middleware('throttle:8,60');
Route::post('/marketing/click', [AffiliateController::class, 'click'])->middleware('throttle:60,1');
Route::prefix('creator/collaborations/{token}')->where(['token' => '[A-Za-z0-9]{20,64}'])->group(function () {
    Route::get('/', [CollaborationController::class, 'publicShow'])->middleware('throttle:60,1');
    Route::post('/respond', [CollaborationController::class, 'publicRespond'])->middleware('throttle:20,1');
    Route::post('/confirm-receipt', [CollaborationController::class, 'publicConfirmReceipt'])->middleware('throttle:20,1');
    Route::post('/content', [CollaborationController::class, 'publicSubmit'])->middleware('throttle:20,1');
});

// Authenticated
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/orders', [OrderController::class, 'mine']);
    Route::get('/me/loyalty', [LoyaltyController::class, 'show']);
    Route::post('/products/{id}/reviews', [ReviewController::class, 'store'])->whereNumber('id')->middleware('throttle:10,1');
    Route::post('/logout', [AuthController::class, 'logout']);

    // Admin only
    Route::prefix('admin')->middleware(EnsureAdmin::class)->group(function () {
        Route::get('/products/{product}/batches', [BatchController::class, 'index'])->whereNumber('product');
        Route::post('/products/{product}/batches', [BatchController::class, 'store'])->whereNumber('product');
        Route::delete('/batches/{batch}', [BatchController::class, 'destroy'])->whereNumber('batch');
        Route::get('/batches/{batch}/orders', [BatchController::class, 'orders'])->whereNumber('batch');
        // Website images: hero slides, banners, gallery, brand (kind=hero|banner|gallery|brand)
        Route::get('/media', [MediaController::class, 'adminIndex']);
        Route::post('/media', [MediaController::class, 'store'])->middleware('throttle:60,1');
        Route::post('/media/reorder', [MediaController::class, 'reorder']);
        Route::post('/media/publish', [MediaController::class, 'publish']);
        Route::match(['put', 'patch', 'post'], '/media/{media}', [MediaController::class, 'update'])->whereNumber('media')->middleware('throttle:60,1');
        Route::delete('/media/{media}', [MediaController::class, 'destroy'])->whereNumber('media');
        Route::get('/categories', [CategoryController::class, 'adminIndex']);
        Route::match(['patch', 'post'], '/categories/{category}', [CategoryController::class, 'update'])->whereNumber('category');
        Route::post('/products/{product}/images/reorder', [ProductImageController::class, 'reorder'])->whereNumber('product');
        Route::post('/products/{product}/images/{image}', [ProductImageController::class, 'update'])->whereNumber(['product', 'image']);
        Route::delete('/products/{product}/images/{image}', [ProductImageController::class, 'destroy'])->whereNumber(['product', 'image']);

        // Marketing & Creators (admin only; several take multipart so a picture can come with the fields)
        Route::prefix('marketing')->group(function () {
            Route::get('/dashboard', [AnalyticsController::class, 'dashboard']);
            Route::get('/analytics', [AnalyticsController::class, 'analytics']);
            Route::get('/settings', [SettingsController::class, 'show']);
            Route::put('/settings', [SettingsController::class, 'update']);
            Route::get('/expenses', [SettingsController::class, 'expenses']);
            Route::post('/expenses', [SettingsController::class, 'storeExpense']);
            Route::delete('/expenses/{expense}', [SettingsController::class, 'destroyExpense'])->whereNumber('expense');

            Route::get('/creators', [CreatorController::class, 'index']);
            Route::post('/creators', [CreatorController::class, 'store'])->middleware('throttle:60,1');
            Route::get('/creators/{creator}', [CreatorController::class, 'show'])->whereNumber('creator');
            Route::match(['put', 'patch', 'post'], '/creators/{creator}', [CreatorController::class, 'update'])->whereNumber('creator')->middleware('throttle:60,1');
            Route::delete('/creators/{creator}', [CreatorController::class, 'destroy'])->whereNumber('creator');

            Route::get('/applications', [ApplicationController::class, 'index']);
            Route::post('/applications/{application}/approve', [ApplicationController::class, 'approve'])->whereNumber('application');
            Route::post('/applications/{application}/reject', [ApplicationController::class, 'reject'])->whereNumber('application');
            Route::delete('/applications/{application}', [ApplicationController::class, 'destroy'])->whereNumber('application');

            Route::get('/campaigns', [CampaignController::class, 'index']);
            Route::post('/campaigns', [CampaignController::class, 'store'])->middleware('throttle:60,1');
            Route::get('/campaigns/{campaign}', [CampaignController::class, 'show'])->whereNumber('campaign');
            Route::match(['put', 'patch', 'post'], '/campaigns/{campaign}', [CampaignController::class, 'update'])->whereNumber('campaign')->middleware('throttle:60,1');
            Route::delete('/campaigns/{campaign}', [CampaignController::class, 'destroy'])->whereNumber('campaign');
            Route::post('/campaigns/{campaign}/invite', [CampaignController::class, 'invite'])->whereNumber('campaign')->middleware('throttle:30,1');

            Route::get('/collaborations', [CollaborationController::class, 'index']);
            Route::get('/collaborations/{collaboration}', [CollaborationController::class, 'show'])->whereNumber('collaboration');
            Route::match(['put', 'patch'], '/collaborations/{collaboration}', [CollaborationController::class, 'update'])->whereNumber('collaboration');
            Route::post('/collaborations/{collaboration}/remind', [CollaborationController::class, 'remind'])->whereNumber('collaboration')->middleware('throttle:20,1');

            Route::get('/samples', [SampleController::class, 'index']);
            Route::post('/samples', [SampleController::class, 'store']);
            Route::get('/samples/{sample}', [SampleController::class, 'show'])->whereNumber('sample');
            Route::match(['put', 'patch'], '/samples/{sample}', [SampleController::class, 'update'])->whereNumber('sample');
            Route::delete('/samples/{sample}', [SampleController::class, 'destroy'])->whereNumber('sample');

            Route::get('/content', [ContentController::class, 'index']);
            Route::post('/content', [ContentController::class, 'store'])->middleware('throttle:60,1');
            Route::match(['put', 'patch', 'post'], '/content/{content}', [ContentController::class, 'update'])->whereNumber('content')->middleware('throttle:60,1');
            Route::delete('/content/{content}', [ContentController::class, 'destroy'])->whereNumber('content');

            Route::get('/social-channels', [SocialChannelController::class, 'index']);
            Route::post('/social-channels', [SocialChannelController::class, 'store'])->middleware('throttle:60,1');
            Route::post('/social-channels/reorder', [SocialChannelController::class, 'reorder']);
            Route::match(['put', 'patch', 'post'], '/social-channels/{channel}', [SocialChannelController::class, 'update'])->whereNumber('channel')->middleware('throttle:60,1');
            Route::delete('/social-channels/{channel}', [SocialChannelController::class, 'destroy'])->whereNumber('channel');

            Route::get('/affiliate-codes', [AffiliateController::class, 'index']);
            Route::post('/affiliate-codes', [AffiliateController::class, 'store']);
            Route::match(['put', 'patch'], '/affiliate-codes/{affiliate}', [AffiliateController::class, 'update'])->whereNumber('affiliate');
            Route::delete('/affiliate-codes/{affiliate}', [AffiliateController::class, 'destroy'])->whereNumber('affiliate');
            Route::post('/affiliate-codes/{affiliate}/approve-commission', [AffiliateController::class, 'approveCommission'])->whereNumber('affiliate');
            Route::post('/affiliate-codes/{affiliate}/sync-commissions', [AffiliateController::class, 'syncCommissions'])->whereNumber('affiliate');
            Route::get('/affiliate-codes/{affiliate}/commissions', [AffiliateController::class, 'commissions'])->whereNumber('affiliate');
            Route::patch('/commissions/{commission}', [AffiliateController::class, 'updateCommission'])->whereNumber('commission');
        });

        Route::get('/reviews', [ReviewController::class, 'adminIndex']);
        Route::patch('/reviews/{review}/status', [ReviewController::class, 'updateStatus'])->whereNumber('review');
        Route::get('/coupons', [CouponController::class, 'index']);
        Route::post('/coupons', [CouponController::class, 'store']);
        Route::match(['put', 'patch'], '/coupons/{coupon}', [CouponController::class, 'update'])->whereNumber('coupon');
        Route::delete('/coupons/{coupon}', [CouponController::class, 'destroy'])->whereNumber('coupon');
        Route::get('/customers', [ReportController::class, 'customers']);
        Route::get('/reports/summary', [ReportController::class, 'summary']);
        Route::get('/reports/orders.csv', [ReportController::class, 'exportOrders']);
        Route::get('/enquiries', [EnquiryController::class, 'adminIndex']);
        Route::patch('/enquiries/{enquiry}/status', [EnquiryController::class, 'updateStatus'])->whereNumber('enquiry');
        Route::get('/orders', [OrderController::class, 'adminIndex']);
        Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus'])->whereNumber('order');
        Route::get('/products', [ProductController::class, 'adminIndex']);
        Route::get('/products/export.csv', [ProductController::class, 'export']);
        Route::post('/products/import', [ProductController::class, 'import']);
        Route::post('/products', [ProductController::class, 'store']);
        Route::get('/products/{product}', [ProductController::class, 'adminShow'])->whereNumber('product');
        // multipart uploads: send POST with _method=PUT (PHP does not parse files on real PUT)
        Route::match(['put', 'post'], '/products/{product}', [ProductController::class, 'update'])->whereNumber('product');
        Route::delete('/products/{product}', [ProductController::class, 'destroy'])->whereNumber('product');
    });
});
