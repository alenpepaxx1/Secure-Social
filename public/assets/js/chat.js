/**
 * Copyright Alen Pepa
 * All rights reserved.
 * 
 * Chat Dashboard Logic (E2EE & View Once) with Secure Private Key
 */

document.addEventListener('DOMContentLoaded', async () => {
    let currentChatUserId = null;
    let currentSharedSecret = null;
    let allUsers = [];

    // 1. Marrim Çelësin Privat nga Sesioni i Shfletuesit (që e shkyçëm te app.js gjatë Login)
    const activePrivateKeyBase64 = sessionStorage.getItem('active_private_key');
    if (!activePrivateKeyBase64) {
        alert("Security Error: Private Key not found in session. Please login again.");
        window.location.href = '/'; // Dërgoje te faqja e login-it nëse i mungon çelësi
        return;
    }

    // E importojmë Çelësin Privat nga Base64 prapa në një CryptoKey Object
    const privKeyBytes = new Uint8Array(window.atob(activePrivateKeyBase64).split('').map(c => c.charCodeAt(0)));
    const myPrivateKey = await window.crypto.subtle.importKey(
        "pkcs8", privKeyBytes, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"]
    );

    const contactList = document.getElementById('contactList');
    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput');
    const btnSend = document.getElementById('btnSend');
    const currentChatUserEl = document.getElementById('currentChatUser');
    const chkViewOnce = document.getElementById('chkViewOnce');

    async function loadUsers() {
        const res = await fetch('/api/users');
        const data = await res.json();
        if (data.success) {
            allUsers = data.users;
            renderContactList();
        }
    }

    function renderContactList() {
        contactList.innerHTML = '';
        allUsers.forEach(user => {
            const div = document.createElement('div');
            div.className = 'contact-item';
            div.innerHTML = `
                <div class="contact-avatar">${user.username.charAt(0).toUpperCase()}</div>
                <div>${user.username}</div>
            `;
            div.addEventListener('click', () => openChat(user));
            contactList.appendChild(div);
        });
    }

    async function openChat(user) {
        currentChatUserId = user.id;
        currentChatUserEl.textContent = user.username;
        chatMessages.innerHTML = '';

        // Importojmë Public Key të marrësit dhe llogarisim Sekretin e Përbashkët (Shared Secret)
        const theirPublicKey = await CryptoApp.importPublicKeyFromBase64(user.public_identity_key);
        currentSharedSecret = await CryptoApp.deriveSharedSecret(myPrivateKey, theirPublicKey);

        loadMessages(user.id);
    }

    async function loadMessages(otherUserId) {
        const res = await fetch(`/api/messages/${otherUserId}`);
        const data = await res.json();

        if (data.success && currentSharedSecret) {
            chatMessages.innerHTML = '';
            for (let msg of data.messages) {
                // Dekripto mesazhin (Ciphertext -> Plaintext)
                const plainText = await CryptoApp.decryptMessage(msg.ciphertext, msg.nonce, currentSharedSecret);
                
                const isMine = (msg.sender_id != otherUserId);
                
                const msgDiv = document.createElement('div');
                msgDiv.className = `message ${isMine ? 'sent' : 'received'}`;
                msgDiv.textContent = plainText;
                
                if (msg.view_once == 1) {
                    msgDiv.innerHTML += '<br><small style="color: #fbbf24; font-weight: bold; margin-top: 5px; display: inline-block;">(View Once 💣)</small>';
                    
                    // Nëse mesazhi erdhi nga tjetri, fshije përgjithmonë në server pasi e lexuam në ekran
                    if (!isMine) {
                        fetch(`/api/messages/consume/${msg.id}`, { method: 'POST' })
                            .then(response => console.log(`Message ${msg.id} consumed.`));
                    }
                }
                
                chatMessages.appendChild(msgDiv);
            }
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    async function sendMessage() {
        if (!currentChatUserId || !currentSharedSecret || messageInput.value.trim() === '') return;

        const plainText = messageInput.value.trim();
        const viewOnceVal = chkViewOnce.checked ? 1 : 0;
        messageInput.value = '';
        chkViewOnce.checked = false;

        const msgDiv = document.createElement('div');
        msgDiv.className = 'message sent';
        msgDiv.textContent = plainText;
        if (viewOnceVal) {
             msgDiv.innerHTML += '<br><small style="color: #fbbf24; font-weight: bold; margin-top: 5px; display: inline-block;">(View Once 💣)</small>';
        }
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Enkripto mesazhin (Plaintext -> Ciphertext)
        const encrypted = await CryptoApp.encryptMessage(plainText, currentSharedSecret);

        await fetch('/api/messages/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient_id: currentChatUserId,
                ciphertext: encrypted.ciphertext,
                nonce: encrypted.nonce,
                view_once: viewOnceVal
            })
        });
    }

    btnSend.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    loadUsers();
    
    // Auto-refresh mesazhe çdo 3 sekonda
    setInterval(() => {
        if (currentChatUserId) loadMessages(currentChatUserId);
    }, 3000);
});
