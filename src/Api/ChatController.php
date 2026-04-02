<?php
/**
 * Copyright Alen Pepa
 * All rights reserved.
 */

namespace App\Api;

use App\Core\Database;
use PDO;

class ChatController {
    private PDO $db;
    private int $currentUserId;

    public function __construct() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
        
        $this->currentUserId = $_SESSION['user_id'];
        
        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function getUsers(): void {
        try {
            $stmt = $this->db->prepare("
                SELECT u.id, u.username, uk.public_identity_key 
                FROM users u 
                JOIN user_keys uk ON u.id = uk.user_id 
                WHERE u.id != :my_id
            ");
            $stmt->execute([':my_id' => $this->currentUserId]);
            $users = $stmt->fetchAll();

            http_response_code(200);
            echo json_encode(['success' => true, 'users' => $users]);
        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to load users.']);
        }
    }

    public function sendMessage(array $data): void {
        if (empty($data['recipient_id']) || empty($data['ciphertext']) || empty($data['nonce'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Incomplete message data.']);
            return;
        }

        $recipientId = (int)$data['recipient_id'];
        $ciphertext = $data['ciphertext'];
        $nonce = $data['nonce'];
        $viewOnce = isset($data['view_once']) ? (int)$data['view_once'] : 0;

        try {
            $stmt = $this->db->prepare("
                INSERT INTO messages (sender_id, recipient_id, ciphertext, nonce, view_once, created_at) 
                VALUES (:sender, :recipient, :ciphertext, :nonce, :view_once, NOW())
            ");
            
            $stmt->execute([
                ':sender'     => $this->currentUserId,
                ':recipient'  => $recipientId,
                ':ciphertext' => $ciphertext,
                ':nonce'      => $nonce,
                ':view_once'  => $viewOnce
            ]);

            http_response_code(201);
            echo json_encode(['success' => true, 'message' => 'Encrypted message saved.']);
        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to send message.']);
        }
    }

    public function getMessages(int $otherUserId): void {
        try {
            $stmt = $this->db->prepare("
                SELECT id, sender_id, recipient_id, ciphertext, nonce, view_once, created_at 
                FROM messages 
                WHERE (sender_id = :my_id AND recipient_id = :other_id) 
                   OR (sender_id = :other_id AND recipient_id = :my_id)
                ORDER BY created_at ASC
            ");
            
            $stmt->execute([
                ':my_id'    => $this->currentUserId,
                ':other_id' => $otherUserId
            ]);
            
            $messages = $stmt->fetchAll();

            http_response_code(200);
            echo json_encode(['success' => true, 'messages' => $messages]);
        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to load messages.']);
        }
    }

    public function consumeMessage(int $messageId): void {
        try {
            // Kontrollojmë nëse mesazhi ekziston, është për këtë marrës dhe është 'view_once'
            $stmt = $this->db->prepare("
                SELECT id FROM messages 
                WHERE id = :msg_id AND recipient_id = :my_id AND view_once = 1
            ");
            $stmt->execute([
                ':msg_id' => $messageId,
                ':my_id'  => $this->currentUserId
            ]);
            
            if ($stmt->fetch()) {
                // Fshirje atomike
                $deleteStmt = $this->db->prepare("DELETE FROM messages WHERE id = :msg_id");
                $deleteStmt->execute([':msg_id' => $messageId]);
                
                http_response_code(200);
                echo json_encode(['success' => true, 'message' => 'Message permanently deleted.']);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Message not found or not eligible.']);
            }
        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to consume message.']);
        }
    }
}