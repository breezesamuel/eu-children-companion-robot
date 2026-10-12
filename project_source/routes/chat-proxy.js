const express = require('express');
const router = express.Router();

// Public chat proxy — no auth required, API key passed from frontend
// Supports OpenAI-compatible streaming and non-streaming chat

router.post('/chat', async (req, res) => {
  try {
    const { messages, model = 'gpt-4o-mini', apiKey, provider = 'openai', temperature = 0.7, maxTokens = 2048, stream = true } = req.body;
    if (!apiKey) {
      return res.json({ success: false, error: 'API key required' });
    }
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.json({ success: false, error: 'messages[] required' });
    }

    const endpoints = {
      openai: { url: 'https://api.openai.com/v1/chat/completions', headers: { Authorization: `Bearer ${apiKey}` } },
      deepseek: { url: 'https://api.deepseek.com/v1/chat/completions', headers: { Authorization: `Bearer ${apiKey}` } },
      groq: { url: 'https://api.groq.com/openai/v1/chat/completions', headers: { Authorization: `Bearer ${apiKey}` } },
      mistral: { url: 'https://api.mistral.ai/v1/chat/completions', headers: { Authorization: `Bearer ${apiKey}` } },
      together: { url: 'https://api.together.xyz/v1/chat/completions', headers: { Authorization: `Bearer ${apiKey}` } },
      claude: { url: 'https://api.anthropic.com/v1/messages', headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } },
      gemini: { url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`, headers: {} },
      ollama: { url: `${process.env.OLLAMA_ENDPOINT || 'http://localhost:11434'}/v1/chat/completions`, headers: {} }
    };

    const config = endpoints[provider];
    if (!config) {
      return res.json({ success: false, error: `Unknown provider: ${provider}` });
    }

    if (stream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      const controller = new AbortController();
      req.on('close', () => controller.abort());

      if (provider === 'claude') {
        const body = JSON.stringify({ model, messages, max_tokens: maxTokens, stream: true, temperature });
        const response = await fetch(config.url, { method: 'POST', headers: { ...config.headers, 'Content-Type': 'application/json' }, body, signal: controller.signal });
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  res.write('data: ' + JSON.stringify({ chunk: parsed.delta.text }) + '\n\n');
                }
              } catch (e) { /* skip parse errors */ }
            }
          }
        }
      } else if (provider === 'gemini') {
        const body = JSON.stringify({ contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })) });
        const response = await fetch(config.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: controller.signal });
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          for (const line of text.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
                  res.write('data: ' + JSON.stringify({ chunk: parsed.candidates[0].content.parts[0].text }) + '\n\n');
                }
              } catch (e) { /* skip */ }
            }
          }
        }
      } else {
        // OpenAI-compatible streaming
        const body = JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, stream: true });
        const response = await fetch(config.url, { method: 'POST', headers: { ...config.headers, 'Content-Type': 'application/json' }, body, signal: controller.signal });
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.choices?.[0]?.delta?.content) {
                  res.write('data: ' + JSON.stringify({ chunk: parsed.choices[0].delta.content }) + '\n\n');
                }
              } catch (e) { /* skip parse errors */ }
            }
          }
        }
      }
      res.write('data: ' + JSON.stringify({ done: true }) + '\n\n');
      res.end();
    } else {
      // Non-streaming response
      const body = JSON.stringify({ model, messages, temperature, max_tokens: maxTokens });
      const response = await fetch(config.url, { method: 'POST', headers: { ...config.headers, 'Content-Type': 'application/json' }, body });
      const data = await response.json();
      if (provider === 'claude') {
        res.json({ success: true, reply: data.content?.[0]?.text || '', model });
      } else {
        res.json({ success: true, reply: data.choices?.[0]?.message?.content || '', model: data.model || model });
      }
    }
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

router.get('/providers', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
      { id: 'deepseek', name: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder'] },
      { id: 'groq', name: 'Groq (Free)', models: ['llama3-70b-8192', 'llama3-8b-8192', 'mixtral-8x7b-32768', 'gemma2-9b-it'] },
      { id: 'mistral', name: 'Mistral AI', models: ['mistral-large-latest', 'mistral-small-latest', 'open-mixtral-8x7b'] },
      { id: 'together', name: 'Together AI', models: ['meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo', 'meta-llama/Llama-3.1-70B-Instruct-Turbo'] },
      { id: 'claude', name: 'Anthropic Claude', models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'] },
      { id: 'gemini', name: 'Google Gemini', models: ['gemini-1.5-flash', 'gemini-1.5-pro'] },
      { id: 'ollama', name: 'Ollama (Local)', models: ['llama3.2:1b', 'llama3.2', 'llama3.1:70b', 'mistral', 'qwen2.5:7b', 'phi3'] }
    ]
  });
});

module.exports = router;
