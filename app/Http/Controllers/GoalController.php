<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateGoalRequest;
use App\Models\Setting;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;

class GoalController extends Controller
{
    /** The year's book goal, kept in settings. */
    public function update(UpdateGoalRequest $request): RedirectResponse
    {
        Setting::put('yearly_goal', $request->integer('yearly_goal'));

        Toast::success(__('Meta salva'), __(':count livros em :year', ['count' => $request->integer('yearly_goal'), 'year' => now()->year]));

        return back();
    }
}
