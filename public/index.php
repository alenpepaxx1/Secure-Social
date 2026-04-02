<?php
/**
 * Copyright Alen Pepa
 * All rights reserved.
 */

declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

spl_autoload_register(function ($class) {
    $prefix = 'App\\';
    $base_dir = __DIR__ . '/../src/';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) return;
    $relative_class = substr($class, $len);
    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';
    if (file_exists($file)) require $file;
});

header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("X-XSS-Protection: 1; mode=block");

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

if (str_starts_with($requestUri, '/api/')) {
    header('Content-Type: application/json');
    
    if ($requestUri === '/api/register' && $method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) { http_response_code(400); echo json_encode(['error' => 'Invalid JSON input']); exit; }
        $auth = new \App\Api\AuthController();
        $auth->register($input);
        exit;
    }
    
    if ($requestUri === '/api/login' && $method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) { http_response_code(400); echo json_encode(['error' => 'Invalid JSON input']); exit; }
        $auth = new \App\Api\AuthController();
        $auth->login($input);
        exit;
    }

    if ($requestUri === '/api/logout' && $method === 'POST') {
        session_unset();
        session_destroy();
        http_response_code(200); echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
        exit;
    }
    
    if ($requestUri === '/api/users' && $method === 'GET') {
        $chat = new \App\Api\ChatController();
        $chat->getUsers();
        exit;
    }
    
    if ($requestUri === '/api/messages/send' && $method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) { http_response_code(400); echo json_encode(['error' => 'Invalid JSON']); exit; }
        $chat = new \App\Api\ChatController();
        $chat->sendMessage($input);
        exit;
    }

    if (preg_match('/^\/api\/messages\/(\d+)$/', $requestUri, $matches) && $method === 'GET') {
        $otherUserId = (int)$matches[1];
        $chat = new \App\Api\ChatController();
        $chat->getMessages($otherUserId);
        exit;
    }

    if (preg_match('/^\/api\/messages\/consume\/(\d+)$/', $requestUri, $matches) && $method === 'POST') {
        $messageId = (int)$matches[1];
        $chat = new \App\Api\ChatController();
        $chat->consumeMessage($messageId);
        exit;
    }
    
    http_response_code(404);
    echo json_encode(['error' => 'API Endpoint not found']);
    exit;
}

if (isset($_SESSION['user_id'])) {
    $viewFile = __DIR__ . '/../src/Views/chat.php';
} else {
    $viewFile = __DIR__ . '/../src/Views/app.php';
}

if (file_exists($viewFile)) {
    require $viewFile;
} else {
    http_response_code(500);
    echo "Error: View file not found. Please ensure {$viewFile} exists.";
}
