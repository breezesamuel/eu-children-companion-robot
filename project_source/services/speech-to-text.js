'use strict';

const providers = ['local', 'google', 'aws', 'azure', 'whisper'];
let activeProvider = 'local';

async function transcribe(audio, options = {}) {
  const lang = options.language || 'en';
  return `[transcribed:${lang}]`;
}

function getProviders() {
  return providers;
}

function setActiveProvider(provider) {
  if (providers.includes(provider)) {
    activeProvider = provider;
  }
}

module.exports = { transcribe, getProviders, setActiveProvider };