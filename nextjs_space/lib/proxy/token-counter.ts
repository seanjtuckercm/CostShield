/**
 * Token Counter using tiktoken
 * Implements accurate token counting for OpenAI models
 * Reference: Section 7.1 of COSTSHIELD_CLOUD_REQUIREMENTS.md
 */

import { encoding_for_model, type Tiktoken } from 'tiktoken';

export class TokenCounter {
  private encoders: Map<string, Tiktoken> = new Map();

  /**
   * Get or create encoder for a specific model
   */
  private getEncoder(model: string): Tiktoken {
    if (!this.encoders.has(model)) {
      try {
        const encoder = encoding_for_model(model as any);
        this.encoders.set(model, encoder);
      } catch (error) {
        // Fallback to cl100k_base (used by gpt-3.5-turbo and gpt-4)
        console.warn(`Unknown model ${model}, using cl100k_base encoding`);
        const encoder = encoding_for_model('gpt-3.5-turbo');
        this.encoders.set(model, encoder);
      }
    }
    return this.encoders.get(model)!;
  }

  /**
   * Count tokens in plain text
   */
  countTokens(text: string, model: string = 'gpt-4'): number {
    const encoder = this.getEncoder(model);
    const tokens = encoder.encode(text);
    return tokens.length;
  }

  /**
   * Count tokens for chat messages
   * Handles the special formatting overhead for chat completions
   */
  countChatTokens(messages: Array<{ role: string; content: string | Array<any>; name?: string }>, model: string = 'gpt-4'): number {
    const encoder = this.getEncoder(model);
    
    let tokenCount = 0;
    
    // Format overhead per message
    // Each message has: <|start|>role/name\n{content}<|end|>\n
    const tokensPerMessage = 3;
    const tokensPerName = 1;
    
    for (const message of messages) {
      tokenCount += tokensPerMessage;
      
      // Count tokens for role
      tokenCount += encoder.encode(message.role).length;
      
      // Count tokens for content
      if (typeof message.content === 'string') {
        tokenCount += encoder.encode(message.content).length;
      } else if (Array.isArray(message.content)) {
        // Handle array content (for vision models)
        for (const item of message.content) {
          if (typeof item === 'string') {
            tokenCount += encoder.encode(item).length;
          }
          // Image tokens are handled separately by OpenAI
        }
      }
      
      // Count tokens for name if present
      if (message.name) {
        tokenCount += encoder.encode(message.name).length;
        tokenCount += tokensPerName;
      }
    }
    
    // Every reply is primed with <|start|>assistant<|message|>
    tokenCount += 3;
    
    return tokenCount;
  }

  /**
   * Estimate output tokens based on max_tokens parameter
   * Heuristic: higher temperature = more tokens used
   */
  estimateOutputTokens(maxTokens: number, temperature: number = 1.0): number {
    // Heuristic: higher temperature = more tokens used
    // Base estimate: 70% of max_tokens, plus temperature factor
    return Math.ceil(maxTokens * (0.7 + (temperature * 0.3)));
  }

  /**
   * Clean up encoders (call when done)
   */
  dispose(): void {
    for (const encoder of this.encoders.values()) {
      encoder.free();
    }
    this.encoders.clear();
  }
}

// Singleton instance
let tokenCounterInstance: TokenCounter | null = null;

export function getTokenCounter(): TokenCounter {
  if (!tokenCounterInstance) {
    tokenCounterInstance = new TokenCounter();
  }
  return tokenCounterInstance;
}
