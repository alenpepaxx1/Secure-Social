<?php
/**
 * Copyright Alen Pepa
 * All rights reserved.
 */

if (session_status() === PHP_SESSION_NONE) { session_start(); }
if (!isset($_SESSION['user_id'])) { header("Location: /"); exit; }
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat | Secure Social</title>
    <link rel="stylesheet" href="assets/css/style.css?v=3">
</head>
<body>

<div class="chat-container">
    <div class="sidebar">
        <div class="sidebar-header">
            <h3>Welcome, <span id="myUsername"><?php echo htmlspecialchars($_SESSION['username']); ?></span></h3>
            <button class="btn-logout" onclick="logout()">Logout</button>
        </div>
        <div class="contact-list" id="contactList"></div>
    </div>

    <div class="chat-area">
        <div class="chat-header">
            <div class="contact-avatar" id="headerAvatar">?</div>
            <span id="currentChatUser">Select a contact to start chatting</span>
        </div>
        <div class="chat-messages" id="chatMessages">
            <div class="message received" style="align-self: center; background: none; color: var(--text-muted);">
                Messages are end-to-end encrypted. No logs are kept.
            </div>
        </div>
        <div class="chat-input-area">
            <label class="view-once-label" title="View Once Message">
                <input type="checkbox" id="chkViewOnce"> 💣
            </label>
            <input type="text" id="messageInput" placeholder="Type an encrypted message..." autocomplete="off">
            <button class="btn-send" id="btnSend">Send</button>
        </div>
    </div>
</div>

<script src="assets/js/crypto.js?v=3"></script>
<script src="assets/js/chat.js?v=3"></script>

<script>
    /**
     * Copyright Alen Pepa
     * All rights reserved.
     */
    function logout() {
        fetch('/api/logout', { method: 'POST' }).then(() => {
            window.location.reload();
        });
    }
</script>
</body>
</html>
