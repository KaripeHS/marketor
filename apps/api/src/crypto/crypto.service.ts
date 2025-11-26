import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

interface EncryptedData {
    iv: string;
    authTag: string;
    data: string;
}

@Injectable()
export class CryptoService implements OnModuleInit {
    private readonly logger = new Logger(CryptoService.name);
    private encryptionKey: Buffer | null = null;
    private isEnabled = false;

    onModuleInit() {
        const keyHex = process.env.TOKEN_ENCRYPTION_KEY;

        if (!keyHex) {
            this.logger.warn(
                "TOKEN_ENCRYPTION_KEY not configured - token encryption disabled. " +
                "Generate a key with: openssl rand -hex 32"
            );
            return;
        }

        if (keyHex.length !== KEY_LENGTH * 2) {
            this.logger.error(
                `Invalid TOKEN_ENCRYPTION_KEY length. Expected ${KEY_LENGTH * 2} hex characters (256 bits), got ${keyHex.length}`
            );
            return;
        }

        try {
            this.encryptionKey = Buffer.from(keyHex, "hex");
            this.isEnabled = true;
            this.logger.log("Token encryption enabled");
        } catch (error) {
            this.logger.error("Failed to initialize encryption key:", error);
        }
    }

    isEncryptionEnabled(): boolean {
        return this.isEnabled;
    }

    encrypt(plaintext: string): string {
        if (!this.isEnabled || !this.encryptionKey) {
            // Return plaintext if encryption is not enabled (for backwards compatibility)
            return plaintext;
        }

        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);

        let encrypted = cipher.update(plaintext, "utf8", "base64");
        encrypted += cipher.final("base64");

        const authTag = cipher.getAuthTag();

        const encryptedData: EncryptedData = {
            iv: iv.toString("base64"),
            authTag: authTag.toString("base64"),
            data: encrypted,
        };

        // Return as base64-encoded JSON prefixed with "enc:" to identify encrypted data
        return "enc:" + Buffer.from(JSON.stringify(encryptedData)).toString("base64");
    }

    decrypt(ciphertext: string): string {
        if (!this.isEnabled || !this.encryptionKey) {
            // Return as-is if encryption is not enabled
            return ciphertext;
        }

        // Check if this is encrypted data
        if (!ciphertext.startsWith("enc:")) {
            // Not encrypted (legacy data), return as-is
            return ciphertext;
        }

        try {
            const encryptedJson = Buffer.from(ciphertext.slice(4), "base64").toString("utf8");
            const encryptedData: EncryptedData = JSON.parse(encryptedJson);

            const iv = Buffer.from(encryptedData.iv, "base64");
            const authTag = Buffer.from(encryptedData.authTag, "base64");
            const data = encryptedData.data;

            const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(data, "base64", "utf8");
            decrypted += decipher.final("utf8");

            return decrypted;
        } catch (error) {
            this.logger.error("Failed to decrypt token:", error);
            // Return original ciphertext on failure (might be legacy unencrypted data)
            return ciphertext;
        }
    }

    encryptObject<T extends object>(obj: T): T {
        if (!this.isEnabled) {
            return obj;
        }

        const result = { ...obj } as Record<string, unknown>;
        for (const key of Object.keys(result)) {
            if (typeof result[key] === "string" && result[key]) {
                result[key] = this.encrypt(result[key] as string);
            }
        }
        return result as T;
    }

    decryptObject<T extends object>(obj: T): T {
        if (!this.isEnabled) {
            return obj;
        }

        const result = { ...obj } as Record<string, unknown>;
        for (const key of Object.keys(result)) {
            if (typeof result[key] === "string" && result[key]) {
                result[key] = this.decrypt(result[key] as string);
            }
        }
        return result as T;
    }

    generateKey(): string {
        return crypto.randomBytes(KEY_LENGTH).toString("hex");
    }

    hash(data: string): string {
        return crypto.createHash("sha256").update(data).digest("hex");
    }

    generateSecureToken(length: number = 32): string {
        return crypto.randomBytes(length).toString("base64url");
    }
}
