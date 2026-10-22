<?php

namespace App\Http\Controllers;

use App\Services\CoverStore;
use App\Support\AmazonLink;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AmazonCoverController extends Controller
{
    /** Finds the cover from an Amazon product link, so the form can show it before saving. */
    public function __invoke(Request $request, CoverStore $covers): JsonResponse
    {
        $link = trim((string) $request->string('url'));

        if (AmazonLink::asinFromUrl($link) === null) {
            return response()->json(['message' => __('Cole o link da página do produto na Amazon (o que tem /dp/ no endereço).')], 422);
        }

        $cover = $covers->findByAmazonLink($link);

        if ($cover === null) {
            return response()->json(['message' => __('A Amazon não tem capa para esse produto.')], 422);
        }

        return response()->json(['cover_url' => $cover]);
    }
}
