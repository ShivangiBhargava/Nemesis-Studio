/**
 * Production Architecture Templates
 * Pre-configured blueprint specifications for high-throughput distributed systems, edge AI, and security
 */

export const PRESETS = {
  microservice: {
    id: 'microservice',
    title: 'High-Speed Async Microservice',
    tag: 'Distributed Systems',
    prompt: 'Architect and build an enterprise microservice with sliding-window rate limiting, Nebius Token Factory streaming integration, and automated container validation.',
    injectBugDescription: 'Injects unhandled None stream_id exception in verify_telemetry_batch() to demonstrate Nemotron reflection and automatic AST patch generation.'
  },
  jetson_edge: {
    id: 'jetson_edge',
    title: 'NVIDIA Jetson Edge Telemetry',
    tag: 'Edge Computing',
    prompt: 'Design a low-latency edge video telemetry streamer optimized for NVIDIA Jetson Orin Nano with 15W power envelope, TensorRT-LLM acceleration, and hardware performance metrics.',
    injectBugDescription: 'Injects unvalidated negative frame index assertion to demonstrate edge failure triage and self-healing.'
  },
  cve_patcher: {
    id: 'cve_patcher',
    title: 'Autonomous CVE Security Patcher',
    tag: 'Autonomous SecOps',
    prompt: 'Scan project codebase for CVE-2024 path traversal vulnerabilities, perform live Tavily web intelligence search for security advisories, and apply cryptographically secure path sanitization.',
    injectBugDescription: 'Injects naive open() path traversal vulnerability to show Tavily real-time CVE advisory retrieval and mitigation.'
  }
};
