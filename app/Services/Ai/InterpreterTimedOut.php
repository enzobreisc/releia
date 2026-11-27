<?php

namespace App\Services\Ai;

use RuntimeException;

/** The server accepted the request but did not answer in time: it is running, so it is not "unreachable". */
final class InterpreterTimedOut extends RuntimeException {}
