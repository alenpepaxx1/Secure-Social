/**
 * Copyright Alen Pepa
 * All rights reserved.
 * 
 * Main Application Logic - Registration & Login with Secure Key Storage
 */

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');

    // --- FUNKSIONET NDIHMËSE PËR ENKRIPTIMIN E ÇELËSAVE LOKALË ---

    // Krijon një çelës të fortë (AES-GCM) nga Master Password duke përdorur PBKDF2
    async function deriveLocalKey(password, saltString) {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits", "deriveKey"]
        );
        const salt = enc.encode(saltString); // Përdorim username-in si salt
        
        return window.crypto.subtle.deriveKey(
            { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
            keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
        );
    }

    // Enkripton Private Key me AES-GCM dhe e kthen në Base64
    async function encryptPrivateKey(privateKey, localAesKey) {
        const exportedPrivateKey = await window.crypto.subtle.exportKey("pkcs8", privateKey);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encryptedBuffer = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv }, localAesKey, exportedPrivateKey
        );
        
        return {
            ciphertext: window.btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
            iv: window.btoa(String.fromCharCode(...iv))
        };
    }

    // Dekripton Private Key nga Base64 duke përdorur AES-GCM
    async function decryptPrivateKey(encryptedBase64, ivBase64, localAesKey, keyType) {
        const ciphertextBytes = new Uint8Array(window.atob(encryptedBase64).split('').map(c => c.charCodeAt(0)));
        const ivBytes = new Uint8Array(window.atob(ivBase64).split('').map(c => c.charCodeAt(0)));
        
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: ivBytes }, localAesKey, ciphertextBytes
        );
        
        // KeyType është "ECDH" (për identity) ose "ECDSA" (për signing)
        return await window.crypto.subtle.importKey(
            "pkcs8", decryptedBuffer, { name: keyType, namedCurve: "P-256" }, true, 
            keyType === "ECDH" ? ["deriveKey", "deriveBits"] : ["sign"]
        );
    }

    // --- LOGJIKA E REGJISTRIMIT ---
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;

            try {
                // 1. Gjenerojmë çelësat E2EE
                const keys = await CryptoApp.generateKeyPairs();
                
                // 2. Eksportojmë Public Keys për Serverin
                const publicIdentityKey = await CryptoApp.exportPublicKeyToBase64(keys.identityKeyPair.publicKey);
                const publicSigningKey = await CryptoApp.exportPublicKeyToBase64(keys.signingKeyPair.publicKey);
                
                // 3. Enkriptojmë Private Keys lokalisht me Password-in
                const localAesKey = await deriveLocalKey(password, username);
                const encIdentityPriv = await encryptPrivateKey(keys.identityKeyPair.privateKey, localAesKey);
                const encSigningPriv = await encryptPrivateKey(keys.signingKeyPair.privateKey, localAesKey);
                
                // Ruajmë në localStorage të enkriptuara! (Askush s'i lexon dot pa password)
                localStorage.setItem(`keys_${username}`, JSON.stringify({
                    identityObj: encIdentityPriv,
                    signingObj: encSigningPriv
                }));

                // 4. Dërgojmë kërkesën në API
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: username,
                        password: password,
                        public_identity_key: publicIdentityKey,
                        public_signing_key: publicSigningKey
                    })
                });

                const result = await response.json();
                if (response.ok) {
                    alert('Registration successful! Your keys are secured. Please login.');
                    document.getElementById('showLogin').click(); // Kalon te forma e hyrjes
                } else {
                    alert('Error: ' + result.error);
                }
            } catch (error) {
                console.error("Registration error:", error);
                alert("Cryptographic error during registration.");
            }
        });
    }

    // --- LOGJIKA E HYRJES (LOGIN) ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login_username').value.trim();
            const password = document.getElementById('login_password').value;

            try {
                // 1. Kontrollojmë nëse kemi çelësa të ruajtur në këtë shfletues
                const savedKeysJson = localStorage.getItem(`keys_${username}`);
                if (!savedKeysJson) {
                    alert("Error: Private keys not found on this device. You can only login from the device you registered on (for this MVP).");
                    return;
                }

                // 2. Dekriptojmë çelësat Privatë me Fjalëkalimin!
                const savedKeys = JSON.parse(savedKeysJson);
                const localAesKey = await deriveLocalKey(password, username);
                
                let myPrivateKey;
                try {
                    myPrivateKey = await decryptPrivateKey(
                        savedKeys.identityObj.ciphertext, 
                        savedKeys.identityObj.iv, 
                        localAesKey, "ECDH"
                    );
                } catch (decErr) {
                    alert("Invalid Master Password! Failed to decrypt your local keys.");
                    return;
                }

                // 3. Nëse dekriptimi ishte OK, bëjmë Login në Server
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const result = await response.json();
                if (response.ok) {
                    // Ruajmë çelësin privat në memorien e përkohshme (sessionStorage ose ndryshore window) 
                    // që chat.js ta përdorë pa e ruajtur në disk të pambrojtur.
                    
                    // Eksportojmë përsëri në PKCS8 të pastër për ta ruajtur në sessionStorage për këtë sesion
                    const exportedPriv = await window.crypto.subtle.exportKey("pkcs8", myPrivateKey);
                    const privBase64 = window.btoa(String.fromCharCode(...new Uint8Array(exportedPriv)));
                    sessionStorage.setItem('active_private_key', privBase64);

                    // Rifreskojmë faqen për të hapur Chat Dashboard
                    window.location.reload();
                } else {
                    alert('Error: ' + result.error);
                }
            } catch (error) {
                console.error("Login error:", error);
            }
        });
    }
});
