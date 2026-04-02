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
    <link rel="stylesheet" href="/assets/css/style.css">
    <style>
        body { display: block; height: 100vh; overflow: hidden; background-color: var(--bg-color); }
        .chat-container { display: flex; height: 100vh; width: 100%; max-width: 1400px; margin: 0 auto; background-color: var(--box-bg); box-shadow: 0 0 20px rgba(0,0,0,0.5); }
        .sidebar { width: 300px; border-right: 1px solid var(--border-color); display: flex; flex-direction: column; background-color: #161f2e; }
        .sidebar-header { padding: 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
        .sidebar-header h3 { font-size: 18px; color: var(--text-main); }
        .btn-logout { background: none; border: 1px solid var(--border-color); color: var(--text-muted); padding: 5px 10px; border-radius: 6px; cursor: pointer; transition: 0.3s; }
        .btn-logout:hover { color: #ef4444; border-color: #ef4444; }
        .contact-list { flex: 1; overflow-y: auto; padding: 10px; }
        .contact-item { padding: 15px; border-radius: 10px; margin-bottom: 5px; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; gap: 10px; }
        .contact-item:hover { background-color: var(--border-color); }
        .contact-avatar { width: 40px; height: 40px; border-radius: 50%; background-color: var(--primary-color); display: flex; justify-content: center; align-items: center; font-weight: bold; color: #fff; }
        .chat-area { flex: 1; display: flex; flex-direction: column; background-color: var(--box-bg); }
        .chat-header { padding: 20px; border-bottom: 1px solid var(--border-color); font-weight: 600; font-size: 18px; display: flex; align-items: center; gap: 10px; }
        .chat-messages { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; }
        .message { max-width: 70%; padding: 12px 16px; border-radius: 15px; font-size: 15px; line-height: 1.4; word-wrap: break-word; }
        .message.received { background-color: var(--border-color); align-self: flex-start; border-bottom-left-radius: 2px; }
        .message.sent { background-color: var(--primary-color); color: #fff; align-self: flex-end; border-bottom-right-radius: 2px; }
        .chat-input-area { padding: 20px; border-top: 1px solid var(--border-color); display: flex; gap: 10px; background-color: #161f2e; align-items: center;}
        .chat-input-area input[type="text"] { flex: 1; padding: 15px; border-radius: 10px; border: 1px solid var(--border-color); background-color: var(--bg-color); color: var(--text-main); font-size: 15px; outline: none; }
        .chat-input-area input[type="text"]:focus { border-color: var(--primary-color); }
        .btn-send { background-color: var(--primary-color); color: white; border: none; padding: 0 25px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: 0.3s; height: 47px; }
        .btn-send:hover { background-color: var(--primary-hover); }
        .view-once-label { display:flex; align-items:center; gap:5px; color: var(--text-muted); cursor: pointer; font-size: 14px; user-select: none; }
    </style>
</head>
<body>

<div class="chat-container">
    <div class="sidebar">
        <div class="sidebar-header">
            <h3>Welcome, <?php echo htmlspecialchars($_SESSION['username']); ?></h3>
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

<script src="/assets/js/crypto.js"></script>
<script src="/assets/js/chat.js"></script>

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