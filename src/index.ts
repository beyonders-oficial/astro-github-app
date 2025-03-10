import OpenAI from "openai";
import { Probot } from "probot";
import dotenv from "dotenv";

dotenv.config();

export default (app: Probot) => {
  app.log.info("ChatGPT PR review bot is running!");

  app.on("pull_request.opened", async (context) => {
    app.log.info("Triggered!");

    const pr = context.payload.pull_request;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Fetch PR diffs
    const files = await context.octokit.pulls.listFiles(
      context.repo({ pull_number: pr.number })
    );

    let diffText = "";
    for (const file of files.data) {
      diffText += `File: ${file.filename}\nDiff:\n${file.patch}\n\n`;
    }
    app.log.info(diffText);

    // ChatGPT Prompt for Review & Diagram
    const prompt = `Analyze the following GitHub Pull Request diff and:
    - Identify issues
    - Suggest improvements
    - Explain what is wrong
    - Generate a **Mermaid.js sequence diagram** or flowchart for better understanding.

    ${diffText}`;

    // Send PR diff to ChatGPT
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: prompt }],
      max_tokens: 2048,
    });

    const reviewComments = response.choices[0].message.content;

    // Post review comment on GitHub
    await context.octokit.pulls.createReview(
      context.repo({
        pull_number: pr.number,
        body: `### 🤖 ChatGPT Review\n\n${reviewComments}`,
        event: "COMMENT",
      })
    );

    app.log.info("Review posted!");
  });
  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};
