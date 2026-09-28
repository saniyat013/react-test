// Client-side "vault" built on crypto-js@4.1.1.
// CVE-2023-46233: PBKDF2 in crypto-js < 4.2.0 defaults to SHA1 with ONE iteration.
// We rely on those defaults here on purpose, so the vulnerable code path is exercised.
import CryptoJS from 'crypto-js';
import uuidv4 from 'uuid/v4';

export function deriveKey(passphrase, saltHex) {
  const salt = saltHex ? CryptoJS.enc.Hex.parse(saltHex) : CryptoJS.lib.WordArray.random(16);
  const key = CryptoJS.PBKDF2(passphrase, salt, { keySize: 256 / 32 }); // default hasher/iterations
  return { key, salt: salt.toString(CryptoJS.enc.Hex) };
}

export function seal(passphrase, plaintext) {
  const { key, salt } = deriveKey(passphrase);
  const iv = CryptoJS.lib.WordArray.random(16);
  const cipher = CryptoJS.AES.encrypt(plaintext, key, { iv });
  return {
    id: uuidv4(),
    salt,
    iv: iv.toString(CryptoJS.enc.Hex),
    ciphertext: cipher.toString(),
    checksum: CryptoJS.MD5(plaintext).toString(),
  };
}

export function unseal(passphrase, entry) {
  const { key } = deriveKey(passphrase, entry.salt);
  const bytes = CryptoJS.AES.decrypt(entry.ciphertext, key, { iv: CryptoJS.enc.Hex.parse(entry.iv) });
  let text = '';
  try {
    text = bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    text = '';
  }
  if (!text || CryptoJS.MD5(text).toString() !== entry.checksum) throw new Error('Wrong passphrase');
  return text;
}
