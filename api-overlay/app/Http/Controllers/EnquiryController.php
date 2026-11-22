<?php

namespace App\Http\Controllers;

use App\Http\Requests\EnquiryRequest;
use App\Models\Enquiry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class EnquiryController extends Controller
{
    public function store(EnquiryRequest $request)
    {
        $e = Enquiry::create($request->validated() + [
            'reference' => $this->makeReference(),
            'status' => 'new',
        ]);

        $this->notifyShop($e);

        return response()->json(['reference' => $e->reference, 'contact_via' => $e->contact_via], 201);
    }

    public function adminIndex(Request $request)
    {
        $q = Enquiry::orderByDesc('id');
        if ($s = $request->query('status')) {
            $q->where('status', $s);
        }

        return $q->paginate(20);
    }

    public function updateStatus(Request $request, Enquiry $enquiry)
    {
        $data = $request->validate(['status' => ['required', 'in:new,contacted,quoted,confirmed,cancelled']]);
        $enquiry->update($data);

        return $enquiry;
    }

    /** Email the shop if SHOP_NOTIFY_EMAIL and a mail driver are set up. Never blocks the customer. */
    private function notifyShop(Enquiry $e): void
    {
        $to = config('shop.notify_email');
        if (! $to) {
            return;
        }
        try {
            $body = "New bulk / gift enquiry {$e->reference}\n\n"
                ."Name: {$e->name}\nMobile: {$e->phone}\nEmail: ".($e->email ?: '-')."\n"
                ."Confirm by: {$e->contact_via}\nOccasion: {$e->occasion}\n"
                ."Items: {$e->items_text}\nQuantity: {$e->quantity_text}\n"
                .'Needed by: '.($e->needed_by?->format('d M Y') ?? '-')."\n"
                ."Fulfilment: {$e->fulfilment} ".($e->city ?: '')."\nNotes: ".($e->notes ?: '-');
            Mail::raw($body, fn ($m) => $m->to($to)->subject("Bulk enquiry {$e->reference}"));
        } catch (\Throwable $ex) {
            report($ex);
        }
    }

    private function makeReference(): string
    {
        do {
            $r = 'BULK'.now()->format('ymd').random_int(1000, 9999);
        } while (Enquiry::where('reference', $r)->exists());

        return $r;
    }
}
