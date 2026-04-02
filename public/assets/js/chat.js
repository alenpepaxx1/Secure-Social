/**
 * Copyright Alen Pepa
 * All rights reserved.
 * 
 * Chat Dashboard Logic (E2EE & View Once)
 */

document.addEventListener('DOMContentLoaded', async () => {
    let currentChatUserId = null;
    let currentSharedSecret = null;
    let allUsers = [];

    if (!window.myKeys) {
        window.myKeys = await CryptoApp.generateKeyPairs();
    }

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

        const theirPublicKey = await CryptoApp.importPublicKeyFromBase64(user.public_identity_key);
        currentSharedSecret = await CryptoApp.deriveSharedSecret(window.myKeys.identityKeyPair.privateKey, theirPublicKey);

        loadMessages(user.id);
    }

    async function loadMessages(otherUserId) {
        const res = await fetch(`/api/messages/${otherUserId}`);
        const data = await res.json();

        if (data.success && currentSharedSecret) {
            chatMessages.innerHTML = '';
            for (let msg of data.messages) {
                const plainText = await CryptoApp.decryptMessage(msg.ciphertext, msg.nonce, currentSharedSecret);
                
                // Kontrollo nëse jam unë dërguesi (nga ID e fshehur në DOM ose një variabël global. Për thjeshtësi do krahasojmë emrin me otherUserId)
                const isMine = (msg.sender_id != otherUserId);
                
                const msgDiv = document.createElement('div');
                msgDiv.className = `message ${isMine ? 'sent' : 'received'}`;
                msgDiv.textContent = plainText;
                
                if (msg.view_once == 1) {
                    msgDiv.innerHTML += '<br><small style="color: #fbbf24; font-weight: bold; margin-top: 5px; display: inline-block;">(View Once 💣)</small>';
                    
                    // Nëse erdhi nga tjetri, fshije në server pasi u hap
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
        chkViewOnce.checked = false; // Resetoje mbrapa

        const msgDiv = document.createElement('div');
        msgDiv.className = 'message sent';
        msgDiv.textContent = plainText;
        if (viewOnceVal) {
             msgDiv.innerHTML += '<br><small style="color: #fbbf24; font-weight: bold; margin-top: 5px; display: inline-block;">(View Once 💣)</small>';
        }
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

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