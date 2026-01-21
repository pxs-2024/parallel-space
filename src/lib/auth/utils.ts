import { ALPHABET } from "./constants";

/**
 * 生成安全的随机字符串
 * @returns
 */
export function generateSecureRandomString(): string {
	// Generate 24 bytes = 192 bits of entropy.
	// We're only going to use 5 bits per byte so the total entropy will be 192 * 5 / 8 = 120 bits
	const bytes = new Uint8Array(24);
	crypto.getRandomValues(bytes);

	let id = "";
	for (let i = 0; i < bytes.length; i++) {
		// >> 3 "removes" the right-most 3 bits of the byte
		id += ALPHABET[bytes[i] >> 3];
	}
	return id;
}

/**
 * 哈希密钥
 * @param secret
 * @returns
 */
export async function hashSecret(secret: string): Promise<Uint8Array> {
	const secretBytes = new TextEncoder().encode(secret);
	const buf = await crypto.subtle.digest("SHA-256", secretBytes);
	return new Uint8Array(buf);
}

/**
 * 常数时间相等比较
 * @param a
 * @param b
 * @returns
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.byteLength !== b.byteLength) return false;
	let c = 0;
	for (let i = 0; i < a.byteLength; i++) c |= a[i] ^ b[i];
	return c === 0;
}
