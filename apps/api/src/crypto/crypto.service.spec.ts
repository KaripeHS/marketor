import { CryptoService } from "./crypto.service";

describe("CryptoService", () => {
    let service: CryptoService;

    beforeEach(() => {
        service = new CryptoService();
    });

    describe("when encryption is disabled", () => {
        beforeEach(() => {
            // Don't set TOKEN_ENCRYPTION_KEY, so encryption is disabled
            service.onModuleInit();
        });

        it("should return false for isEncryptionEnabled", () => {
            expect(service.isEncryptionEnabled()).toBe(false);
        });

        it("should return plaintext when encrypting", () => {
            const plaintext = "my-secret-token";
            expect(service.encrypt(plaintext)).toBe(plaintext);
        });

        it("should return ciphertext as-is when decrypting", () => {
            const ciphertext = "some-unencrypted-text";
            expect(service.decrypt(ciphertext)).toBe(ciphertext);
        });

        it("should return object as-is when encrypting object", () => {
            const obj = { token: "secret", value: "test" };
            expect(service.encryptObject(obj)).toEqual(obj);
        });

        it("should return object as-is when decrypting object", () => {
            const obj = { token: "secret", value: "test" };
            expect(service.decryptObject(obj)).toEqual(obj);
        });
    });

    describe("when encryption is enabled", () => {
        const validKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"; // 64 hex chars = 256 bits

        beforeEach(() => {
            process.env.TOKEN_ENCRYPTION_KEY = validKey;
            service = new CryptoService();
            service.onModuleInit();
        });

        afterEach(() => {
            delete process.env.TOKEN_ENCRYPTION_KEY;
        });

        it("should return true for isEncryptionEnabled", () => {
            expect(service.isEncryptionEnabled()).toBe(true);
        });

        it("should encrypt plaintext with 'enc:' prefix", () => {
            const plaintext = "my-secret-token";
            const encrypted = service.encrypt(plaintext);
            expect(encrypted.startsWith("enc:")).toBe(true);
            expect(encrypted).not.toBe(plaintext);
        });

        it("should decrypt back to original plaintext", () => {
            const plaintext = "my-secret-token";
            const encrypted = service.encrypt(plaintext);
            const decrypted = service.decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
        });

        it("should handle empty string", () => {
            const plaintext = "";
            const encrypted = service.encrypt(plaintext);
            const decrypted = service.decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
        });

        it("should handle unicode characters", () => {
            const plaintext = "Hello 世界 🌍";
            const encrypted = service.encrypt(plaintext);
            const decrypted = service.decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
        });

        it("should return non-encrypted data as-is during decrypt", () => {
            const unencrypted = "plain-text-without-prefix";
            expect(service.decrypt(unencrypted)).toBe(unencrypted);
        });

        it("should produce different ciphertexts for same plaintext (due to random IV)", () => {
            const plaintext = "same-secret";
            const encrypted1 = service.encrypt(plaintext);
            const encrypted2 = service.encrypt(plaintext);
            expect(encrypted1).not.toBe(encrypted2);
        });

        it("should encrypt object string values", () => {
            const obj = { token: "secret", number: 123, nested: null };
            const encrypted = service.encryptObject(obj);
            expect(encrypted.token).not.toBe("secret");
            expect((encrypted.token as string).startsWith("enc:")).toBe(true);
            expect(encrypted.number).toBe(123);
            expect(encrypted.nested).toBe(null);
        });

        it("should decrypt object string values", () => {
            const obj = { token: "secret", value: "test" };
            const encrypted = service.encryptObject(obj);
            const decrypted = service.decryptObject(encrypted);
            expect(decrypted.token).toBe("secret");
            expect(decrypted.value).toBe("test");
        });
    });

    describe("utility methods", () => {
        beforeEach(() => {
            service.onModuleInit();
        });

        it("should generate a valid 64-character hex key", () => {
            const key = service.generateKey();
            expect(key).toHaveLength(64);
            expect(/^[0-9a-f]+$/.test(key)).toBe(true);
        });

        it("should generate consistent hash for same input", () => {
            const data = "test-data";
            const hash1 = service.hash(data);
            const hash2 = service.hash(data);
            expect(hash1).toBe(hash2);
        });

        it("should generate different hashes for different inputs", () => {
            const hash1 = service.hash("data1");
            const hash2 = service.hash("data2");
            expect(hash1).not.toBe(hash2);
        });

        it("should return 64-character SHA256 hash", () => {
            const hash = service.hash("test");
            expect(hash).toHaveLength(64);
            expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
        });

        it("should generate secure token of specified length", () => {
            const token16 = service.generateSecureToken(16);
            const token32 = service.generateSecureToken(32);
            // Base64url encoding: ceil(bytes * 8 / 6) chars
            expect(token16.length).toBeGreaterThan(0);
            expect(token32.length).toBeGreaterThan(token16.length);
        });

        it("should generate unique secure tokens", () => {
            const token1 = service.generateSecureToken();
            const token2 = service.generateSecureToken();
            expect(token1).not.toBe(token2);
        });
    });

    describe("invalid key handling", () => {
        it("should disable encryption for invalid key length", () => {
            process.env.TOKEN_ENCRYPTION_KEY = "tooshort";
            service = new CryptoService();
            service.onModuleInit();
            expect(service.isEncryptionEnabled()).toBe(false);
            delete process.env.TOKEN_ENCRYPTION_KEY;
        });
    });
});
