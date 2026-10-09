<?php

declare(strict_types=1);

namespace EvolutionEngineers\Support;

use DI\Container;
use EvolutionEngineers\Controller\ContactController;
use EvolutionEngineers\Controller\HomesController;
use EvolutionEngineers\Controller\PageController;
use EvolutionEngineers\Controller\ProjectController;
use EvolutionEngineers\Controller\SeoController;
use EvolutionEngineers\Middleware\Csrf;
use EvolutionEngineers\Middleware\SecurityHeaders;
use EvolutionEngineers\Middleware\TrailingSlash;
use EvolutionEngineers\Repository\CatalogueRepository;
use EvolutionEngineers\Repository\HomeRepository;
use EvolutionEngineers\Repository\ProjectRepository;
use EvolutionEngineers\Service\EnquiryRouter;
use EvolutionEngineers\Service\EnquiryService;
use EvolutionEngineers\Service\EnquiryValidator;
use Monolog\Handler\RotatingFileHandler;
use Monolog\Logger;
use PDO;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Log\LoggerInterface;
use Slim\App;
use Slim\Exception\HttpMethodNotAllowedException;
use Slim\Exception\HttpNotFoundException;
use Slim\Factory\AppFactory;
use Slim\Psr7\Response;
use Slim\Views\Twig;
use Throwable;

