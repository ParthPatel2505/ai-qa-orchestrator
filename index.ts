import { StateGraph, END, Annotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import * as fs from "fs";
import { exec } from "child_process";
import util from "util";
import { chromium } from "playwright"; // <-- Imported for the Performance Agent

const execPromise = util.promisify(exec);

// Helper function to prevent Google API Rate Limiting (429 Error)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0.2
});

// 1. Define the Shared State (Now includes performanceReport)
const QAState = Annotation.Root({
    requirement: Annotation<string>(),
    testPlan: Annotation<string>(),
    playwrightCode: Annotation<string>(),
    executionResult: Annotation<string>(),
    securityReport: Annotation<string>(),
    performanceReport: Annotation<string>(), // <-- New Data Pipeline
});

// 2. Node: Requirement Analyst
async function requirementAnalyst(state: typeof QAState.State) {
    console.log("-> [Agent 1] Analyzing Requirement and Building Test Plan...");
    const prompt = `You are a Lead QA. Analyze this user story and output a brief test plan identifying 2 positive and 1 negative UI test cases. User Story: ${state.requirement}`;
    const response = await llm.invoke(prompt);
    return { testPlan: response.content as string };
}

// 3. Node: Playwright Automation Engineer
async function playwrightEngineer(state: typeof QAState.State) {
    await sleep(2000); // Prevent API limit
    console.log("-> [Agent 2] Generating Playwright JavaScript Code...");
    const prompt = `You are an expert Automation Tester. Based on this test plan, write a single Playwright test script in JavaScript for OrangeHRM. Use resilient locators (page.getByRole, page.getByPlaceholder). Do not include markdown blocks, just the raw code. Test Plan: ${state.testPlan}`;
    const response = await llm.invoke(prompt);
    return { playwrightCode: response.content as string };
}

// 4. Node: Playwright Executor
async function executionAgent(state: typeof QAState.State) {
    console.log("-> [Agent 3] Launching Playwright Browser (Functional UI Test)...");
    const fileName = 'orangehrm-ai-test.spec.js';
    fs.writeFileSync(fileName, state.playwrightCode);
    try {
        const { stdout } = await execPromise(`npx playwright test ${fileName} --headed`);
        return { executionResult: stdout };
    } catch (error: any) {
        return { executionResult: error.stdout || error.message };
    }
}

// 5. Node: VAPT Security Agent
async function vaptSecurityAgent(state: typeof QAState.State) {
    await sleep(2000); // Prevent API limit
    console.log("-> [Agent 4] Running Non-Destructive VAPT Baseline Scan...");
    const targetUrl = "https://opensource-demo.orangehrmlive.com/web/index.php/auth/login";

    try {
        const response = await fetch(targetUrl);
        const headers = Object.fromEntries(response.headers.entries());

        const prompt = `
            You are a Senior Security Engineer. Analyze these HTTP headers.
            Identify any missing standard security headers (e.g., Strict-Transport-Security, X-Frame-Options, Content-Security-Policy).
            Provide a brief, 3-bullet-point summary.
            Target Headers: ${JSON.stringify(headers)}
        `;
        const securityAnalysis = await llm.invoke(prompt);
        return { securityReport: securityAnalysis.content as string };
    } catch (error) {
        return { securityReport: "⚠️ VAPT Scan Failed." };
    }
}

// 6. Node: Performance Agent (The New Addition!)
async function performanceAgent(state: typeof QAState.State) {
    await sleep(2000); // Prevent API limit
    console.log("-> [Agent 5] Running Frontend Performance Audit...");
    const targetUrl = "https://opensource-demo.orangehrmlive.com/web/index.php/auth/login";

    try {
        // Spin up a silent, headless browser just to measure network speed
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        await page.goto(targetUrl);

        // Extract raw performance timings from the browser engine
        const timingJson = await page.evaluate(() => JSON.stringify(window.performance.timing));
        const timing = JSON.parse(timingJson);

        // Calculate the actual load time in milliseconds
        const loadTimeMS = timing.loadEventEnd - timing.navigationStart;
        await browser.close();

        // Ask the AI to evaluate the metrics
        const prompt = `
            You are a Performance QA Engineer. Analyze this load time for our web application.
            Total Page Load Time: ${loadTimeMS} milliseconds.
            Industry standard SLA is < 3000ms. 
            Provide a 2-sentence summary stating if this passes or fails performance standards.
        `;
        const perfAnalysis = await llm.invoke(prompt);
        return { performanceReport: perfAnalysis.content as string };
    } catch (error) {
        return { performanceReport: "⚠️ Performance Scan Failed." };
    }
}

// 7. Node: Jira Reporter Agent
async function jiraReporterAgent(state: typeof QAState.State) {
    await sleep(2000); // Prevent API limit
    console.log("-> [Agent 6] Preparing Unified DevSecOps Jira Ticket...");

    // Summarize Functional, Security, AND Performance data
    const prompt = `
      You are a QA Reporter. Summarize this execution data into a clean Jira bug description.
      Format with 3 sections: [UI Functional Status], [Security Status], [Performance Status].
      Functional Logs: ${state.executionResult}
      Security Report: ${state.securityReport}
      Performance Report: ${state.performanceReport}
    `;
    const summaryResponse = await llm.invoke(prompt);

    const jiraPayload = {
        fields: {
            project: { key: process.env.JIRA_PROJECT_KEY || "QA" },
            summary: `Automated DevSecOps Run: OrangeHRM Module`,
            description: summaryResponse.content,
            issuetype: { name: "Bug" }
        }
    };

    console.log("\n⚠️ [DRY RUN MODE] Final Unified Jira Payload:");
    console.log(JSON.stringify(jiraPayload, null, 2));

    return { executionResult: state.executionResult };
}

// 8. Build and Compile the Graph
const workflow = new StateGraph(QAState)
    .addNode("analyst", requirementAnalyst)
    .addNode("engineer", playwrightEngineer)
    .addNode("executor", executionAgent)
    .addNode("vapt", vaptSecurityAgent)
    .addNode("performance", performanceAgent) // <-- Added Performance Node
    .addNode("reporter", jiraReporterAgent)
    .addEdge("__start__", "analyst")
    .addEdge("analyst", "engineer")
    .addEdge("engineer", "executor")
    .addEdge("executor", "vapt")
    .addEdge("vapt", "performance")           // <-- Route Security to Performance
    .addEdge("performance", "reporter")       // <-- Route Performance to Jira
    .addEdge("reporter", END);

const app = workflow.compile();

// 9. Execute the Workflow
async function runExecution() {
    console.log("🚀 Starting Unified DevSecOps Pipeline (UI + Sec + Perf)...\n");
    const userStory = "As an Admin, I want to log into the OrangeHRM demo site (username: Admin, password: admin123) and navigate to the PIM module.";
    await app.invoke({ requirement: userStory });
    console.log("\n✅ Pipeline Complete.");
}

runExecution().catch(console.error);