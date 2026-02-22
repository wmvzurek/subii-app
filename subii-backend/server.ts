/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { startCronJobs } = require("./src/lib/cron");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  startCronJobs();

  createServer((req: import("http").IncomingMessage, res: import("http").ServerResponse) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  }).listen(3000, () => {
    console.log("🚀 Server uruchomiony na http://localhost:3000");
    console.log("⏰ Cron jobs aktywne");
  });
});