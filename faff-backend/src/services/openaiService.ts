import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate a summary of task discussion with entity extraction
 * @param messages Array of messages to summarize
 * @param taskStatus Current status of the task
 * @returns Object containing summary text and extracted entities
 */
export const generateTaskSummary = async (
  messages: {
    id: number;
    content: string;
    sender: { name: string };
    createdAt: Date;
  }[],
  taskStatus: string
): Promise<{ content: string; entities: string[] }> => {
  try {
    if (messages.length === 0) {
      return {
        content: "No messages to summarize.",
        entities: []
      };
    }

    // Prepare the messages for OpenAI
    const messageTexts = messages.map(msg => 
      `${msg.sender.name} (${new Date(msg.createdAt).toLocaleString()}): ${msg.content}`
    ).join('\n\n');

    // Generate the prompt for OpenAI
    const prompt = `
    Please create a concise summary (2-3 sentences) of the following task discussion.
    Task Status: ${taskStatus}
    
    Discussion:
    ${messageTexts}
    
    Additionally, extract any contact information, URLs, emails, phone numbers, or other important entities mentioned in the discussion.
    
    Format your response as JSON with two fields:
    1. "summary": A concise 2-3 sentence summary of the discussion highlighting the key points and current status
    2. "entities": An array of strings containing all extracted entities (URLs, phone numbers, emails, etc.)
    `;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that summarizes task discussions and extracts important entities."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    // Parse the response
    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      content: result.summary || "Summary generation failed.",
      entities: result.entities || []
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    return {
      content: "Error generating summary: " + (error as Error).message,
      entities: []
    };
  }
};

/**
 * Check if a message meets QA standards
 * @param message The message content to check
 * @param taskContext The context of the task (previous messages)
 * @returns Object containing QA result and feedback
 */
export const checkMessageQuality = async (
  message: string,
  taskContext: string
): Promise<{ isApproved: boolean; feedback: string }> => {
  try {
    // Generate the prompt for OpenAI
    const prompt = `
    Please review the following message for quality assurance in a customer support context.
    Check if it meets the following standards:
    - Professional and courteous tone
    - Addresses all points in the conversation
    - Provides clear information without ambiguity
    - Free of grammatical errors
    - Contains accurate information based on the context
    
    Task Context:
    ${taskContext}
    
    Message to Review:
    ${message}
    
    Format your response as JSON with two fields:
    1. "isApproved": A boolean indicating if the message passes quality check (true/false)
    2. "feedback": Detailed feedback explaining why the message was approved or rejected, with specific suggestions for improvement if rejected
    `;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a quality assurance specialist reviewing customer support messages."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    // Parse the response
    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      isApproved: result.isApproved || false,
      feedback: result.feedback || "Quality check failed to provide feedback."
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    return {
      isApproved: false,
      feedback: "Error checking message quality: " + (error as Error).message
    };
  }
}; 