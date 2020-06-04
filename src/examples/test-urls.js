/**
 * The new links format [2020.04.02]
 * https://github.com/meganz/webclient/commit/a43b633bb156515bb9d6d79e0a3e0cedcdadb143
 * https://github.com/meganz/web-extension/commit/352f4f89745c6d10969ddebd3ee5a53cc7a8df35
 * ---
 * "https://mega.nz/file/SHARE_ID#DECTYPTION_KEY"
 * "https://mega.nz/folder/SHARE_ID#DECTYPTION_KEY/file/SELECTED_NODE_ID"
 * "https://mega.nz/folder/SHARE_ID#DECTYPTION_KEY"
 * "https://mega.nz/folder/SHARE_ID#DECTYPTION_KEY/folder/SELECTED_NODE_ID"
 * ---
 * The old format:
 * "https://mega.nz/#!SHARE_ID!DECRYPTION_KEY" – for a file
 * "https://mega.nz/#F!SHARE_ID!DECRYPTION_KEY" – for a folder
 * "https://mega.nz/#F!SHARE_ID!DECRYPTION_KEY?SELECTED_FILE_NODE_ID"
 * "https://mega.nz/#F!SHARE_ID!DECRYPTION_KEY!SELECTED_FOLDER_NODE_ID"
 * ---
 *
 * I open the secret, "?" is a selector – it also can be used to select a folder without opening it, and "!" is an opener
 * – in case a file it opens additional info about a file – a page about a file versioning (".fm-versioning.overlay"),
 * (that uses only for text files, and this page is useless in shares – it contains only the row about  the last version
 * of file (note: every version of a file is a different node (has a different id)), but in home  directory file
 * versioning works ok).
 *
 * But assume that "?" used only to select a folder, and "!" to select a file.
 * (Mega works the same way when you creates a direct link to a selected file/folder,
 * and it looks that the new url format does not support these features (using "?" with folders, and "!" with files).)
 *
 *
 * The key string length for a folders share is 22:
 * 128 bit -> 16 bytes -> base64 - 24 -> remove padding ("==") - 22
 * The key string length for a file share is 43:
 * 256 bit -> 32 bytes -> base64 - 44 -> remove padding ("=")  - 43
 */


/* ---------------------------------------------------------------
 * THE OLD FORMAT OF THE URLs
 * ------------------------------------------------------------ */

// The key for the file:   "AWJuto8_fhleAI2WG0RvACtKkL_s9tAtvBXXDUp2bQk"
// The key for the folder: "ee4Q_ocD1bSLmNeg9B6kBw"

export const CAT_FILE_IMAGE_OLD             = "https://mega.nz/#!bkwkHC7D!AWJuto8_fhleAI2WG0RvACtKkL_s9tAtvBXXDUp2bQk";
export const CAT_FILE_IMAGE_NO_KEY_1_OLD    = "https://mega.nz/#!bkwkHC7D!";
export const CAT_FILE_IMAGE_NO_KEY_2_OLD    = "https://mega.nz/#!bkwkHC7D";


export const CAT_FOLDER_OLD                 = "https://mega.nz/#F!e1ogxQ7T!ee4Q_ocD1bSLmNeg9B6kBw";
export const CAT_FOLDER_SELECTED_FILE_OLD   = "https://mega.nz/#F!e1ogxQ7T!ee4Q_ocD1bSLmNeg9B6kBw?P8BBzaTS"; // [*]
export const CAT_FOLDER_SELECTED_FOLDER_OLD = "https://mega.nz/#F!e1ogxQ7T!ee4Q_ocD1bSLmNeg9B6kBw!CghQlTCa";
// *Note: After the opening the file node id and the separator will be removed from the url in the browser address bar.
// -> "https://mega.nz/#F!e1ogxQ7T!ee4Q_ocD1bSLmNeg9B6kBw" ("?P8BBzaTS" is removed)
// No key links with the selected file node ([1], [2]) work the same way.

export const CAT_FOLDER_NO_KEY_1_OLD        = "https://mega.nz/#F!e1ogxQ7T!";
export const CAT_FOLDER_NO_KEY_2_OLD        = "https://mega.nz/#F!e1ogxQ7T";

export const CAT_FOLDER_NO_KEY_SELECTED_FILE_1_OLD   = "https://mega.nz/#F!e1ogxQ7T!?P8BBzaTS"; // [1]
export const CAT_FOLDER_NO_KEY_SELECTED_FILE_2_OLD   = "https://mega.nz/#F!e1ogxQ7T?P8BBzaTS";  // [2]

export const CAT_FOLDER_NO_KEY_SELECTED_FOLDER_1_OLD = "https://mega.nz/#F!e1ogxQ7T!!CghQlTCa";
// This link does not work properly on the web version (after the key entered) – no folder is selected (opened):
export const CAT_FOLDER_NO_KEY_SELECTED_FOLDER_2_OLD = "https://mega.nz/#F!e1ogxQ7T!CghQlTCa";
// Using the opener (see the note above) sign ("!") for file links "works" the same way, URL examples:
// https://mega.nz/#F!e1ogxQ7T!P8BBzaTS (not "works"), https://mega.nz/#F!e1ogxQ7T!!P8BBzaTS (works)
//
// But using the select sign ("?") for folder work OK in both cases, URL examples:
// https://mega.nz/#F!e1ogxQ7T?CghQlTCa or https://mega.nz/#F!e1ogxQ7T!?CghQlTCa
//
// So, Mega's website can't handle one "!" properly if the key is missing.


