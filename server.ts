import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import https from "https";
import { WebSocketServer, WebSocket } from "ws";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("[SERVER] Starting server initialization...");
console.log(`[SERVER] Time: ${new Date().toISOString()}`);
console.log(`[SERVER] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[SERVER] CWD: ${process.cwd()}`);

// SQLite Database Setup
let sqlite;
try {
  const Database = (await import("better-sqlite3")).default;
  const dbPath = path.join(process.cwd(), "chat.db");
  sqlite = new Database(dbPath);
  
  // Create messages table if it doesn't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      user TEXT NOT NULL,
      text TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      color TEXT NOT NULL
    )
  `);
  console.log("SQLite database initialized successfully.");
} catch (err) {
  console.error("SQLite initialization error:", err);
  // Fallback to in-memory if file fails
  try {
    const Database = (await import("better-sqlite3")).default;
    sqlite = new Database(":memory:");
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        user TEXT NOT NULL,
        text TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        color TEXT NOT NULL
      )
    `);
    console.log("SQLite initialized in-memory due to error.");
  } catch (fallbackErr) {
    console.error("Failed to initialize even in-memory SQLite:", fallbackErr);
    // Create a dummy sqlite object to prevent crashes
    sqlite = {
      prepare: () => ({ all: () => [], run: () => {} }),
      exec: () => {}
    };
  }
}

