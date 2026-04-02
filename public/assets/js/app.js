/**
 * Copyright Alen Pepa
 * All rights reserved.
 * 
 * Main Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');

    // -- LOGJIKA E REGJISTRIMIT --
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                // Gjenerojmë çelësat lokalë (WebCrypto)
                const keys = await CryptoApp.generateKeyPairs();
                const publicIdentityKey = await CryptoApp.exportPublicKeyToBase64(keys.identityKeyPair.publicKey);
                const publicSigningKey = await CryptoApp.exportPublicKeyToBase64(keys.signingKeyPair.publicKey);
                
                // (Këtu në një app të plotë, do t'i enkriptonim çelësat privatë dhe do t'i ruanim në localStorage)

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
                    alert('Registration successful! Please login.');
                    document.getElementById('showLogin').click(); // Kalon te forma e hyrjes
                } else {
                    alert('Error: ' + result.error);
                }
            } catch (error) {
                console.error("Registration error:", error);
            }
        });
    }

    // -- LOGJIKA E HYRJES (LOGIN) --
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login_username').value;
            const password = document.getElementById('login_password').value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                });

                const result = await response.json();
                if (response.ok) {
                    // (Këtu do të "shkyçnim" çelësat privatë të përdoruesit nga localStorage duke përdorur password-in)
                    
                    // Rifreskojmë faqen. PHP tani do të shohë sesionin dhe do të hapë Chat-in!
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
