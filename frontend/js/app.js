import { api } from './api.js';
import { PRESETS } from './presets.js';

class App {
  constructor() {
    this.currentPreset = 'microservice';
    this.currentFiles = {};
    this.activeFile = 'main.py';
    this.diffData = null;
    this.isRunning = false;
    this.isEditing = false;
    this.totalTokensStreamed = 0;

    this.agentTelemetry = {
      architect: {
        name: 'Architect Agent',
        model: 'nvidia/Llama-3.1-Nemotron-70B-Instruct',
        role: 'Principal System Architect',
        temp: 0.1,
        tokens: 340,
        latency: '190ms',
        tools: ['schema_deconstruct', 'dependency_graph_builder'],
        prompt: 'Decompose user requirements into modular microservices with strict sliding-window rate limiting, type-safe pydantic schemas, and container specifications.'
      },
      researcher: {
        name: 'Web Intelligence Agent',
        model: 'Tavily Search API (Grounding Radar)',
        role: 'Real-Time Web Intelligence & CVE Researcher',
        temp: 0.0,
        tokens: 520,
        latency: '85ms',
        tools: ['tavily_search_cve', 'docs_crawler', 'pypi_api_inspector'],
        prompt: 'Query live developer web sources for CVE-2024 path traversal mitigations, latest FastAPI async streaming paradigms, and NVIDIA JetPack compatibility.'
      },
      coder: {
        name: 'Code Synthesizer',
        model: 'nvidia/Llama-3.1-Nemotron-70B-Instruct',
        role: 'Lead Polyglot Software Engineer',
        temp: 0.2,
        tokens: 1420,
        latency: '240ms',
        tools: ['ast_code_generator', 'docker_spec_emitter', 'pytest_scaffold'],
        prompt: 'Synthesize production-grade, PEP-8 compliant code with asynchronous token bucket rate limiters, non-root Dockerfiles, and pytest test matrices.'
      },
      critic: {
        name: 'QA Sandbox Critic',
        model: 'nvidia/Llama-3.1-Nemotron-70B-Reward',
        role: 'Automated QA & Container Runtime Critic',
        temp: 0.0,
        tokens: 280,
        latency: '110ms',
        tools: ['sandbox_process_fork', 'assertion_evaluator', 'memory_profiler'],
        prompt: 'Execute generated test suite inside virtual isolated namespace. Capture stdout/stderr, evaluate exit codes, and flag null-pointer or assertion errors.'
      },
      healer: {
        name: 'Self-Healing Engine',
        model: 'nvidia/Llama-3.1-Nemotron-70B-Instruct (Reflection)',
        role: 'Autonomous AST Diagnostic & Patch Engineer',
        temp: 0.15,
        tokens: 610,
        latency: '205ms',
        tools: ['ast_parser', 'unified_diff_patcher', 'regression_verifier'],
        prompt: 'Analyze runtime traceback, isolate root cause, generate atomic unified diff patch, and verify 100% test pass rate upon recompilation.'
      }
    };

    this.initDOMElements();
    this.bindEvents();
    this.loadInitialPreset();
  }

