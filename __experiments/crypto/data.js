
/** zero iv */
export const iv = new Uint8Array(16);

export const key = new Uint8Array([42, 40, 254, 9, 99, 201, 174, 52, 226, 21, 90, 155, 81, 50, 2, 9]);

//----------------------------------------------------------------//

/** From Mega.nz (Zero padding)
 * So, you will not see these zeros in the console, but there will be the affect on the length of the string
 * Or specify the padding type (For example, for CryptoJS: `padding: CryptoJS.pad.ZeroPadding`) */

/** "MEGA{"n":"SharedFile.jpg","c":"GRSM8+c1HUmlmyDuTJVrDwSDpqRV"}   " */
export const encryptedStr1 = new Uint8Array([102, 80, 220, 73, 185, 233, 85, 7, 195, 196, 137, 107, 65, 150, 162, 161, 80, 82, 26, 18, 110, 247, 189, 176, 35, 197, 140, 4, 138, 75, 159, 197, 75, 88, 131, 23, 235, 125, 96, 81, 41, 170, 220, 45, 64, 55, 30, 68, 39, 6, 112, 194, 243, 209, 177, 173, 54, 71, 21, 172, 62, 147, 112, 76]);

//----------------------------------------------------------------//
/** From Web Crypto API (with padding): */

/** "HELL HERE" (with padding) */
export const encryptedStr2 = new Uint8Array([118, 73, 62, 232, 208, 175, 192, 43, 24, 22, 151, 120, 109, 167, 24, 74]);

//----------------------------------------------------------------//

/** These two string has `13,13,13,13,13,13,13,13,13,13,13,13,13` padding
 *  – it is `\r\r\r\r\r\r\r\r\r\r\r\r\r` - so you will not see the text in the console
 */

/**  "ABC-123-DEF-WWW-XYZ" (with padding, 13) */
export const encryptedStr3 = new Uint8Array([255, 254, 228, 199, 25, 196, 199, 106, 185, 142, 51, 152, 69, 59, 73, 254, 33, 80, 79, 239, 243, 89, 78, 254, 84, 172, 170, 7, 192, 53, 143, 109]);
/**  "1234567890ABCDEFXXX" (with padding, 13) */
export const encryptedStr4 = new Uint8Array([29, 73, 21, 192, 202, 137, 148, 207, 18, 91, 246, 58, 217, 116, 86, 2, 66, 227, 27, 224, 33, 149, 83, 151, 159, 92, 126, 38, 128, 111, 55, 109]);
