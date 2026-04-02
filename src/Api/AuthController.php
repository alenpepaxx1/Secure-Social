<?php
/**
 * Copyright Alen Pepa
 * All rights reserved.
 */

namespace App\Api;

use App\Core\Database;
use PDO;

class AuthController {
    private PDO $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function register(array $data): void {
        if (empty($data['username']) || empty($data['password']) || 
            empty($data['public_identity_key']) || empty($data['public_signing_key'])) {
            http_response_code(400);
            echo json_encode(['error' => 'All fields and keys are required.']);
            return;
        }

        $username = trim($data['username']);
        $passwordHash = password_hash($data['password'], PASSWORD_ARGON2ID ?? PASSWORD_DEFAULT);
        
        $publicIdentityKey = $data['public_identity_key'];
        $publicSigningKey = $data['public_signing_key'];

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("INSERT INTO users (username, pass_hash, created_at) VALUES (:username, :pass_hash, NOW())");
            $stmt->execute([
                ':username' => $username,
                ':pass_hash' => $passwordHash
            ]);
            $userId = $this->db->lastInsertId();

            $stmtKeys = $this->db->prepare("INSERT INTO user_keys (user_id, public_identity_key, public_signing_key, updated_at) VALUES (:user_id, :identity_key, :signing_key, NOW())");
            $stmtKeys->execute([
                ':user_id' => $userId,
                ':identity_key' => $publicIdentityKey,
                ':signing_key' => $publicSigningKey
            ]);

            $this->db->commit();

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Account created securely.',
                'user_id' => $userId
            ]);

        } catch (\PDOException $e) {
            $this->db->rollBack();
            http_response_code(500);
            if ($e->getCode() == 23000) {
                echo json_encode(['error' => 'Username is already taken.']);
            } else {
                echo json_encode(['error' => 'Registration failed due to a server error.']);
            }
        }
    }

    public function login(array $data): void {
        if (empty($data['username']) || empty($data['password'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Username and password are required.']);
            return;
        }

        $username = trim($data['username']);
        $password = $data['password'];

        try {
            $stmt = $this->db->prepare("SELECT id, username, pass_hash FROM users WHERE username = :username LIMIT 1");
            $stmt->execute([':username' => $username]);
            $user = $stmt->fetch();

            if ($user && password_verify($password, $user['pass_hash'])) {
                // Konfigurimi i sigurt i sesionit
                session_set_cookie_params([
                    'lifetime' => 0,
                    'path' => '/',
                    'domain' => $_SERVER['HTTP_HOST'],
                    'secure' => isset($_SERVER['HTTPS']),
                    'httponly' => true,
                    'samesite' => 'Strict'
                ]);
                
                if (session_status() === PHP_SESSION_NONE) {
                    session_start();
                }
                session_regenerate_id(true);

                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];

                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'message' => 'Login successful',
                    'user' => [
                        'id' => $user['id'],
                        'username' => $user['username']
                    ]
                ]);
            } else {
                http_response_code(401);
                echo json_encode(['error' => 'Invalid credentials.']);
            }
        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Login failed due to a server error.']);
        }
    }
}
