const btoa = str => Buffer.from(str, "binary").toString("base64");
const atob = b64 => Buffer.from(b64, "base64").toString("binary");

const performance = require('perf_hooks').performance; // for `performance.now()`

const fetch = require("node-fetch").default;

module.exports = {btoa, atob, fetch, performance};