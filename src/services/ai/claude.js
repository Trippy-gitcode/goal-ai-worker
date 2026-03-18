export function buildAnthropicRequest(fixedPart, variablePart, messages, model, maxTokens, env) {
  const requestBody = {
    model: model,
    max_tokens: maxTokens,
    messages: messages,
  };

  if (env.CACHE_ENABLED === 'true') {
    const systemBlocks = [
      {
        type: 'text',
        text: fixedPart,
        cache_control: { type: 'ephemeral' },
      },
    ];
    if (variablePart && variablePart.trim()) {
      systemBlocks.push({
        type: 'text',
        text: variablePart,
      });
    }
    requestBody.system = systemBlocks;
  } else {
    requestBody.system = fixedPart + variablePart;
  }

  return requestBody;
}
