/**
 * Copyright Alen Pepa
 * All rights reserved.
 * 
 * Full Cryptographic Module for E2EE Social Network
 */

const CryptoApp = (function() {
    'use strict';

    // --- KEY GENERATION & EXPORT ---
    
    async function generateKeyPairs() {
        const identityKeyPair = await window.crypto.subtle.generateKey(
            { name: "ECDH", namedCurve: "P-256" },
            true, ["deriveKey", "deriveBits"]
        );
        const signingKeyPair = await window.crypto.subtle.generateKey(
            { name: "ECDSA", namedCurve: "P-256" },
            true, ["sign", "verify"]
        );
        return { identityKeyPair, signingKeyPair };
    }

    async function exportPublicKeyToBase64(cryptoKey) {
        const exported = await window.crypto.subtle.exportKey("spki", cryptoKey);
        return window.btoa(String.fromCharCode(...new Uint8Array(exported)));
    }

    async function importPublicKeyFromBase64(base64Key) {
        const binaryString = window.atob(base64Key);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return await window.crypto.subtle.importKey(
            "spki", bytes, { name: "ECDH", namedCurve: "P-256" }, true, []
        );
    }

    // --- MESSAGE ENCRYPTION (E2EE) ---

    // Krijon një çelës AES-GCM nga Private Key jote + Public Key i marrësit
    async function deriveSharedSecret(myPrivateKey, theirPublicKey) {
        return await window.crypto.subtle.deriveKey(
            { name: "ECDH", public: theirPublicKey },
            myPrivateKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    }

    async function encryptMessage(text, sharedSecretKey) {
        const encoder = new TextEncoder();
        const encodedText = encoder.encode(text);
        
        // Nonce duhet të jetë gjithmonë unik për çdo mesazh (12 bytes për AES-GCM)
        const nonce = window.crypto.getRandomValues(new Uint8Array(12));
        
        const ciphertextBuffer = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: nonce },
            sharedSecretKey,
            encodedText
        );

        return {
            ciphertext: window.btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer))),
            nonce: window.btoa(String.fromCharCode(...nonce))
        };
    }

    async function decryptMessage(ciphertextBase64, nonceBase64, sharedSecretKey) {
        const ciphertextBytes = new Uint8Array(window.atob(ciphertextBase64).split('').map(c => c.charCodeAt(0)));
        const nonceBytes = new Uint8Array(window.atob(nonceBase64).split('').map(c => c.charCodeAt(0)));
        
        try {
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: nonceBytes },
                sharedSecretKey,
                ciphertextBytes
            );
            const decoder = new TextDecoder();
            return decoder.decode(decryptedBuffer);
        } catch (e) {
            console.error("Decryption failed:", e);
            return "[Encrypted Message - Key Mismatch]";
        }
    }

    return {
        generateKeyPairs,
        exportPublicKeyToBase64,
        importPublicKeyFromBase64,
        deriveSharedSecret,
        encryptMessage,
        decryptMessage
    };
})();