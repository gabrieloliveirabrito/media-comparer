#!/usr/bin/env node
/**
 * Headless Chromium screenshots via CDP (no extra deps).
 * Usage: node scripts/capture-screenshots.mjs [baseUrl]
 */
import { spawn } from "node:child_process"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const outDir = path.join(root, "docs", "screenshots")
const samplesDir = "/tmp/media-comparer-samples"
const baseUrl = process.argv[2] || "http://127.0.0.1:5173/"
const debugPort = 9222

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

class Cdp {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    this.ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id != null && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        if (msg.error) reject(new Error(JSON.stringify(msg.error)))
        else resolve(msg.result)
      }
    })
  }
}

async function waitForJson(url, attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url)
      if (res.ok) return res.json()
    } catch {
      /* retry */
    }
    await sleep(250)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

async function main() {
  await mkdir(outDir, { recursive: true })

  const userDataDir = `/tmp/media-comparer-chromium-${process.pid}`
  const chrome = spawn(
    "chromium",
    [
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-dev-shm-usage",
      "--hide-scrollbars",
      "--window-size=1440,900",
      "about:blank",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  )

  try {
    const version = await waitForJson(`http://127.0.0.1:${debugPort}/json/version`)
    const ws = new WebSocket(version.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve)
      ws.addEventListener("error", reject)
    })
    const cdp = new Cdp(ws)

    const sendTop = (method, params = {}) => {
      const id = ++cdp.id
      return new Promise((resolve, reject) => {
        cdp.pending.set(id, { resolve, reject })
        ws.send(JSON.stringify({ id, method, params }))
      })
    }

    await sendTop("Target.setDiscoverTargets", { discover: true })
    const { targetId } = await sendTop("Target.createTarget", {
      url: "about:blank",
    })
    const { sessionId } = await sendTop("Target.attachToTarget", {
      targetId,
      flatten: true,
    })

    const session = {
      send(method, params = {}) {
        const id = ++cdp.id
        return new Promise((resolve, reject) => {
          cdp.pending.set(id, { resolve, reject })
          ws.send(JSON.stringify({ id, method, params, sessionId }))
        })
      },
    }

    await session.send("Page.enable")
    await session.send("Runtime.enable")
    await session.send("DOM.enable")
    await session.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    })

    async function navigate(url) {
      await session.send("Page.navigate", { url })
      // Wait for React root content
      for (let i = 0; i < 60; i++) {
        const { result } = await session.send("Runtime.evaluate", {
          expression: `Boolean(document.querySelector("#media-dropzone") || document.querySelector("#app-tour"))`,
          returnByValue: true,
        })
        if (result?.value) break
        await sleep(200)
      }
      await sleep(400)
    }

    async function screenshot(name) {
      const { data } = await session.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
      })
      const file = path.join(outDir, name)
      await writeFile(file, Buffer.from(data, "base64"))
      console.log("wrote", file)
    }

    async function evaluate(expression) {
      const { result, exceptionDetails } = await session.send(
        "Runtime.evaluate",
        { expression, returnByValue: true, awaitPromise: true },
      )
      if (exceptionDetails) {
        throw new Error(exceptionDetails.text || "evaluate failed")
      }
      return result?.value
    }

    async function waitForSelector(selector, attempts = 50) {
      for (let i = 0; i < attempts; i++) {
        const found = await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)
        if (found) return
        await sleep(200)
      }
      throw new Error(`Selector not found: ${selector}`)
    }

    // Seed tour + light theme before first paint of screenshots
    await navigate(baseUrl)
    await evaluate(`localStorage.setItem("media-comparer:tour-done", "1")`)
    await evaluate(`localStorage.setItem("media-comparer:theme", "light")`)
    await navigate(baseUrl)
    await waitForSelector("#media-file-input")
    await sleep(500)
    await screenshot("01-workspace.png")

    // Resolve file input via backendNodeId (more reliable than nodeId after soft nav)
    const backendNodeId = await evaluate(`(() => {
      const el = document.querySelector("#media-file-input");
      return el ? 1 : 0;
    })()`)
    if (!backendNodeId) throw new Error("#media-file-input missing")

    const { root: docRoot } = await session.send("DOM.getDocument", {
      depth: -1,
      pierce: true,
    })
    const { nodeId } = await session.send("DOM.querySelector", {
      nodeId: docRoot.nodeId,
      selector: "#media-file-input",
    })
    if (!nodeId) throw new Error("DOM.querySelector returned no nodeId")

    await session.send("DOM.setFileInputFiles", {
      nodeId,
      files: [
        path.join(samplesDir, "sample-a.png"),
        path.join(samplesDir, "sample-b.png"),
        path.join(samplesDir, "sample-c.png"),
      ],
    })

    for (let i = 0; i < 60; i++) {
      const count = await evaluate(
        `document.querySelectorAll('[id^="media-card-"]').length`,
      )
      const busy = await evaluate(
        `Boolean(document.querySelector("#compare-progress-dialog,[data-state=open]"))`,
      )
      if (count >= 3 && !busy) break
      await sleep(250)
    }
    await sleep(1000)
    await screenshot("02-compare-images.png")

    // Dark theme: persist + full reload, then re-upload (React state clears on reload)
    await evaluate(`(() => {
      localStorage.setItem("media-comparer:tour-done", "1");
      localStorage.setItem("media-comparer:theme", "dark");
    })()`)
    await navigate(baseUrl)
    await waitForSelector("#media-file-input")
    const darkOk = await evaluate(
      `document.documentElement.classList.contains("dark")`,
    )
    if (!darkOk) {
      await evaluate(`document.documentElement.classList.add("dark")`)
      await sleep(200)
    }

    {
      const { root: docRoot2 } = await session.send("DOM.getDocument", {
        depth: -1,
        pierce: true,
      })
      const { nodeId: nodeId2 } = await session.send("DOM.querySelector", {
        nodeId: docRoot2.nodeId,
        selector: "#media-file-input",
      })
      await session.send("DOM.setFileInputFiles", {
        nodeId: nodeId2,
        files: [
          path.join(samplesDir, "sample-a.png"),
          path.join(samplesDir, "sample-b.png"),
          path.join(samplesDir, "sample-c.png"),
        ],
      })
    }

    for (let i = 0; i < 60; i++) {
      const count = await evaluate(
        `document.querySelectorAll('[id^="media-card-"]').length`,
      )
      if (count >= 3) break
      await sleep(250)
    }
    await sleep(1000)
    const stillDark = await evaluate(
      `document.documentElement.classList.contains("dark")`,
    )
    console.log("dark class active:", stillDark)
    await screenshot("03-compare-dark.png")

    ws.close()
  } finally {
    chrome.kill("SIGTERM")
    await sleep(300)
    try {
      chrome.kill("SIGKILL")
    } catch {
      /* ignore */
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
