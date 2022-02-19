# meganz-api

Uncomplited, backlogged Mega.nz JS library.

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
import {progress} from "./progress.js";

const folderNodes = await Nodes.nodes("URL");

const promises = [];
let i = 0;
for (const node of folderNodes) {
    if (Nodes.isMediaNode(node)) {
        const index = ++i;
        console.log(`${index} ${node.name}`);
        const handled = node.getThumbnail()
            .then(thumb => {
                saveFile(thumb, `thumbnail-${index.toString().padStart(3, "0")}-${node.id}.jpg`, node.mtime);
            });
        promises.push(handled);
    }
}
await Promise.all(promises);

```

- API requests are grouped when it's possible.
- Multiple thumbnails data are downloaded within one download request when it's possible.
- All similar HTTP connections are performed concurrently, but not more that 16 at one moment. See `Semaphore` class.