final class Bootstrap
{
    /**
     * @return App<Container>
     */
    public static function createApp(string $root): App
    {
        \Dotenv\Dotenv::createImmutable($root)->safeLoad();
        // .env values first (local), then real environment variables (Docker, Render).
        $env = $_ENV + getenv();
        $debug = ($env['APP_DEBUG'] ?? 'false') === 'true';
        $baseUrl = rtrim((string) ($env['APP_URL'] ?? 'http://localhost:8080'), '/');
        $noindex = ($env['APP_NOINDEX'] ?? 'false') === 'true';
        $devServer = (string) ($env['VITE_DEV_SERVER'] ?? '');
        $secret = (string) ($env['APP_SECRET'] ?? '');
        if (strlen($secret) < 16) {
            throw new \RuntimeException('Set APP_SECRET in .env to a random string of at least 16 characters.');
        }

        $container = new Container();
        $container->set('env', $env);
        $container->set(LoggerInterface::class, static function () use ($root): LoggerInterface {
            $logger = new Logger('site');
            $logger->pushHandler(new RotatingFileHandler($root . '/storage/logs/site.log', 30));

            return $logger;
        });
        $container->set(PDO::class, static fn (): PDO => Database::connect($env));
        $container->set(Manifest::class, static fn (): Manifest => new Manifest(
            $root . '/public/assets/.vite/manifest.json',
            '/assets/',
            $devServer
        ));
        $container->set(Twig::class, static function (Container $c) use ($root, $debug): Twig {
            $twig = Twig::create($root . '/templates', [
                'cache' => $debug ? false : $root . '/storage/cache/twig',
                'strict_variables' => $debug,
                'autoescape' => 'html',
            ]);
            $twig->addExtension(new TwigExtension(
                $c->get(Manifest::class),
                new ImageCatalog($root . '/resources/images/stock/credits.json', $root . '/public/images/stock'),
                $root . '/public'
            ));

            return $twig;
        });
        $container->set(View::class, static fn (Container $c): View => new View(
            $c->get(Twig::class),
            static fn (): CatalogueRepository => $c->get(CatalogueRepository::class),
            $baseUrl,
            $noindex
        ));
        $container->set(EnquiryRouter::class, static fn (Container $c): EnquiryRouter => new EnquiryRouter(
            $c->get(CatalogueRepository::class)->settings()
        ));
        $container->set(\EvolutionEngineers\Service\MailService::class, static fn (Container $c) =>
            new \EvolutionEngineers\Service\MailService($env, $c->get(LoggerInterface::class)));
        $container->set(EnquiryService::class, static fn (Container $c): EnquiryService => new EnquiryService(
            $c->get(\EvolutionEngineers\Repository\EnquiryRepository::class),
            $c->get(HomeRepository::class),
            $c->get(EnquiryRouter::class),
            $c->get(\EvolutionEngineers\Service\MailService::class),
            $secret
        ));
        $container->set(SeoController::class, static fn (Container $c): SeoController => new SeoController(
            $c->get(ProjectRepository::class),
            $c->get(HomeRepository::class),
            $baseUrl,
            $noindex
        ));
        $container->set(ContactController::class, static fn (Container $c): ContactController => new ContactController(
            $c->get(View::class),
            $c->get(EnquiryValidator::class),
            $c->get(EnquiryService::class),
            $c->get(HomeRepository::class),
            $c->get(LoggerInterface::class),
            ($env['TRUST_PROXY'] ?? 'false') === 'true'
        ));
        // An expired or missing form token re-shows the contact form with the visitor's details kept.
        $csrf = new Csrf($secret, static fn (ServerRequestInterface $request): ResponseInterface =>
            $container->get(ContactController::class)->expired($request, new Response()));

        $app = AppFactory::createFromContainer($container);

        self::routes($app);

        $app->addBodyParsingMiddleware();
        $app->add($csrf);
        $app->addRoutingMiddleware();
        $app->add(new TrailingSlash());
        $errors = $app->addErrorMiddleware($debug, true, true, $container->get(LoggerInterface::class));
        // Not static: Slim binds error handlers to the container.
        $errors->setDefaultErrorHandler(function (
            ServerRequestInterface $request,
            Throwable $exception,
        ) use (
            $container,
            $debug
): ResponseInterface {
            $notFound = $exception instanceof HttpNotFoundException;
            $status = $notFound ? 404 : ($exception instanceof HttpMethodNotAllowedException ? 405 : 500);
            if (!$notFound && $status === 500) {
                $container->get(LoggerInterface::class)->error($exception->getMessage(), ['exception' => $exception]);
                if ($debug) {
                    throw $exception;
                }
            }
            try {
                return $container->get(View::class)->render(
                    $request,
                    new Response(),
                    $notFound ? 'pages/404.twig' : 'pages/error.twig',
                    [],
                    $status
                );
            } catch (Throwable $renderError) {
                $container->get(LoggerInterface::class)
                    ->error('Error page failed to render: ' . $renderError->getMessage());
                $response = new Response($status);
                $response->getBody()->write($notFound ? 'Page not found.' : 'Something went wrong.');

                return $response;
            }
        });
        // Security headers wrap everything, including error pages.
        $app->add(new SecurityHeaders(str_starts_with($baseUrl, 'https://'), $devServer, $noindex));

        return $app;
    }

    /**
     * @param App<Container> $app
     */
    private static function routes(App $app): void
    {
        $app->get('/', [PageController::class, 'home']);
        $app->get('/services', [PageController::class, 'services']);
        $app->get('/services/{slug:[a-z-]+}', [PageController::class, 'serviceDetail']);
        $app->get('/supplies', [PageController::class, 'supplies']);
        $app->get('/projects', [ProjectController::class, 'index']);
        $app->get('/projects/{slug:[a-z0-9-]+}', [ProjectController::class, 'show']);
        $app->get('/small-homes', [HomesController::class, 'index']);
        $app->get('/small-homes/{slug:[a-z0-9-]+}', [HomesController::class, 'show']);
        $app->get('/plant-and-equipment', [PageController::class, 'plant']);
        $app->get('/about', [PageController::class, 'about']);
        $app->get('/contact', [ContactController::class, 'show']);
        $app->post('/contact', [ContactController::class, 'submit']);
        $app->get('/privacy', [PageController::class, 'privacy']);
        $app->get('/terms', [PageController::class, 'terms']);
        $app->get('/credits', [PageController::class, 'credits']);
        $app->get('/sitemap.xml', [SeoController::class, 'sitemap']);
        $app->get('/robots.txt', [SeoController::class, 'robots']);
    }
}
