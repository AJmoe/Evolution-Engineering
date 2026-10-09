<?php

declare(strict_types=1);

namespace EvolutionEngineers\Controller;

use EvolutionEngineers\Middleware\Csrf;
use EvolutionEngineers\Repository\HomeRepository;
use EvolutionEngineers\Service\EnquiryService;
use EvolutionEngineers\Service\EnquiryValidator;
use EvolutionEngineers\Support\ClientIp;
use EvolutionEngineers\Support\View;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;

final class ContactController
{
    private const MIN_FILL_SECONDS = 3;

    public function __construct(
        private readonly View $view,
        private readonly EnquiryValidator $validator,
        private readonly EnquiryService $enquiries,
        private readonly HomeRepository $homes,
        private readonly LoggerInterface $logger,
        private readonly bool $trustProxy = false,
    ) {
    }

    public function show(Request $request, Response $response): Response
    {
        $query = $request->getQueryParams();
        $values = ['type' => '', 'message' => '', 'design' => null];
        $design = is_string($query['design'] ?? null) ? $this->homes->findBySlug($query['design']) : null;
        if ($design !== null) {
            $values = [
                'type' => 'small_home',
                'message' => 'I would like to know more about the ' . $design['name'] . ' concept design.',
                'design' => $design['slug'],
            ];
        } elseif (is_string($query['type'] ?? null) && isset(EnquiryValidator::TYPES[$query['type']])) {
            $values['type'] = $query['type'];
            if (is_string($query['item'] ?? null) && mb_strlen($query['item']) <= 120) {
                $values['message'] = 'Please send a price for: ' . $query['item'] . '.';
            }
        }
        // The footer "call back" box sends only an email address; carry it into the form.
        if (is_string($query['email'] ?? null) && filter_var($query['email'], FILTER_VALIDATE_EMAIL)) {
            $values['email'] = mb_substr($query['email'], 0, 254);
        }

        return $this->render($request, $response, $values, [], false);
    }

    public function submit(Request $request, Response $response): Response
    {
        $input = (array) $request->getParsedBody();
        $ip = ClientIp::from($request, $this->trustProxy);

        // Spam checks: a hidden honeypot field and a minimum fill time. Bots get a fake success.
        $issued = Csrf::issuedAt(is_string($input['_csrf'] ?? null) ? $input['_csrf'] : '');
        $tooFast = $issued !== null && (time() - $issued) < self::MIN_FILL_SECONDS;
        if (($input['website'] ?? '') !== '' || $tooFast) {
            $this->logger->info('Enquiry dropped by spam check');

            return $this->render($request, $response, [], [], true);
        }

        $result = $this->validator->validate($input);
        if ($result['errors'] !== []) {
            return $this->render($request, $response, $result['data'], $result['errors'], false, 422);
        }

        if ($this->enquiries->isRateLimited($ip)) {
            return $this->render($request, $response, $result['data'], [
                'form' => 'You have sent several enquiries in the last hour. Please wait an hour, or phone us on '
                    . '392 3065.',
            ], false, 429);
        }

        $this->enquiries->submit($result['data'], $ip);

        return $this->render($request, $response, [], [], true);
    }

    /**
     * The form's security token expired or was missing (usually a page left open for hours).
     * Show the form again with what the visitor typed, so nothing is lost.
     */
    public function expired(Request $request, Response $response): Response
    {
        $data = $this->validator->validate((array) $request->getParsedBody())['data'];

        return $this->render($request, $response, $data, [
            'form' => 'This form was open for a long time, so for your security we need you to send it again. '
                . 'Your details are still filled in: check them and press Send enquiry.',
        ], false, 400);
    }

    /**
     * @param array<string, mixed> $values
     * @param array<string, string> $errors
     */
    private function render(
        Request $request,
        Response $response,
        array $values,
        array $errors,
        bool $sent,
        int $status = 200,
    ): Response {
        return $this->view->render($request, $response, 'pages/contact.twig', [
            'types' => EnquiryValidator::TYPES,
            'values' => $values,
            'errors' => $errors,
            'sent' => $sent,
            'message_max' => EnquiryValidator::MESSAGE_MAX,
        ], $status);
    }
}
