<?php
/**
 * Copyright Alen Pepa
 * All rights reserved.
 */
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Secure Social | End-to-End Encrypted</title>
    <!-- Lidhja me skedarin CSS me versionim për të fshirë cache-in -->
    <link rel="stylesheet" href="assets/css/style.css?v=2">
</head>
<body>
    <div class="auth-container">
        <div class="auth-box">
            <h2>Secure Social</h2>
            <p class="subtitle">End-to-End Encrypted Network</p>
            
            <!-- Forma e Regjistrimit -->
            <form id="registerForm" class="auth-form">
                <div class="input-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" required autocomplete="off" placeholder="Choose a username">
                </div>
                <div class="input-group">
                    <label for="password">Master Password</label>
                    <input type="password" id="password" required placeholder="Create a strong password">
                    <small>Used to encrypt your private data locally. Do not lose it!</small>
                </div>
                <button type="submit" id="btnRegister" class="btn-primary">Create Account</button>
                <p class="switch-auth">Already have an account? <a href="#" id="showLogin">Login here</a></p>
            </form>
            
            <!-- Forma e Hyrjes -->
            <form id="loginForm" class="auth-form" style="display: none;">
                <div class="input-group">
                    <label for="login_username">Username</label>
                    <input type="text" id="login_username" required autocomplete="off" placeholder="Enter username">
                </div>
                <div class="input-group">
                    <label for="login_password">Master Password</label>
                    <input type="password" id="login_password" required placeholder="Enter your password">
                </div>
                <button type="submit" id="btnLogin" class="btn-primary">Login</button>
                <p class="switch-auth">Need an account? <a href="#" id="showRegister">Register here</a></p>
            </form>

        </div>
    </div>

    <!-- JavaScript për të ndërruar format -->
    <script>
        document.getElementById('showLogin').addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('registerForm').style.display = 'none';
            document.getElementById('loginForm').style.display = 'flex';
        });

        document.getElementById('showRegister').addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('registerForm').style.display = 'flex';
        });
    </script>

    <!-- Skriptet me ?v=2 për të detyruar shfletuesin të marrë kodin e ri -->
    <script src="assets/js/crypto.js?v=2"></script>
    <script src="assets/js/app.js?v=2"></script>
</body>
</html>
