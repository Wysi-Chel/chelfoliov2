import { writeFile } from "node:fs/promises";

const endpoint = "http://127.0.0.1:9334";
const pages = await fetch(endpoint + "/json/list").then((response) => response.json());
const page = pages.find((item) => item.type === "page");
if (!page) throw new Error("No Chrome page target found");

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

function send(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const response = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value;
}

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: "http://localhost/chelfoliov2/index.html" });
await new Promise((resolve) => setTimeout(resolve, 700));

const sourceRoot = "http://localhost/chelfoliov2/.source-chelfolio/public/images";
const media = [
  ["galleryvv2", `${sourceRoot}/projects/project-01/galleryvv2.mp4`, "video"],
  ["mp3_player", `${sourceRoot}/projects/project-01/mp3_player.MP4`, "video"],
  ["ppe_lapsing", `${sourceRoot}/projects/project-01/ppe_lapsing.mp4`, "video"],
  ["system_monitoring", `${sourceRoot}/projects/project-01/system_monitoring.mp4`, "video"],
  ["expense_tracker", `${sourceRoot}/projects/project-01/salary-tracker.mp4`, "video"],
  ["tefolio", `${sourceRoot}/projects/project-01/video-01.mp4`, "video"],
  ["car-rental", `${sourceRoot}/projects/project-01/car-rental.mp4`, "video"],
  ["mock", `${sourceRoot}/gallery/mock.png`, "image"],
  ["retouch", `${sourceRoot}/gallery/retouch-1.jpg`, "image"]
];

const output = [];
for (const [name, url, type] of media) {
  const result = await evaluate(`(async () => {
    const url = ${JSON.stringify(url)};
    const type = ${JSON.stringify(type)};
    let source;
    let sourceWidth;
    let sourceHeight;
    let duration = 0;
    let sampleTime = 0;

    if (type === 'video') {
      source = document.createElement('video');
      source.muted = true;
      source.playsInline = true;
      source.preload = 'auto';
      source.src = url;
      await new Promise((resolve, reject) => {
        source.addEventListener('loadedmetadata', resolve, { once: true });
        source.addEventListener('error', () => reject(new Error('Video load failed: ' + url)), { once: true });
      });
      duration = source.duration;
      sampleTime = Math.min(Math.max(duration * 0.28, 0.2), Math.max(duration - 0.15, 0.2));
      source.currentTime = sampleTime;
      await new Promise((resolve, reject) => {
        source.addEventListener('seeked', resolve, { once: true });
        source.addEventListener('error', () => reject(new Error('Video seek failed: ' + url)), { once: true });
      });
      sourceWidth = source.videoWidth;
      sourceHeight = source.videoHeight;
    } else {
      source = new Image();
      source.src = url;
      await source.decode();
      sourceWidth = source.naturalWidth;
      sourceHeight = source.naturalHeight;
    }

    const scale = Math.min(1, 1600 / sourceWidth, 1000 / sourceHeight);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#050914';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/webp', 0.84);
    source.removeAttribute('src');
    if (source.load) source.load();
    return {
      dataUrl,
      width: canvas.width,
      height: canvas.height,
      duration,
      sampleTime
    };
  })()`);

  const base64 = result.dataUrl.split(",")[1];
  const path = `assets/live/projects/${name}.webp`;
  await writeFile(path, Buffer.from(base64, "base64"));
  output.push({ name, path, width: result.width, height: result.height, duration: result.duration, sampleTime: result.sampleTime });
}

console.log(JSON.stringify(output, null, 2));
socket.close();