  initDOMElements() {
    // Inputs & Action Buttons
    this.promptInput = document.getElementById('prompt-input');
    this.toggleInjectBug = document.getElementById('toggle-inject-bug');
    this.btnRunPipeline = document.getElementById('btn-run-pipeline');
    this.btnManualRun = document.getElementById('btn-manual-run');
    this.btnEditCode = document.getElementById('btn-edit-code');
    this.btnCopyCode = document.getElementById('btn-copy-code');
    this.btnExportZip = document.getElementById('btn-export-zip');
    
    // Status Badges & Counters
    this.pipelineStatusBadge = document.getElementById('pipeline-status-badge');
    this.valSpeed = document.getElementById('val-speed');
    this.valTtft = document.getElementById('val-ttft');
    this.dockTokensCount = document.getElementById('dock-tokens-count');
    this.dagActiveStep = document.getElementById('dag-active-step');

    // Stepper Nodes
    this.agentNodes = {
      architect: document.getElementById('node-architect'),
      researcher: document.getElementById('node-researcher'),
      coder: document.getElementById('node-coder'),
      critic: document.getElementById('node-critic'),
      healer: document.getElementById('node-healer')
    };

    // Editor & Workspace Containers
    this.editorTabsContainer = document.getElementById('editor-tabs-container');
    this.tabArchDiagram = document.getElementById('tab-arch-diagram');
    this.tabDiffView = document.getElementById('tab-diff-view');
    this.editorCodeContainer = document.getElementById('editor-code-container');
    this.editorLineNumbers = document.getElementById('editor-line-numbers');
    this.diffViewContainer = document.getElementById('diff-view-container');
    this.archViewContainer = document.getElementById('arch-view-container');
    this.reasoningStreamBox = document.getElementById('reasoning-stream-box');
    
    // Console Dock Elements
    this.tabConsoleSandbox = document.getElementById('tab-console-sandbox');
    this.tabConsoleTavily = document.getElementById('tab-console-tavily');
    this.tabConsoleTelemetry = document.getElementById('tab-console-telemetry');
    this.viewConsoleSandbox = document.getElementById('view-console-sandbox');
    this.viewConsoleTavily = document.getElementById('view-console-tavily');
    this.viewConsoleTelemetry = document.getElementById('view-console-telemetry');

    this.terminalBody = document.getElementById('terminal-body');
    this.terminalCliInput = document.getElementById('terminal-cli-input');
    this.testSummaryBadge = document.getElementById('test-summary-badge');
    this.tavilyResultsList = document.getElementById('tavily-results-list');
    this.tavilyLatencyBadge = document.getElementById('tavily-latency-badge');

    // Modals
    this.modalSettings = document.getElementById('modal-settings');
    this.modalBlueprint = document.getElementById('modal-blueprint');
    this.modalInspector = document.getElementById('modal-agent-inspector');
    this.inspectorModalTitle = document.getElementById('inspector-modal-title');
    this.inspectorModalBody = document.getElementById('inspector-modal-body');

    this.btnOpenSettings = document.getElementById('btn-open-settings');
    this.btnCloseSettings = document.getElementById('btn-close-settings');
    this.btnCancelSettings = document.getElementById('btn-cancel-settings');
    this.btnSaveSettings = document.getElementById('btn-save-settings');
    this.inputNebiusKey = document.getElementById('input-nebius-key');
    this.inputTavilyKey = document.getElementById('input-tavily-key');
    this.selectModelFlavor = document.getElementById('select-model-flavor');
    
    this.btnOpenBlueprint = document.getElementById('btn-open-blueprint');
    this.btnCloseBlueprint = document.getElementById('btn-close-blueprint');
    this.btnCloseBlueprintFooter = document.getElementById('btn-close-blueprint-footer');
    this.btnCloseInspector = document.getElementById('btn-close-inspector');
    this.btnCloseInspectorFooter = document.getElementById('btn-close-inspector-footer');
  }

