/**
 * Frontend API client
 * Manages streaming connection with backend orchestrator, sandbox execution, and credential storage
 */

export class ApiClient {
  constructor() {
    this.baseUrl = '';
  }

  getCredentials() {
    return {
      nebiusApiKey: localStorage.getItem('nemesis_nebius_key') || '',
      tavilyApiKey: localStorage.getItem('nemesis_tavily_key') || '',
      modelFlavor: localStorage.getItem('nemesis_model_flavor') || 'nvidia/Llama-3.1-Nemotron-70B-Instruct'
    };
  }

  saveCredentials({ nebiusApiKey, tavilyApiKey, modelFlavor }) {
    if (nebiusApiKey !== undefined) localStorage.setItem('nemesis_nebius_key', nebiusApiKey);
    if (tavilyApiKey !== undefined) localStorage.setItem('nemesis_tavily_key', tavilyApiKey);
    if (modelFlavor !== undefined) localStorage.setItem('nemesis_model_flavor', modelFlavor);
  }

  /**
   * Run pipeline via Server-Sent Events (SSE) stream
   */
  async runPipeline({ prompt, preset, injectBug, onEvent, onError, onComplete }) {
    const creds = this.getCredentials();

    try {
      const response = await fetch(`${this.baseUrl}/api/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          preset,
          injectBug,
          nebiusApiKey: creds.nebiusApiKey,
          tavilyApiKey: creds.tavilyApiKey,
          model: creds.modelFlavor
        })
      });

      if (!response.ok) {
        throw new Error(`Orchestration failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop(); // keep last incomplete chunk

        for (const part of parts) {
          if (!part.trim()) continue;
          const lines = part.split('\n');
          let eventType = 'message';
          let eventData = null;

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              try {
                eventData = JSON.parse(line.slice(6).trim());
              } catch (e) {
                eventData = line.slice(6);
              }
            }
          }

          if (eventData) {
            onEvent(eventType, eventData);
          }
        }
      }

      onComplete();
    } catch (err) {
      console.error('[ApiClient] Pipeline Error:', err);
      onError(err);
    }
  }

  /**
   * Run manual sandbox execution
   */
  async executeSandbox({ files, entryPoint = 'main.py' }) {
    const response = await fetch(`${this.baseUrl}/api/sandbox/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'python',
        files,
        entryPoint,
        mode: 'virtual'
      })
    });
    return response.json();
  }
}

export const api = new ApiClient();
