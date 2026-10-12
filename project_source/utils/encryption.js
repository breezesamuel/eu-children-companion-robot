const crypto = require('crypto');
const { Transform, pipeline } = require('stream');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_ROUNDS = 100000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 32;
const HASH_ALGORITHM = 'sha512';
const DEFAULT_KEY_VERSION = 'v1';

let currentKeyVersion = DEFAULT_KEY_VERSION;

const keyStore = new Map();

function loadKey(version) {
    if (keyStore.has(version)) return keyStore.get(version);
    const envKey = `ENCRYPTION_KEY_${version.toUpperCase()}`;
    const secret = process.env[envKey] || process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production-xxxx';
    const key = crypto.createHash('sha256').update(secret).digest();
    keyStore.set(version, key);
    return key;
}

function getKey(version) {
    return loadKey(version || currentKeyVersion);
}

function setKeyVersion(version) {
    currentKeyVersion = version;
}

function rotateKey(newVersion, newSecret) {
    keyStore.set(newVersion, crypto.createHash('sha256').update(newSecret).digest());
    currentKeyVersion = newVersion;
}

function encrypt(text, version) {
    if (text === null || text === undefined) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    const keyVer = version || currentKeyVersion;
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(keyVer), iv);
    let encrypted = cipher.update(String(text), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${keyVer}:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(encrypted) {
    if (!encrypted) return null;
    const parts = encrypted.split(':');
    if (parts.length === 4) {
        const [keyVer, ivHex, authTagHex, ciphertext] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const key = getKey(keyVer);
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    if (parts.length === 3) {
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encryptedText = parts[2];
        const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    return encrypted;
}

function encryptObject(obj, fields) {
    if (!obj) return obj;
    const result = { ...obj };
    for (const field of fields) {
        if (result[field] !== undefined && result[field] !== null) {
            result[field] = encrypt(result[field]);
        }
    }
    return result;
}

function decryptObject(obj, fields) {
    if (!obj) return obj;
    const result = { ...obj };
    for (const field of fields) {
        if (result[field]) {
            result[field] = decrypt(result[field]) || result[field];
        }
    }
    return result;
}

function encryptNestedFields(obj, fieldPath) {
    if (!obj) return obj;
    const result = Array.isArray(obj) ? [...obj] : { ...obj };
    const keys = typeof fieldPath === 'string' ? fieldPath.split('.') : fieldPath;
    let current = result;
    for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === undefined || current[keys[i]] === null) return result;
        if (typeof current[keys[i]] !== 'object') return result;
        current = current[keys[i]];
    }
    const lastKey = keys[keys.length - 1];
    if (current[lastKey] !== undefined && current[lastKey] !== null) {
        current[lastKey] = encrypt(current[lastKey]);
    }
    return result;
}

function hashPassword(password) {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
        crypto.pbkdf2(password, salt, KEY_ROUNDS, KEY_LENGTH, HASH_ALGORITHM, (err, key) => {
            if (err) return reject(err);
            resolve(`${salt}:${key.toString('hex')}`);
        });
    });
}

function verifyPassword(password, hash) {
    return new Promise((resolve, reject) => {
        const parts = hash.split(':');
        if (parts.length !== 2) return resolve(false);
        const [salt, keyHex] = parts;
        crypto.pbkdf2(password, salt, KEY_ROUNDS, KEY_LENGTH, HASH_ALGORITHM, (err, key) => {
            if (err) return reject(err);
            resolve(key.toString('hex') === keyHex);
        });
    });
}

function generateToken(length = 48) {
    return crypto.randomBytes(length).toString('hex');
}

function generateTimeBasedToken(ttlMs = 3600000) {
    const expires = Date.now() + ttlMs;
    const random = crypto.randomBytes(32).toString('hex');
    const payload = `${expires}:${random}`;
    return { token: payload, expiresAt: expires };
}

function signData(data, secret) {
    const hmac = crypto.createHmac('sha256', secret || process.env.HMAC_SECRET || 'default-hmac-secret');
    hmac.update(typeof data === 'string' ? data : JSON.stringify(data));
    return hmac.digest('hex');
}

function verifySignature(data, signature, secret) {
    const expected = signData(data, secret);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

function urlSafeBase64Encode(data) {
    return Buffer.from(data).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function urlSafeBase64Decode(encoded) {
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (2 - encoded.length * 3) % 4);
    return Buffer.from(padded, 'base64').toString('utf8');
}

function maskSensitiveData(value, visibleChars = 4, maskChar = '*') {
    if (!value) return value;
    const str = String(value);
    if (str.length <= visibleChars) return str;
    const masked = maskChar.repeat(Math.min(str.length - visibleChars, 12));
    return masked + str.slice(-visibleChars);
}

function generateSecureString(length = 32, charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
    const bytes = crypto.randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
        result += charset[bytes[i] % charset.length];
    }
    return result;
}

