# meganz-api

**Uncomplited**, backlogged Mega.nz JS library.

- `npm ci`
- `npm run build`

To open a web demo run a http server in the root folder, then open a html file from `_examples-browser` directory.

Or try to use a Node.js demo from `_examples-node` directory. (Note: remove `import * as URLS from "./test-urls-private.js";` first and use your own Mega URL.)

---

### The example usage

Downloading of thumbnails:

https://github.com/AlttiRi/meganz-api/blob/master/_examples-node/ex-3.3-ok.js:
```js
import {saveFile} from "./util-node.js";
import {Nodes} from "../src/mega.js";

const folderNodes = await Nodes.nodes("https://mega.nz/..."); // Use your own URL

const promises = [];
let index = 0;
for (const node of folderNodes) {
    if (Nodes.isMediaNode(node)) {
        const index = ++i;
        console.log(`${index} ${node.name}`);
        const filename = `thumbnail-${index.toString().padStart(3, "0")}-${node.id}.jpg`;
        const downloaded = node.getThumbnail()
            .then(thumb => {
                saveFile(thumb, filename, node.mtime);
            });
        promises.push(downloaded);
    }
}
await Promise.all(promises);

```

- Multiple API requests are grouped within one API request when it's possible.
- Multiple thumbnails data are downloaded within one download request when it's possible.
- All similar HTTP connections are performed concurrently, but not more that 16 at one moment. See `Semaphore` class.
- Also it uses custom (much faster (up to x9 times)) convertation from `ArrayBuffer` to `WordArray` of CryptoJS library. See `/src/crypto.js`.

---

- 2022.02.20: This private repo was turned into public one.
