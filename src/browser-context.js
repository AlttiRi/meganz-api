const btoa = str => Buffer.from(str, "binary").toString("base64");
const atob = b64 => Buffer.from(b64, "base64").toString("binary");

const fetch = require("node-fetch").default;

module.exports = { btoa, atob, fetch };