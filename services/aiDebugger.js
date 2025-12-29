/**
 * AI Debugger Service
 * Integrates with Google Gemini API to provide intelligent debugging assistance
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIDebuggerService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    
    if (!this.apiKey || this.apiKey === 'your_gemini_api_key_here') {
      console.warn('⚠️  Gemini API key not configured. AI Debugger will be disabled.');
      this.enabled = false;
      return;
    }
    
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    this.enabled = true;
    console.log('✓ AI Debugger service initialized with Gemini API');
  }

  /**
   * Analyze student code against mentor's reference code
   * @param {string} studentCode - Student's code
   * @param {string} mentorCode - Mentor's reference code
   * @param {string} errorMessage - Error message if any
   * @param {string} language - Programming language
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeCode(studentCode, mentorCode, errorMessage = null, language = 'javascript') {
    if (!this.enabled) {
      return {
        success: false,
        error: 'AI Debugger is not enabled. Please configure GEMINI_API_KEY.',
        suggestions: ['Check your environment configuration']
      };
    }

    try {
      const prompt = this.buildAnalysisPrompt(studentCode, mentorCode, errorMessage, language);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse the AI response
      const analysis = this.parseAnalysisResponse(text);
      
      return {
        success: true,
        analysis: {
          errors: analysis.errors || [],
          suggestions: analysis.suggestions || [],
          explanation: analysis.explanation || text,
          codeComparison: analysis.codeComparison || null,
          confidenceScore: analysis.confidence || 0.85,
          learningPoints: analysis.learningPoints || []
        }
      };
      
    } catch (error) {
      console.error('AI Debugger error:', error);
      return {
        success: false,
        error: 'Failed to analyze code. Please try again.',
        suggestions: ['Check your code syntax', 'Compare with mentor\'s code manually']
      };
    }
  }

  /**
   * Build analysis prompt for Gemini
   * @private
   */
  buildAnalysisPrompt(studentCode, mentorCode, errorMessage, language) {
    let prompt = `You are an expert programming tutor helping students learn by comparing their code with a mentor's reference implementation.

PROGRAMMING LANGUAGE: ${language}

MENTOR'S REFERENCE CODE:
\`\`\`${language}
${mentorCode}
\`\`\`

STUDENT'S CODE:
\`\`\`${language}
${studentCode}
\`\`\`
`;

    if (errorMessage) {
      prompt += `
ERROR MESSAGE:
${errorMessage}
`;
    }

    prompt += `
Please analyze the student's code and provide:

1. **Errors Found**: List any syntax errors, logical errors, or bugs
2. **Differences**: Key differences from the mentor's approach
3. **Suggestions**: Specific, actionable suggestions to improve the code
4. **Explanation**: Clear explanation of what the student should learn
5. **Learning Points**: Key concepts the student should understand

Format your response as JSON with these keys:
{
  "errors": ["error1", "error2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "explanation": "detailed explanation",
  "codeComparison": "comparison summary",
  "confidence": 0.85,
  "learningPoints": ["point1", "point2"]
}

Focus on being educational and encouraging. Help the student learn, not just fix the code.`;

    return prompt;
  }

  /**
   * Parse AI response into structured format
   * @private
   */
  parseAnalysisResponse(text) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback: parse as plain text
      return {
        explanation: text,
        suggestions: this.extractSuggestions(text),
        errors: this.extractErrors(text),
        confidence: 0.75
      };
    } catch (error) {
      return {
        explanation: text,
        suggestions: ['Review the differences between your code and the mentor\'s code'],
        errors: [],
        confidence: 0.5
      };
    }
  }

  /**
   * Extract suggestions from plain text
   * @private
   */
  extractSuggestions(text) {
    const suggestions = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.match(/^[-*]\s+/i) || line.match(/suggestion/i)) {
        suggestions.push(line.replace(/^[-*]\s+/, '').trim());
      }
    }
    
    return suggestions.slice(0, 5); // Return top 5 suggestions
  }

  /**
   * Extract errors from plain text
   * @private
   */
  extractErrors(text) {
    const errors = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.match(/error|bug|issue|problem/i)) {
        errors.push(line.trim());
      }
    }
    
    return errors.slice(0, 3); // Return top 3 errors
  }

  /**
   * Get a hint for stuck students
   * @param {string} studentCode - Student's current code
   * @param {string} mentorCode - Mentor's reference code
   * @param {string} language - Programming language
   * @returns {Promise<Object>} Hint
   */
  async getHint(studentCode, mentorCode, language = 'javascript') {
    if (!this.enabled) {
      return {
        success: false,
        hint: 'AI hints are not available. Please ask your mentor for help.'
      };
    }

    try {
      const prompt = `You are a helpful programming tutor. A student is working on this code:

\`\`\`${language}
${studentCode}
\`\`\`

The correct approach is:
\`\`\`${language}
${mentorCode}
\`\`\`

Give a brief, encouraging hint (2-3 sentences) to help the student move forward without giving away the solution. Focus on the next step they should take.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const hint = response.text();

      return {
        success: true,
        hint: hint.trim()
      };

    } catch (error) {
      console.error('AI hint generation error:', error);
      return {
        success: false,
        hint: 'Unable to generate hint. Please review the mentor\'s code for guidance.'
      };
    }
  }

  /**
   * Check if service is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled;
  }
}

// Singleton instance
let aiDebuggerInstance = null;

/**
 * Get AI Debugger instance
 * @returns {AIDebuggerService}
 */
function getAIDebugger() {
  if (!aiDebuggerInstance) {
    aiDebuggerInstance = new AIDebuggerService();
  }
  return aiDebuggerInstance;
}

module.exports = {
  AIDebuggerService,
  getAIDebugger
};
