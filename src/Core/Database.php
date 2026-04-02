<?php
/**
 * Copyright Alen Pepa
 * All rights reserved.
 */

namespace App\Core;

use PDO;
use PDOException;

class Database {
    private ?PDO $connection = null;

    public function __construct() {
        $config = require __DIR__ . '/../../config/database.php';
        
        $dsn = "mysql:host={$config['host']};dbname={$config['dbname']};charset={$config['charset']}";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        try {
            $this->connection = new PDO($dsn, $config['user'], $config['password'], $options);
        } catch (PDOException $e) {
            // No logging of sensitive DB errors to avoid leaking data
            http_response_code(500);
            echo json_encode(['error' => 'Database connection failed.']);
            exit;
        }
    }

    public function getConnection(): PDO {
        return $this->connection;
    }
}