function xorObfuscate(data, key) {
    const keyBuf = Buffer.from(key || process.env.XOR_KEY || 'default-xor-key');
    const dataBuf = Buffer.from(data, 'utf8');
    const result = Buffer.alloc(dataBuf.length);
    for (let i = 0; i < dataBuf.length; i++) {
        result[i] = dataBuf[i] ^ keyBuf[i % keyBuf.length];
    }
    return result.toString('base64');
}

function xorDeobfuscate(encoded, key) {
    const keyBuf = Buffer.from(key || process.env.XOR_KEY || 'default-xor-key');
    const dataBuf = Buffer.from(encoded, 'base64');
    const result = Buffer.alloc(dataBuf.length);
    for (let i = 0; i < dataBuf.length; i++) {
        result[i] = dataBuf[i] ^ keyBuf[i % keyBuf.length];
    }
    return result.toString('utf8');
}

function createEncryptStream(keyVersion) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey(keyVersion || currentKeyVersion);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let headerSent = false;
    return new Transform({
        transform(chunk, encoding, callback) {
            if (!headerSent) {
                headerSent = true;
                this.push(`${keyVersion || currentKeyVersion}:${iv.toString('hex')}:`);
            }
            this.push(cipher.update(chunk));
            callback();
        },
        flush(callback) {
            this.push(cipher.final());
            this.push(`:${cipher.getAuthTag().toString('hex')}`);
            callback();
        }
    });
}

function createDecryptStream() {
    let headerParsed = false;
    let keyVer = null;
    let iv = null;
    let decipher = null;
    let authTagBuf = null;
    let buffer = Buffer.alloc(0);
    return new Transform({
        transform(chunk, encoding, callback) {
            if (!headerParsed) {
                buffer = Buffer.concat([buffer, chunk]);
                const headerEnd = buffer.indexOf(':');
                if (headerEnd === -1) return callback();
                const afterIv = buffer.indexOf(':', headerEnd + 1);
                if (afterIv === -1) return callback();
                keyVer = buffer.slice(0, headerEnd).toString();
                const ivHex = buffer.slice(headerEnd + 1, afterIv).toString();
                iv = Buffer.from(ivHex, 'hex');
                decipher = crypto.createDecipheriv(ALGORITHM, getKey(keyVer), iv);
                headerParsed = true;
                const remaining = buffer.slice(afterIv + 1);
                const authTagSep = remaining.lastIndexOf(':');
                if (authTagSep !== -1 && authTagSep === remaining.length - 33) {
                    buffer = remaining;
                } else {
                    if (remaining.length > 0) this.push(decipher.update(remaining));
                    buffer = Buffer.alloc(0);
                }
                return callback();
            }
            this.push(decipher.update(chunk));
            callback();
        },
        flush(callback) {
            if (buffer && buffer.length > 0) {
                const authTagSep = buffer.lastIndexOf(':');
                if (authTagSep !== -1 && authTagSep === buffer.length - 33) {
                    const cipherEnd = buffer.slice(0, authTagSep);
                    const authTagHex = buffer.slice(authTagSep + 1).toString();
                    authTagBuf = Buffer.from(authTagHex, 'hex');
                    if (cipherEnd.length > 0) this.push(decipher.update(cipherEnd));
                }
            }
            try {
                if (authTagBuf) decipher.setAuthTag(authTagBuf);
                this.push(decipher.final());
            } catch (e) {
                return callback(e);
            }
            callback();
        }
    });
}

function encryptFile(inputPath, outputPath, keyVersion) {
    return new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(inputPath);
        const writeStream = fs.createWriteStream(outputPath);
        const encryptStream = createEncryptStream(keyVersion);
        pipeline(readStream, encryptStream, writeStream, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

function decryptFile(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(inputPath);
        const writeStream = fs.createWriteStream(outputPath);
        const decryptStream = createDecryptStream();
        pipeline(readStream, decryptStream, writeStream, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

module.exports = {
    encrypt, decrypt, encryptObject, decryptObject, encryptNestedFields,
    hashPassword, verifyPassword,
    generateToken, generateTimeBasedToken,
    signData, verifySignature,
    urlSafeBase64Encode, urlSafeBase64Decode,
    maskSensitiveData, generateSecureString,
    xorObfuscate, xorDeobfuscate,
    createEncryptStream, createDecryptStream,
    encryptFile, decryptFile,
    setKeyVersion, rotateKey, loadKey
};
