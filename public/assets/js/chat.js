/**
 * Copyright Alen Pepa
 * All rights reserved.
 * 
 * Chat Dashboard Logic (E2EE & View Once) with Secure Private Key
 */

document.addEventListener('DOMContentLoaded', async () => {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return; // Mbrojtje

    let currentChatUserId = null;
    let currentSharedSecret = null;
    let allUsers = [];
    let myPrivateKey = null;

    async function deriveLocalKey(password, saltString) {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits", "deriveKey"]
        );
        const salt = enc.encode(saltString);
        return window.crypto.subtle.deriveKey(
            { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
            keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
        );
    }

    async function decryptPrivateKey(encryptedBase64, ivBase64, localAesKey, keyType) {
        const ciphertextBytes = new Uint8Array(window.atob(encryptedBase64).split('').map(c => c.charCodeAt(0)));
        const ivBytes = new Uint8Array(window.atob(ivBase64).split('').map(c => c.charCodeAt(0)));
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: ivBytes }, localAesKey, ciphertextBytes
        );
        return await window.crypto.subtle.importKey(
            "pkcs8", decryptedBuffer, { name: keyType, namedCurve: "P-256" }, true, 
            keyType === "ECDH" ? ["deriveKey", "deriveBits"] : ["sign"]
        );
    }

    // --- MENAXHIMI I ÇELËSIT PRIVAT (PA INFINITE LOOP) ---
    const activePrivateKeyBase64 = sessionStorage.getItem('active_private_key');
    
    if (activePrivateKeyBase64) {
        const privKeyBytes = new Uint8Array(window.atob(activePrivateKeyBase64).split('').map(c => c.charCodeAt(0)));
        myPrivateKey = await window.crypto.subtle.importKey(
            "pkcs8", privKeyBytes, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"]
        );
    } else {
        const usernameEl = document.getElementById('myUsername');
        if (usernameEl) {
            const username = usernameEl.textContent.trim();
            const savedKeysJson = localStorage.getItem(`keys_${username}`);
            
            if (savedKeysJson) {
                const password = prompt("Session locked. Please enter your Master Password to decrypt your messages:");
                if (password) {
                    try {
                        const savedKeys = JSON.parse(savedKeysJson);
                        const localAesKey = await deriveLocalKey(password, username);
                        myPrivateKey = await decryptPrivateKey(savedKeys.identityObj.ciphertext, savedKeys.identityObj.iv, localAesKey, "ECDH");
                        
                        const exportedPriv = await window.crypto.subtle.exportKey("pkcs8", myPrivateKey);
                        const privBase64 = window.btoa(String.fromCharCode(...new Uint8Array(exportedPriv)));
                        sessionStorage.setItem('active_private_key', privBase64);
                    } catch (e) {
                        alert("Invalid password! Logging out securely.");
                        // Vrit sesionin në PHP dhe bëj redirect
                        fetch('/api/logout', { method: 'POST' }).then(() => window.location.href = '/');
                        return;
                    }
                } else {
                    fetch('/api/logout', { method: 'POST' }).then(() => window.location.href = '/');
                    return;
                }
            } else {
                alert("Private Keys missing on this device. You must login again.");
                fetch('/api/logout', { method: 'POST' }).then(() => window.location.href = '/');
                return;
            }
        }
    }

    // --- LOGJIKA E CHAT-IT ---
    const contactList = document.getElementById('contactList');
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
        currentSharedSecret = await CryptoApp.deriveSharedSecret(myPrivateKey, theirPublicKey);

        loadMessages(user.id);
    }

    async function loadMessages(otherUserId) {
        const res = await fetch(`/api/messages/${otherUserId}`);
        const data = await res.json();

        if (data.success && currentSharedSecret) {
            chatMessages.innerHTML = '';
            for (let msg of data.messages) {
                const plainText = await CryptoApp.decryptMessage(msg.ciphertext, msg.nonce, currentSharedSecret);
                const isMine = (msg.sender_id != otherUserId);
                
                const msgDiv = document.createElement('div');
                msgDiv.className = `message ${isMine ? 'sent' : 'received'}`;
                msgDiv.textContent = plainText;
                
                if (msg.view_once == 1) {
                    msgDiv.innerHTML += '<br><small style="color: #fbbf24; font-weight: bold; margin-top: 5px; display: inline-block;">(View Once 💣)</small>';
                    if (!isMine) {
                        fetch(`/api/messages/consume/${msg.id}`, { method: 'POST' });
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
    setInterval(() => {
        if (currentChatUserId) loadMessages(currentChatUserId);
    }, 3000);
});