const MAX_HISTORY = 100;
const messageHistory = sqlite.prepare("SELECT * FROM messages ORDER BY timestamp DESC LIMIT ?")
  .all(MAX_HISTORY)
  .reverse();

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  // Ping route for testing
  app.get("/ping", (req, res) => {
    res.send("pong");
  });

  app.get("/test", (req, res) => {
    res.sendFile(path.join(process.cwd(), "test.html"));
  });

  // Request Logging Middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // WebSocket Server
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("New chat client connected");

    // Send history to new client
    ws.send(JSON.stringify({ type: "history", messages: messageHistory }));

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === "chat") {
          const newMessage = {
            id: Math.random().toString(36).substring(2, 11),
            user: message.user || "Anônimo",
            text: message.text,
            timestamp: Date.now(),
            color: message.color || "#10b981"
          };

          // Save to SQLite
          const insert = sqlite.prepare("INSERT INTO messages (id, user, text, timestamp, color) VALUES (?, ?, ?, ?, ?)");
          insert.run(newMessage.id, newMessage.user, newMessage.text, newMessage.timestamp, newMessage.color);

          // Update in-memory history
          messageHistory.push(newMessage);
          if (messageHistory.length > MAX_HISTORY) {
            messageHistory.shift();
            // Optional: Cleanup old messages from DB to keep it small
            // sqlite.prepare("DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY timestamp DESC LIMIT ?)").run(MAX_HISTORY);
          }

          // Broadcast to all clients
          const broadcastData = JSON.stringify({ type: "chat", message: newMessage });
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcastData);
            }
          });
        }
      } catch (err) {
        console.error("WS message error:", err);
      }
    });
  });

  // Helper to fetch radio stats from Shoutcast JSON endpoint
  async function getRadioStats() {
    const statsUrl = process.env.RADIO_CURRENT_SONG_URL || process.env.RADIO_STATS_URL || `http://stm1.voxpainel.com.br:7076/stats?sid=1&json=1`;
    const radioName = process.env.VITE_RADIO_NAME || "Shekinah Fm";
    
    try {
      const response = await fetch(statsUrl, { 
        signal: AbortSignal.timeout(5000),
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (response.ok) {
        const text = await response.text();
        let song = radioName;
        let listeners = 0;
        
        try {
          const data = JSON.parse(text);
          // Prioritize songtitle as requested by the user
          song = data.songtitle || data.title || radioName;
          
          const listenersCount = data.currentlisteners !== undefined 
            ? data.currentlisteners 
            : (data.uniquelisteners || "0");
          listeners = parseInt(String(listenersCount), 10) || 0;
        } catch (e) {
          // If it's not JSON, it might be a plain text response (like /currentsong?sid=1)
          if (text && text.trim().length > 0) {
            song = text.trim();
          }
        }

        return { song, listeners };
      }
      
      return { song: radioName, listeners: 0 };
    } catch (err) {
      console.error("Stats fetch error:", err);
      return { song: radioName, listeners: 0 };
    }
  }

  // Health check and Debug Status
  app.get("/api/health", (req, res) => {
    const distPath = path.resolve(__dirname, 'dist');
    const distExists = fs.existsSync(distPath);
    const indexExists = fs.existsSync(path.join(distPath, 'index.html'));
    res.json({ 
      status: "ok", 
      mode: process.env.NODE_ENV, 
      distExists,
      indexExists,
      cwd: process.cwd(),
      time: new Date().toISOString()
    });
  });

  // API Route to fetch the current song and listeners
  app.get("/api/current-song", async (req, res) => {
    const stats = await getRadioStats();
    res.json({
      ...stats,
      currentlisteners: stats.listeners
    });
  });

  // API Route to proxy the radio logo
  app.get("/api/logo", (req, res) => {
    const logoUrl = process.env.VITE_RADIO_LOGO_URL || "https://i1.sndcdn.com/avatars-000304126092-ysdpwc-t240x240.jpg";
    
    const proxyLogo = (url, redirectCount = 0) => {
      if (redirectCount > 5) {
        res.status(500).send("Too many redirects");
        return;
      }

      const protocol = url.startsWith('https') ? https : http;
      const proxyReq = protocol.get(url, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': 'https://soundcloud.com/' // For soundcloud logos
        }
      }, (proxyRes) => {
        // Handle redirects
        if (proxyRes.statusCode && proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
          let nextUrl = proxyRes.headers.location;
          if (!nextUrl.startsWith('http')) {
            const parsedUrl = new URL(url);
            nextUrl = `${parsedUrl.protocol}//${parsedUrl.host}${nextUrl}`;
          }
          proxyLogo(nextUrl, redirectCount + 1);
          return;
        }

        res.setHeader("Content-Type", proxyRes.headers["content-type"] || "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=3600");
        proxyRes.pipe(res);
      });

      proxyReq.on("error", (err) => {
        console.error("Logo proxy error:", err);
        if (!res.headersSent) {
          res.status(500).send("Logo error");
        }
      });
    };

    proxyLogo(logoUrl);
  });

  // Dedicated API Route for current listeners only
  app.get("/api/listeners", async (req, res) => {
    const stats = await getRadioStats();
    res.json({ currentlisteners: stats.listeners });
  });

  // Proxy for the audio stream to bypass Mixed Content (HTTP on HTTPS site)
  app.get("/api/stream", (req, res) => {
    let streamUrl = process.env.VITE_RADIO_STREAM_URL || "http://stm6.voxhd.com.br:6780/;";
    
    // Shoutcast often needs the /; suffix to return the audio stream directly
    if (!streamUrl.endsWith(';') && !streamUrl.includes('?')) {
      streamUrl = streamUrl.endsWith('/') ? `${streamUrl};` : `${streamUrl}/;`;
    }

    const proxyStream = (url, redirectCount = 0) => {
      if (redirectCount > 5) {
        res.status(500).send("Too many redirects");
        return;
      }

      console.log(`Proxying stream from: ${url} (attempt ${redirectCount + 1})`);
      const protocol = url.startsWith('https') ? https : http;
      
      const requestOptions = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
          'Accept': 'audio/mpeg, audio/*, */*',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Icy-MetaData': '0',
          'Connection': 'close',
          'Referer': 'http://stm6.voxhd.com.br:6780/' // Some servers check referer
        },
        timeout: 30000
      };

      const proxyReq = protocol.get(url, requestOptions, (proxyRes) => {
        // Handle redirects internally
        if (proxyRes.statusCode && proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
          let nextUrl = proxyRes.headers.location;
          if (!nextUrl.startsWith('http')) {
            const parsedUrl = new URL(url);
            nextUrl = `${parsedUrl.protocol}//${parsedUrl.host}${nextUrl}`;
          }
          console.log(`Following redirect to: ${nextUrl}`);
          proxyStream(nextUrl, redirectCount + 1);
          return;
        }

        if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
          console.error(`Stream server returned error ${proxyRes.statusCode} for ${url}`);
          if (!res.headersSent) {
            res.status(proxyRes.statusCode).send(`Stream server error: ${proxyRes.statusCode}`);
          }
          return;
        }

        // Transfer relevant headers
        const contentType = proxyRes.headers["content-type"] || "audio/mpeg";
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.setHeader("Connection", "keep-alive");
        
        Object.keys(proxyRes.headers).forEach(key => {
          if (key.startsWith('icy-') && key !== 'icy-metaint') {
            res.setHeader(key, proxyRes.headers[key]);
          }
        });
        
        proxyRes.pipe(res);

        // Handle client disconnect during stream
        req.on("close", () => {
          proxyRes.destroy();
          proxyReq.destroy();
        });
      });

      proxyReq.on("error", (err) => {
        console.error("Stream proxy request error:", err);
        if (!res.headersSent) {
          res.status(500).send("Stream connection error");
        }
      });
    };

    proxyStream(streamUrl);
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    console.log(`[SERVER] Production mode: Serving static files from ${distPath}`);
    
    // Serve static files with cache control
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));
    
    // Catch-all for SPA routing
    app.get('*', (req, res) => {
      // If it's an asset request that wasn't found by express.static, return 404
      if (req.path.startsWith('/assets/') || req.path.includes('.')) {
        res.status(404).send('Asset not found');
        return;
      }
      
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.sendFile(indexPath);
      } else {
        res.status(404).send('index.html not found in dist');
      }
    });
  } else {
    console.log("[SERVER] Development mode: Using Vite middleware");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Only keep /status in development
    app.get("/status", (req, res) => {
      const distPath = path.resolve(__dirname, 'dist');
      const indexExists = fs.existsSync(path.join(distPath, 'index.html'));
      res.send(`
        <div style="background: #09090b; color: white; font-family: sans-serif; padding: 40px; min-height: 100vh;">
          <h1 style="color: #D4AF37;">Servidor Shekinah FM Ativo</h1>
          <p><strong>Modo:</strong> ${process.env.NODE_ENV}</p>
          <p><strong>Hora:</strong> ${new Date().toISOString()}</p>
          <p><strong>Pasta Dist:</strong> ${fs.existsSync(distPath) ? 'Presente' : 'Ausente'}</p>
          <p><strong>Index.html:</strong> ${indexExists ? 'Presente' : 'Ausente'}</p>
          <hr style="border: 0; border-top: 1px solid #18181b; margin: 20px 0;"/>
          <p><a href="/" style="color: #D4AF37; text-decoration: none; font-weight: bold;">&larr; Voltar para o Aplicativo</a></p>
        </div>
      `);
    });

    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
