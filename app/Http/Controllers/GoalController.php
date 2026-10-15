<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateGoalRequest;
use App\Models\Setting;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;

class GoalController extends Controller
{
    /** Meta de livros do ano, guardada em settings. */
    public function update(UpdateGoalRequest $request): RedirectResponse
    {
        Setting::put('yearly_goal', $request->integer('yearly_goal'));

        Toast::success('Meta salva', $request->integer('yearly_goal').' livros em '.now()->year);

        return back();
    }
}
