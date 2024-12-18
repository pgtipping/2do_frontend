import OpenAI from "openai";

export class NLPTaskParser {
  constructor(apiKey) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async parseTask(userInput) {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a task parser. Extract task details from user input and return a JSON object with:
              - text: the main task description
              - category: inferred category (work, personal, shopping, or other common categories)
              - priority: High, Medium, or Low based on urgency words
              - dueDate: in YYYY-MM-DD format if a date is mentioned
              Only include dueDate if a specific date is mentioned.`,
          },
          {
            role: "user",
            content: userInput,
          },
        ],
        temperature: 0.3,
        max_tokens: 150,
      });

      const result = JSON.parse(response.choices[0].message.content);
      return {
        ...result,
        dueDate: result.dueDate || "",
      };
    } catch (error) {
      console.error("Error parsing task:", error);
      // Return a basic structure if parsing fails
      return {
        text: userInput,
        category: "personal",
        priority: "Medium",
        dueDate: "",
      };
    }
  }
}

// Example usage:
// const parser = new NLPTaskParser('your-api-key');
// const taskDetails = await parser.parseTask("Finish the report by next Friday");
