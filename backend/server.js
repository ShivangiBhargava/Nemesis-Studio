import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { AgentOrchestrator } from './services/agentOrchestrator.js';
import { NebiusClient, NEBIUS_MODELS } from './services/nebiusClient.js';
import { TavilyClient } from './services/tavilyClient.js';
import { SandboxRunner } from './services/sandboxRunner.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve frontend static assets
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'Nemesis Studio',
    engine: 'NVIDIA Nemotron Multi-Agent State Machine',
    nebiusConfigured: Boolean(process.env.NEBIUS_API_KEY),
    tavilyConfigured: Boolean(process.env.TAVILY_API_KEY),
    models: NEBIUS_MODELS
  });
});

// SSE Streaming Orchestrator
app.post('/api/orchestrate', async (req, res) => {
  const { prompt, preset = 'custom', injectBug = true, nebiusApiKey, tavilyApiKey } = req.body;

  if (!prompt && !preset) {
    return res.status(400).json({ error: 'Prompt or preset required' });
  }

  // Setup Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const emit = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const orchestrator = new AgentOrchestrator({
      nebiusApiKey: nebiusApiKey || process.env.NEBIUS_API_KEY,
      tavilyApiKey: tavilyApiKey || process.env.TAVILY_API_KEY
    });

    await orchestrator.runPipeline({
      prompt: prompt || 'Build high-performance microservice with Nebius Token Factory and rate limiting',
      preset,
      injectBug,
      emit
    });

    emit('done', { status: 'complete' });
  } catch (err) {
    console.error('Pipeline Error:', err);
    emit('pipeline_error', { error: err.message });
  } finally {
    res.end();
  }
});

// Direct Nebius Chat Completion Proxy
app.post('/api/nebius/chat', async (req, res) => {
  const { messages, model, temperature, nebiusApiKey } = req.body;
  const client = new NebiusClient(nebiusApiKey || process.env.NEBIUS_API_KEY);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    await client.streamChat({
      messages: messages || [{ role: 'user', content: 'Hello Nemotron!' }],
      model: model || NEBIUS_MODELS.NEMOTRON_70B,
      temperature: temperature || 0.2,
      onChunk: (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    });
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Direct Tavily Search Proxy
app.post('/api/tavily/search', async (req, res) => {
  const { query, searchDepth, tavilyApiKey } = req.body;
  const client = new TavilyClient(tavilyApiKey || process.env.TAVILY_API_KEY);

  try {
    const results = await client.search({
      query: query || 'NVIDIA Nemotron 70B Nebius Token Factory',
      searchDepth: searchDepth || 'advanced'
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Direct Sandbox Code Execution
app.post('/api/sandbox/execute', async (req, res) => {
  const { language, files, entryPoint, mode } = req.body;
  const runner = new SandboxRunner();

  try {
    const result = await runner.execute({
      language: language || 'python',
      files: files || {},
      entryPoint: entryPoint || 'main.py',
      mode: mode || 'virtual'
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback to index.html for single-page app
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 NEMESIS AGENT STUDIO ACTIVE`);
  console.log(`⚡ Powered by NVIDIA Nemotron & Nebius Token Factory`);
  console.log(`🌐 Live at: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
