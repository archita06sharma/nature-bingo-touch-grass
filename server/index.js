const express = require('express');
const cors = require('cors');
const { generateChallenges, DEFAULT_HOST, DEFAULT_MODEL } = require('./ollamaService');
const { FALLBACK_TASKS } = require('./fallbackTasks');
const { validateTaskSet } = require('./schema');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Diagnostics / Health Endpoint
app.get('/api/health', async (req, res) => {
  let ollamaAvailable = false;
  let detectedModels = [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const ollamaRes = await fetch(`${DEFAULT_HOST}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);

    if (ollamaRes.ok) {
      const data = await ollamaRes.json();
      ollamaAvailable = true;
      detectedModels = (data.models || []).map((m) => m.name);
    }
  } catch (err) {
    ollamaAvailable = false;
  }

  const modelFound = detectedModels.some((name) => name.startsWith(DEFAULT_MODEL));

  res.json({
    status: 'ok',
    service: 'Nature Bingo — Touch Grass API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    ollama: {
      endpoint: DEFAULT_HOST,
      targetModel: DEFAULT_MODEL,
      available: ollamaAvailable,
      modelReady: modelFound,
      detectedModels
    }
  });
});

// Challenge Generation Endpoint (Ollama AI + Fallback on Failure)
app.post('/api/challenges/generate', async (req, res, next) => {
  try {
    const { forceFallback, timeoutMs } = req.body || {};
    const result = await generateChallenges({
      forceFallback,
      timeoutMs: timeoutMs ? parseInt(timeoutMs, 10) : undefined
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Direct Fallback Challenge Endpoint
app.get('/api/challenges/fallback', (req, res) => {
  res.json({
    source: 'fallback',
    model: 'curated-field-guide',
    timestamp: new Date().toISOString(),
    count: FALLBACK_TASKS.length,
    tasks: FALLBACK_TASKS
  });
});

// Root information endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Nature Bingo API',
    description: 'Backend service for Nature Bingo — Touch Grass',
    endpoints: {
      health: 'GET /api/health',
      generate: 'POST /api/challenges/generate',
      fallback: 'GET /api/challenges/fallback'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[API Error]:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`[Nature Bingo Server] running at http://localhost:${PORT}`);
});

// Handle graceful shutdown
const shutdown = () => {
  console.log('\n[Nature Bingo Server] shutting down...');
  server.close(() => {
    console.log('[Nature Bingo Server] closed.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = { app, server };