/* ---------------------------------------------------------------
 * THE NEW FORMAT OF THE URLs
 * ------------------------------------------------------------ */

// The key for the file:   "AWJuto8_fhleAI2WG0RvACtKkL_s9tAtvBXXDUp2bQk"
// The key for the folder: "ee4Q_ocD1bSLmNeg9B6kBw"

export const CAT_FILE_IMAGE             = "https://mega.nz/file/bkwkHC7D#AWJuto8_fhleAI2WG0RvACtKkL_s9tAtvBXXDUp2bQk";
export const CAT_FILE_IMAGE_NO_KEY_1    = "https://mega.nz/file/bkwkHC7D#";
export const CAT_FILE_IMAGE_NO_KEY_2    = "https://mega.nz/file/bkwkHC7D";


export const CAT_FOLDER                 = "https://mega.nz/folder/e1ogxQ7T#ee4Q_ocD1bSLmNeg9B6kBw";

export const CAT_FOLDER_SELECTED_FILE   = "https://mega.nz/folder/e1ogxQ7T#ee4Q_ocD1bSLmNeg9B6kBw/file/P8BBzaTS"; // [**]
export const CAT_FOLDER_SELECTED_FOLDER = "https://mega.nz/folder/e1ogxQ7T#ee4Q_ocD1bSLmNeg9B6kBw/folder/CghQlTCa";
// **Note: The link will be replaced ("redirected" in web version)
//   with "https://mega.nz/folder/e1ogxQ7T#ee4Q_ocD1bSLmNeg9B6kBw/folder/e5IjHLLJ"
//   "e5IjHLLJ" is the parent folder's id of the file.
// No key links with the selected file node ([3], [4]) work the same way.

export const CAT_FOLDER_NO_KEY_1        = "https://mega.nz/folder/e1ogxQ7T#";
export const CAT_FOLDER_NO_KEY_2        = "https://mega.nz/folder/e1ogxQ7T";

export const CAT_FOLDER_NO_KEY_SELECTED_FILE_1   = "https://mega.nz/folder/e1ogxQ7T#/file/P8BBzaTS"; // [3]
export const CAT_FOLDER_NO_KEY_SELECTED_FILE_2   = "https://mega.nz/folder/e1ogxQ7T/file/P8BBzaTS";  // [4]

export const CAT_FOLDER_NO_KEY_SELECTED_FOLDER_1 = "https://mega.nz/folder/e1ogxQ7T#/folder/CghQlTCa";
export const CAT_FOLDER_NO_KEY_SELECTED_FOLDER_2 = "https://mega.nz/folder/e1ogxQ7T/folder/CghQlTCa";


/** ---------------------------------------------------------------
 * RELATIVE URLs (some examples)
 * ----------------------------------------------------------------
 * The RegExp checks not full URL, but only the signature.
 * @see Mega.parseUrl
 */

export const CAT_FILE_IMAGE_OLD_RELATIVE_1 = "/#!bkwkHC7D!AWJuto8_fhleAI2WG0RvACtKkL_s9tAtvBXXDUp2bQk";
export const CAT_FILE_IMAGE_OLD_RELATIVE_2 = "#!bkwkHC7D!AWJuto8_fhleAI2WG0RvACtKkL_s9tAtvBXXDUp2bQk";
export const CAT_FOLDER_OLD_RELATIVE_1     = "/#F!e1ogxQ7T!ee4Q_ocD1bSLmNeg9B6kBw";
export const CAT_FOLDER_OLD_RELATIVE_2     = "#F!e1ogxQ7T!ee4Q_ocD1bSLmNeg9B6kBw";

export const CAT_FILE_IMAGE_RELATIVE_1     = "/file/bkwkHC7D#AWJuto8_fhleAI2WG0RvACtKkL_s9tAtvBXXDUp2bQk";
export const CAT_FILE_IMAGE_RELATIVE_2     = "file/bkwkHC7D#AWJuto8_fhleAI2WG0RvACtKkL_s9tAtvBXXDUp2bQk";
export const CAT_FOLDER_RELATIVE_1         = "/folder/e1ogxQ7T#ee4Q_ocD1bSLmNeg9B6kBw";
export const CAT_FOLDER_RELATIVE_2         = "folder/e1ogxQ7T#ee4Q_ocD1bSLmNeg9B6kBw";



/** ---------------------------------------------------------------
 * OTHER URLs
 * ---------------------------------------------------------------- */

export const CAT_FILE_IMAGE_ANCIENT = "https://mega.co.nz/#!bkwkHC7D!AWJuto8_fhleAI2WG0RvACtKkL_s9tAtvBXXDUp2bQk"; // ".co"
// Note: "https://mega.co.nz/file/bkwkHC7D#AWJuto8_fhleAI2WG0RvACtKkL_s9tAtvBXXDUp2bQk"
// (".co" + the new format) is no valid for Mega.

export const CAT_FILE_IMAGE_NO_KEY_EMBEDDED = "https://web.archive.org/web/20200407132523/https://mega.nz/file/bkwkHC7D";
// Note: web.archive.org can't properly save Mega's pages