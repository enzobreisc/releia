<?php

declare(strict_types=1);

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Local asset routes and the state column holding the remote URL a client uses instead. */
const REMOTE_ASSETS = [
    '#^/library/(\d+)/cover(\?|$)#' => ['books', 'cover_url'],
    '#^/authors/(\d+)/photo(\?|$)#' => ['authors', 'photo_url'],
    '#^/shopping/(\d+)/cover(\?|$)#' => ['shopping_items', 'cover_url'],
];

/**
 * @return array<string, array<int, string|null>> Table to row id to remote URL, read from the exported state.
 */
function remoteUrlsFromState(): array
{
    $state = json_decode((string) file_get_contents(DEMO_DATA_PATH.'/state.json'), true, flags: JSON_THROW_ON_ERROR);
    $remote = [];

    foreach (REMOTE_ASSETS as [$table, $column]) {
        foreach ($state['tables'][$table] as $row) {
            $remote[$table][$row['id']] = $row[$column];
        }
    }

    return $remote;
}

/**
 * Replaces local asset routes with the remote URL the row holds (null when it has none).
 */
function withRemoteUrls(mixed $value, array $remote): mixed
{
    if (is_array($value)) {
        return array_map(fn (mixed $item) => withRemoteUrls($item, $remote), $value);
    }

    if (! is_string($value)) {
        return $value;
    }

    foreach (REMOTE_ASSETS as $pattern => [$table]) {
        if (preg_match($pattern, $value, $matches) === 1) {
            $id = (int) $matches[1];

            if (! array_key_exists($id, $remote[$table] ?? [])) {
                throw new RuntimeException("Local asset {$value} has no row in the exported state.");
            }

            return $remote[$table][$id];
        }
    }

    return $value;
}

/**
 * Sends requests the way the Inertia client does: XHR headers, JSON bodies, XSRF header and cookies kept between requests.
 */
final class InertiaClient
{
    /** @var array<string, string> */
    private array $cookies = [];

    private ?string $currentUrl = null;

    public function __construct(
        private readonly Kernel $kernel,
        private readonly string $version,
    ) {}

    /**
     * Follows redirects the way Inertia does and returns the page the user lands on.
     *
     * @param  array<string, mixed>|null  $body
     * @return array{url: string, page: array<string, mixed>}
     */
    public function send(string $method, string $url, ?array $body = null): array
    {
        $response = $this->dispatch($method, $url, $body);
        $target = $url;

        for ($hops = 0; in_array($response->getStatusCode(), [301, 302, 303, 307, 308], true); $hops++) {
            if ($hops === 5) {
                throw new RuntimeException("Too many redirects from {$url}.");
            }

            $target = $this->pathOf((string) $response->headers->get('Location'));
            $response = $this->dispatch('GET', $target, null);
        }

        if ($response->getStatusCode() !== 200) {
            throw new RuntimeException("{$method} {$url} answered {$response->getStatusCode()}.");
        }

        $this->currentUrl = $target;

        return ['url' => $target, 'page' => json_decode((string) $response->getContent(), true, flags: JSON_THROW_ON_ERROR)];
    }

    private function dispatch(string $method, string $url, ?array $body): Response
    {
        $server = [
            'HTTP_X_INERTIA' => 'true',
            'HTTP_X_INERTIA_VERSION' => $this->version,
            'HTTP_X_REQUESTED_WITH' => 'XMLHttpRequest',
            'HTTP_ACCEPT' => 'text/html, application/xhtml+xml',
        ];

        if ($this->currentUrl !== null) {
            $server['HTTP_REFERER'] = 'http://localhost'.$this->currentUrl;
        }

        if (isset($this->cookies['XSRF-TOKEN'])) {
            $server['HTTP_X_XSRF_TOKEN'] = rawurldecode($this->cookies['XSRF-TOKEN']);
        }

        $content = null;

        if ($body !== null) {
            $server['CONTENT_TYPE'] = 'application/json';
            $content = json_encode($body, JSON_THROW_ON_ERROR);
        }

        $request = Request::create($url, $method, [], $this->cookies, [], $server, $content);
        $response = $this->kernel->handle($request);
        $this->kernel->terminate($request, $response);

        foreach ($response->headers->getCookies() as $cookie) {
            if ($cookie->getValue() === null || $cookie->getValue() === '') {
                unset($this->cookies[$cookie->getName()]);
            } else {
                $this->cookies[$cookie->getName()] = (string) $cookie->getValue();
            }
        }

        return $response;
    }

    private function pathOf(string $location): string
    {
        $path = (string) parse_url($location, PHP_URL_PATH);
        $query = parse_url($location, PHP_URL_QUERY);

        return $query === null || $query === false || $query === '' ? $path : "{$path}?{$query}";
    }
}