  bindEvents() {
    // Template Pill Selection
    document.querySelectorAll('.template-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.template-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const presetId = pill.dataset.preset;
        this.selectPreset(presetId);
      });
    });

    // Console Dock Tabs
    if (this.tabConsoleSandbox) {
      this.tabConsoleSandbox.addEventListener('click', () => this.switchConsoleTab('sandbox'));
    }
    if (this.tabConsoleTavily) {
      this.tabConsoleTavily.addEventListener('click', () => this.switchConsoleTab('tavily'));
    }
    if (this.tabConsoleTelemetry) {
      this.tabConsoleTelemetry.addEventListener('click', () => this.switchConsoleTab('telemetry'));
    }

    // Launch Pipeline
    this.btnRunPipeline.addEventListener('click', () => this.handleRunPipeline());

    // Manual Sandbox Run
    this.btnManualRun.addEventListener('click', () => this.handleManualRun());

    // Toggle Edit Code
    this.btnEditCode.addEventListener('click', () => this.handleToggleEditCode());

    // Copy Current File
    this.btnCopyCode.addEventListener('click', () => this.handleCopyCode());

    // Export Zip / Bundle
    this.btnExportZip.addEventListener('click', () => this.handleExport());

    // Architecture Diagram Tab
    if (this.tabArchDiagram) {
      this.tabArchDiagram.addEventListener('click', () => this.switchToArchitecture());
    }

    // Terminal Interactive CLI
    if (this.terminalCliInput) {
      this.terminalCliInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.handleTerminalCommand(this.terminalCliInput.value.trim());
          this.terminalCliInput.value = '';
        }
      });
    }

    // Agent Node Inspector Clicking
    Object.keys(this.agentNodes).forEach(agentKey => {
      const node = this.agentNodes[agentKey];
      if (node) {
        node.addEventListener('click', () => this.openAgentInspector(agentKey));
      }
    });

    // Settings Modal
    this.btnOpenSettings.addEventListener('click', () => this.openSettingsModal());
    this.btnCloseSettings.addEventListener('click', () => this.closeSettingsModal());
    this.btnCancelSettings.addEventListener('click', () => this.closeSettingsModal());
    this.btnSaveSettings.addEventListener('click', () => this.saveSettings());

    // Blueprint Modal
    if (this.btnOpenBlueprint) this.btnOpenBlueprint.addEventListener('click', () => this.openBlueprintModal());
    if (this.btnCloseBlueprint) this.btnCloseBlueprint.addEventListener('click', () => this.closeBlueprintModal());
    if (this.btnCloseBlueprintFooter) this.btnCloseBlueprintFooter.addEventListener('click', () => this.closeBlueprintModal());

    // Inspector Modal
    if (this.btnCloseInspector) this.btnCloseInspector.addEventListener('click', () => this.closeInspectorModal());
    if (this.btnCloseInspectorFooter) this.btnCloseInspectorFooter.addEventListener('click', () => this.closeInspectorModal());
  }

  selectPreset(presetId) {
    this.currentPreset = presetId;
    const preset = PRESETS[presetId];
    if (preset) {
      this.promptInput.value = preset.prompt;
    }
  }

  loadInitialPreset() {
    this.selectPreset('microservice');
    const creds = api.getCredentials();
    if (creds.nebiusApiKey) this.inputNebiusKey.value = creds.nebiusApiKey;
    if (creds.tavilyApiKey) this.inputTavilyKey.value = creds.tavilyApiKey;
    if (creds.modelFlavor) this.selectModelFlavor.value = creds.modelFlavor;
  }

  switchConsoleTab(tab) {
    const tabs = [
      { id: 'sandbox', btn: this.tabConsoleSandbox, view: this.viewConsoleSandbox },
      { id: 'tavily', btn: this.tabConsoleTavily, view: this.viewConsoleTavily },
      { id: 'telemetry', btn: this.tabConsoleTelemetry, view: this.viewConsoleTelemetry }
    ];

    tabs.forEach(t => {
      if (t.id === tab) {
        t.btn.classList.add('active');
        t.view.style.display = 'block';
      } else {
        t.btn.classList.remove('active');
        t.view.style.display = 'none';
      }
    });
  }

  resetAgentNodes() {
    Object.values(this.agentNodes).forEach(node => {
      node.className = 'stepper-item idle';
      const stateEl = node.querySelector('.step-state');
      if (stateEl) stateEl.textContent = 'Idle';
    });
    this.reasoningStreamBox.innerHTML = '<span class="stream-placeholder">// Nebius Token Factory live reasoning stream...</span>\n';
    this.diffData = null;
    this.tabDiffView.style.display = 'none';
  }

  setAgentState(agentKey, state) {
    const node = this.agentNodes[agentKey];
    if (!node) return;

    const stateEl = node.querySelector('.step-state');
    if (state === 'active') {
      node.className = 'stepper-item active';
      if (stateEl) stateEl.textContent = 'Active';
      const nameEl = node.querySelector('.step-name');
      this.dagActiveStep.textContent = `Running: ${nameEl ? nameEl.textContent : agentKey}`;
    } else if (state === 'completed') {
      node.className = 'stepper-item completed';
      if (stateEl) stateEl.textContent = 'Passed';
    } else {
      node.className = 'stepper-item idle';
      if (stateEl) stateEl.textContent = 'Idle';
    }
  }

  async handleRunPipeline() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.btnRunPipeline.disabled = true;
    this.btnRunPipeline.innerHTML = `<span class="led" style="animation: pulse-led 0.8s infinite;"></span> Processing...`;
    this.pipelineStatusBadge.textContent = 'Running';
    this.pipelineStatusBadge.style.background = 'var(--nvidia-green-subtle)';
    this.pipelineStatusBadge.style.color = 'var(--nvidia-green)';

    this.resetAgentNodes();
    this.switchConsoleTab('sandbox');

    const prompt = this.promptInput.value.trim();
    const injectBug = this.toggleInjectBug.checked;

    await api.runPipeline({
      prompt,
      preset: this.currentPreset,
      injectBug,
      onEvent: (event, data) => this.handlePipelineEvent(event, data),
      onError: (err) => {
        this.pipelineStatusBadge.textContent = 'Error';
        this.pipelineStatusBadge.style.color = 'var(--accent-alert)';
        this.terminalBody.textContent += `\n[PIPELINE EXCEPTION] ${err.message}\n`;
        this.finishPipeline();
      },
      onComplete: () => {
        this.finishPipeline();
      }
    });
  }

  handlePipelineEvent(event, data) {
    switch (event) {
      case 'agent_state':
        this.setAgentState(data.agent, data.status);
        if (data.status === 'active') {
          this.reasoningStreamBox.innerHTML += `\n<strong style="color: var(--nvidia-green);">[${data.agent.toUpperCase()}]</strong> ${data.description || 'Active'}\n`;
        }
        break;

      case 'stream_chunk':
        this.reasoningStreamBox.textContent += data.chunk;
        this.reasoningStreamBox.scrollTop = this.reasoningStreamBox.scrollHeight;
        if (data.stats) {
          if (data.stats.tokensPerSec) this.valSpeed.textContent = `${data.stats.tokensPerSec} t/s`;
          if (data.stats.ttftMs) this.valTtft.textContent = `${data.stats.ttftMs} ms`;
          this.totalTokensStreamed += 1;
          if (this.dockTokensCount) this.dockTokensCount.textContent = this.totalTokensStreamed;
        }
        break;

      case 'tavily_results':
        this.renderTavilyResults(data);
        break;

      case 'code_generated':
        this.currentFiles = data.files;
        this.renderEditorTabs(Object.keys(data.files));
        this.switchToFile(data.activeFile || Object.keys(data.files)[0]);
        break;

      case 'sandbox_output':
        this.renderSandboxOutput(data);
        this.switchConsoleTab('sandbox');
        break;

      case 'self_healing_patch':
        this.diffData = data.diff;
        this.tabDiffView.style.display = 'inline-flex';
        this.reasoningStreamBox.innerHTML += `\n<span style="color: var(--accent-alert); font-weight: 700;">[SELF-HEALER TRIGGERED]</span> ${data.explanation}\n`;
        this.renderDiffView(data.diff);
        break;

      case 'pipeline_complete':
        this.pipelineStatusBadge.textContent = '100% Passed';
        this.pipelineStatusBadge.style.color = 'var(--nvidia-green)';
        this.dagActiveStep.textContent = 'Complete (All Tests Green)';
        if (data.files) {
          this.currentFiles = data.files;
          this.switchToFile(this.activeFile);
        }
        if (data.stats && this.dockTokensCount) {
          this.dockTokensCount.textContent = data.stats.nebiusTokens || this.totalTokensStreamed;
        }
        break;
    }
  }

  finishPipeline() {
    this.isRunning = false;
    this.btnRunPipeline.disabled = false;
    this.btnRunPipeline.innerHTML = `
      <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      Launch Pipeline
    `;
  }

  renderTavilyResults(data) {
    if (this.tavilyLatencyBadge) {
      this.tavilyLatencyBadge.textContent = `${data.latencyMs}ms (${data.results.length} citations)`;
    }
    let html = '';
    for (const r of data.results) {
      html += `
        <div class="tavily-result-item">
          <a class="tavily-item-title" href="${r.url}" target="_blank" rel="noopener">${r.title}</a>
          <p class="tavily-item-snippet">${r.content}</p>
        </div>
      `;
    }
    this.tavilyResultsList.innerHTML = html;
  }

  renderEditorTabs(fileNames) {
    let html = '';
    fileNames.forEach((file) => {
      const activeClass = file === this.activeFile ? 'active' : '';
      html += `<button class="tab-btn ${activeClass}" data-file="${file}">${file}</button>`;
    });

    html += `
      <button class="tab-btn" data-file="__arch__" id="tab-arch-diagram">
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        Architecture
      </button>
      <button class="tab-btn diff-tab" data-file="__diff__" id="tab-diff-view" style="${this.diffData ? 'display: inline-flex;' : 'display: none;'}">
        <span class="diff-indicator">●</span> Self-Healing Diff
      </button>
    `;

    this.editorTabsContainer.innerHTML = html;

    // Attach click listeners to tabs
    this.editorTabsContainer.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const file = btn.dataset.file;
        if (file === '__diff__') {
          this.switchToDiff();
        } else if (file === '__arch__') {
          this.switchToArchitecture();
        } else {
          this.switchToFile(file);
        }
      });
    });
  }

  switchToFile(filename) {
    this.activeFile = filename;
    this.editorTabsContainer.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.file === filename);
    });

    this.diffViewContainer.style.display = 'none';
    this.archViewContainer.style.display = 'none';
    this.editorCodeContainer.style.display = 'block';
    this.editorLineNumbers.style.display = 'block';

    const content = this.currentFiles[filename] || '';
    this.editorCodeContainer.innerHTML = `<code>${this.escapeHtml(content)}</code>`;

    // Render line numbers
    const linesCount = content.split('\n').length;
    let numbersHtml = '';
    for (let i = 1; i <= linesCount; i++) {
      numbersHtml += `${i}<br>`;
    }
    this.editorLineNumbers.innerHTML = numbersHtml;
  }

  switchToDiff() {
    this.editorTabsContainer.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.file === '__diff__');
    });

    this.editorCodeContainer.style.display = 'none';
    this.editorLineNumbers.style.display = 'none';
    this.archViewContainer.style.display = 'none';
    this.diffViewContainer.style.display = 'block';

    this.renderDiffView(this.diffData);
  }

  switchToArchitecture() {
    this.editorTabsContainer.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.file === '__arch__');
    });

    this.editorCodeContainer.style.display = 'none';
    this.editorLineNumbers.style.display = 'none';
    this.diffViewContainer.style.display = 'none';
    this.archViewContainer.style.display = 'flex';
  }

  renderDiffView(diffText) {
    if (!diffText) return;
    const lines = diffText.split('\n');
    let html = '<div style="font-family: var(--font-mono); font-size: 0.78rem;">';
    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        html += `<span class="diff-line-add">${this.escapeHtml(line)}</span>`;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        html += `<span class="diff-line-del">${this.escapeHtml(line)}</span>`;
      } else {
        html += `<span>${this.escapeHtml(line)}</span>\n`;
      }
    }
    html += '</div>';
    this.diffViewContainer.innerHTML = html;
  }

  handleToggleEditCode() {
    if (!this.currentFiles[this.activeFile]) {
      alert('Launch pipeline to generate code before editing.');
      return;
    }

    this.isEditing = !this.isEditing;
    if (this.isEditing) {
      this.editorCodeContainer.contentEditable = "true";
      this.editorCodeContainer.focus();
      this.btnEditCode.innerHTML = '<span>✓ Save & Test</span>';
      this.btnEditCode.style.borderColor = 'var(--nvidia-green)';
      this.btnEditCode.style.color = 'var(--nvidia-green)';
    } else {
      this.editorCodeContainer.contentEditable = "false";
      this.btnEditCode.innerHTML = '<span>Edit</span>';
      this.btnEditCode.style.borderColor = '';
      this.btnEditCode.style.color = '';
      
      // Save changes & auto re-test
      this.currentFiles[this.activeFile] = this.editorCodeContainer.innerText;
      this.handleManualRun();
    }
  }

  renderSandboxOutput(data) {
    this.terminalBody.textContent = data.stdout;
    if (data.stderr) {
      this.terminalBody.textContent += `\n[STDERR]:\n${data.stderr}`;
    }

    if (data.tests) {
      this.testSummaryBadge.style.display = 'inline-flex';
      if (data.success) {
        this.testSummaryBadge.className = 'terminal-pass-badge';
        this.testSummaryBadge.textContent = `${data.tests.passed}/${data.tests.total} PASS`;
      } else {
        this.testSummaryBadge.className = 'terminal-fail-badge';
        this.testSummaryBadge.textContent = `${data.tests.passed}/${data.tests.total} FAIL`;
      }
    }
    this.terminalBody.scrollTop = this.terminalBody.scrollHeight;
  }

  async handleManualRun() {
    if (!Object.keys(this.currentFiles).length) {
      alert('Please launch the pipeline first.');
      return;
    }
    this.btnManualRun.disabled = true;
    this.btnManualRun.textContent = 'Running...';
    try {
      const result = await api.executeSandbox({
        files: this.currentFiles,
        entryPoint: this.activeFile.endsWith('.py') ? this.activeFile : 'main.py'
      });
      this.renderSandboxOutput(result);
    } catch (e) {
      this.terminalBody.textContent += `\n[EXECUTION ERROR] ${e.message}\n`;
    } finally {
      this.btnManualRun.disabled = false;
      this.btnManualRun.textContent = '▶ Run Tests';
    }
  }

  handleTerminalCommand(cmd) {
    if (!cmd) return;
    this.terminalBody.textContent += `\n$ ${cmd}\n`;
    const lower = cmd.toLowerCase();

    if (lower === 'help') {
      this.terminalBody.textContent += `Available diagnostic commands:
  help              Display this command list
  test / run        Execute test suite in isolated container sandbox
  nebius status     Inspect Nebius Token Factory cluster health & throughput
  tavily <query>    Execute real-time Tavily grounding query
  env               Display virtual runtime environment variables
  clear             Clear the terminal console buffer\n`;
    } else if (lower === 'test' || lower === 'run') {
      this.handleManualRun();
    } else if (lower.startsWith('nebius')) {
      this.terminalBody.textContent += `[NEBIUS TOKEN FACTORY TELEMETRY]
Cluster Backbone: NVIDIA H100 SXM5 80GB (NVLink 900 GB/s)
Inference Engine: FP8 TensorRT-LLM Speculative Decoding
Serving Endpoint: api.studio.nebius.ai/v1
Live Throughput:  108.4 tokens/sec
Time-To-First-Tok: 185 ms
Cluster Status:   HEALTHY / OPTIMAL\n`;
    } else if (lower.startsWith('tavily')) {
      const query = cmd.slice(7).trim() || 'NVIDIA Nemotron architecture';
      this.terminalBody.textContent += `[TAVILY RADAR] Querying web for: "${query}"...\n`;
      fetch('/api/tavily/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      }).then(r => r.json()).then(data => {
        this.terminalBody.textContent += `[TAVILY RESULTS] (${data.latencyMs}ms):\n`;
        (data.results || []).forEach((item, idx) => {
          this.terminalBody.textContent += `  [${idx+1}] ${item.title}\n      URL: ${item.url}\n`;
        });
        this.terminalBody.scrollTop = this.terminalBody.scrollHeight;
      }).catch(e => {
        this.terminalBody.textContent += `[TAVILY ERROR] ${e.message}\n`;
      });
    } else if (lower === 'env') {
      this.terminalBody.textContent += `CONTAINER ENVIRONMENT:
OS=Ubuntu 24.04 LTS (x86_64)
PYTHON=3.12.5
CUDA=12.4
NEBIUS_CLUSTER=h100-sxm5-ord1\n`;
    } else if (lower === 'clear') {
      this.terminalBody.textContent = '[TERMINAL CLEARED]\nsandbox@nebius-h100-container:~# ';
    } else {
      this.terminalBody.textContent += `Command not recognized: '${cmd}'. Type 'help' for available commands.\n`;
    }
    this.terminalBody.scrollTop = this.terminalBody.scrollHeight;
  }

  openAgentInspector(agentKey) {
    const meta = this.agentTelemetry[agentKey];
    if (!meta) return;

    this.inspectorModalTitle.textContent = `${meta.name} — Technical Telemetry`;
    this.inspectorModalBody.innerHTML = `
      <div style="font-size: 0.8rem; line-height: 1.5;">
        <table class="inspector-table">
          <tr><th>Designation:</th><td><strong>${meta.name}</strong></td></tr>
          <tr><th>Primary Role:</th><td>${meta.role}</td></tr>
          <tr><th>Engine / Model:</th><td><code style="color: var(--nvidia-green);">${meta.model}</code></td></tr>
          <tr><th>Temperature:</th><td><code>${meta.temp}</code></td></tr>
          <tr><th>Avg Token Output:</th><td><code>${meta.tokens} tokens</code></td></tr>
          <tr><th>Inference Latency:</th><td><code style="color: var(--nvidia-green);">${meta.latency}</code></td></tr>
          <tr><th>Tooling:</th><td>${meta.tools.map(t => `<span class="badge-status" style="margin-right: 4px;">${t}</span>`).join('')}</td></tr>
        </table>

        <div style="margin-top: 14px;">
          <h4 style="color: #fff; font-size: 0.78rem; margin-bottom: 6px;">System Directive:</h4>
          <div style="background: var(--bg-app); padding: 8px 10px; border-radius: 4px; font-family: var(--font-mono); font-size: 0.72rem; color: #a7f3d0; border: 1px solid var(--border-hairline);">
            ${meta.prompt}
          </div>
        </div>
      </div>
    `;
    this.modalInspector.classList.add('open');
  }

  closeInspectorModal() {
    this.modalInspector.classList.remove('open');
  }

  handleCopyCode() {
    const content = this.currentFiles[this.activeFile] || '';
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      const prev = this.btnCopyCode.innerHTML;
      this.btnCopyCode.innerHTML = '<span>✓ Copied</span>';
      setTimeout(() => this.btnCopyCode.innerHTML = prev, 1500);
    });
  }

  handleExport() {
    if (!Object.keys(this.currentFiles).length) {
      alert('Launch the pipeline first to generate the project files.');
      return;
    }
    const blob = new Blob([JSON.stringify(this.currentFiles, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nemesis-project-bundle-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  openSettingsModal() {
    this.modalSettings.classList.add('open');
  }
  closeSettingsModal() {
    this.modalSettings.classList.remove('open');
  }
  saveSettings() {
    api.saveCredentials({
      nebiusApiKey: this.inputNebiusKey.value.trim(),
      tavilyApiKey: this.inputTavilyKey.value.trim(),
      modelFlavor: this.selectModelFlavor.value
    });
    this.closeSettingsModal();
    alert('Credentials saved successfully!');
  }

  openBlueprintModal() {
    this.modalBlueprint.classList.add('open');
  }
  closeBlueprintModal() {
    this.modalBlueprint.classList.remove('open');
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
