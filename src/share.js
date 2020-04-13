class Share {
    /** @type {string} */
    id;
    /** @type {string} */
    decryptionKeyStr;
    /** @type {boolean} */
    isFolder;
    /** @type {string} */
    selectedFolderId;
    /** @type {string} */
    selectedFileId;

    /**
     * @private
     * @param {{
     *    id: string,
     *    decryptionKeyStr?: string,
     *    isFolder?: boolean,
     *    selectedFolderId?: string,
     *    selectedFileId?: string
     *  }} shareParts
     */
    constructor(shareParts) {
        Object.assign(this, shareParts);
    }

    /** @return {string} */
    toString() {
        return "" +
            "[id]               " + this.id               + "\n" +
            "[decryptionKeyStr] " + this.decryptionKeyStr + "\n" +
            "[isFolder]         " + this.isFolder         + "\n" +
            "[selectedFolderId] " + this.selectedFolderId + "\n" +
            "[selectedFileId]   " + this.selectedFileId   + "\n" +
            "[url]              " + this.getUrl()         + "\n" +
            "[url-legacy]       " + this.getUrl(true);
    }

    /**
     * @param {string|URL} url - URL
     * @return {boolean}
     */
    static isFolder(url) {
        return Share.fromUrl(url).isFolder;
    }

    /** @return {string} */
    get selectedId() {
        return this.selectedFileId || this.selectedFolderId || null;
    }

    /**
     * @see URLS
     * @param {string|URL} url - URL
     * @returns {Share}
     */
    static fromUrl(url) {
        const _url = url.toString(); // if passed a URL object
        const isLegacyURL = /#F!|#!/;
        let regExp;

        if (_url.match(isLegacyURL)) {
            regExp = /(?<type>(?<isFolder>#F!)|(?<isFile>#!))(?<id>[\w-_]+)(?<keyPrefix>!(?=[\w-_]{22,43})|!(?=[!?])|!(?![\w-_]{8}))?(?<key>(?<=!)[\w-_]{22,43})?(?<selected>((?<selectedFilePrefix>\?)|(?<selectedFolderPrefix>!?))((?<file>(?<=\?)[\w-_]+)|(?<folder>(?<=!)[\w-_]+)))?/;
        } else {
            regExp = /(?<type>(?<isFolder>folder\/)|(?<isFile>file\/))(?<id>[\w-_]+)(?<keyPrefix>#)?(?<key>(?<=#)[\w-_]{22,43})?(?<selected>((?<selectedFilePrefix>\/file\/)|(?<selectedFolderPrefix>\/folder\/))((?<file>(?<=\/file\/)[\w-_]+)|(?<folder>(?<=\/folder\/)[\w-_]+)))?/;
        }

        const groups = _url.match(regExp).groups;

        const isFolder = Boolean(groups.isFolder);
        /** Content ID */
        const id = groups.id;
        /** Decryption key encoded with Mega's base64 */
        const decryptionKeyStr = groups.key    || "";
        const selectedFolderId = groups.folder || "";
        const selectedFileId   = groups.file   || "";

        return new Share({id, decryptionKeyStr, isFolder, selectedFolderId, selectedFileId});
    }

    /**
     * @param shareParts
     * @param {string}   shareParts.id
     * @param {string}  [shareParts.decryptionKeyStr=""]
     * @param {boolean} [shareParts.isFolder=false]
     * @param {string}  [shareParts.selectedFolderId=""]
     * @param {string}  [shareParts.selectedFileId=""]
     * @return {Share}
     */
    static fromParts({id, decryptionKeyStr = "", isFolder = false, selectedFolderId = "", selectedFileId = ""}) {
        return new Share({id, decryptionKeyStr, isFolder, selectedFolderId, selectedFileId});
    }

    /**
     * Returns the url string for a share.
     * I prefer to use the key separator when there is no key, but there is a selected node.
     * Note: `Share.fromUrl(url).getUrl()` may not be equal to `url` (even for the same format)
     *
     * @see URLS
     * @param {boolean} oldFormat
     * @returns {string}
     */
    getUrl(oldFormat = false) {
        let result;
        const prefixes = {
            folder:    oldFormat ? "#F" : "folder",
            file:      oldFormat ? "#"  : "file",
            id:        oldFormat ? "!"  : "/",
            key:       oldFormat ? "!"  : "#",
            selFile:   oldFormat ? "?"  : "/file/",
            selFolder: oldFormat ? "!"  : "/folder/",
        };

        let selected = "";
        if (this.selectedFileId) {
            selected = prefixes.selFile + this.selectedFileId;
        } else if (this.selectedFolderId) {
            selected = prefixes.selFolder + this.selectedFolderId;
        }

        result = "https://mega.nz/" +
            (this.isFolder ? prefixes.folder : prefixes.file) +
            prefixes.id + this.id +
            (this.decryptionKeyStr ? prefixes.key + this.decryptionKeyStr : "") +
            (selected && !this.decryptionKeyStr ? prefixes.key + selected : selected);

        return result;
    }
}

module.exports = Share;