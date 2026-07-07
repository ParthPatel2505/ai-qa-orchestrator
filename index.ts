import { StateGraph, END, Annotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import * as fs from "fs";
import { exec } from "child_process";
import util from "util";
// Helper function to pause execution
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const execPromise = util.promisify(exec);

const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0.2
});

// 1. Define the Shared State (Added securityReport)
const QAState = Annotation.Root({
    requirement: Annotation<string>(),
    testPlan: Annotation<string>(),
    playwrightCode: Annotation<string>(),
    executionResult: Annotation<string>(),
    securityReport: Annotation<string>(), // <-- New Data Pipeline
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
    console.log("-> [Agent 2] Generating Playwright JavaScript Code...");
    const prompt = `You are an expert Automation Tester. Based on this test plan, write a single Playwright test script in JavaScript for OrangeHRM. Use resilient locators (page.getByRole, page.getByPlaceholder). Do not include markdown blocks, just the raw code. Test Plan: ${state.testPlan}`;
    const response = await llm.invoke(prompt);
    return { playwrightCode: response.content as string };
}

// 4. Node: Playwright Executor
async function executionAgent(state: typeof QAState.State) {
    console.log("-> [Agent 3] Launching Playwright Browser...");
    const fileName = 'orangehrm-ai-test.spec.js';
    fs.writeFileSync(fileName, state.playwrightCode);
    try {
        const { stdout } = await execPromise(`npx playwright test ${fileName} --headed`);
        return { executionResult: stdout };
    } catch (error: any) {
        return { executionResult: error.stdout || error.message };
    }
}

// 5. Node: VAPT Security Agent (The New Addition!)
async function vaptSecurityAgent(state: typeof QAState.State) {
    console.log("-> [Agent 5] Running Non-Destructive VAPT Baseline Scan...");
    const targetUrl = "https://opensource-demo.orangehrmlive.com/web/index.php/auth/login";

    try {
        // Ping the server to extract its raw security configuration
        const response = await fetch(targetUrl);
        const headers = Object.fromEntries(response.headers.entries());

        // Ask the AI to act as a Penetration Tester to analyze the exposed headers
        const prompt = `
            You are a Senior Security Engineer. Analyze these HTTP headers from our target staging environment.
            Identify any missing standard security headers (e.g., missing Strict-Transport-Security, X-Frame-Options, Content-Security-Policy).
            Provide a brief, 3-bullet-point summary of the vulnerabilities found.
            Target Headers: ${JSON.stringify(headers)}
        `;
        const securityAnalysis = await llm.invoke(prompt);
        return { securityReport: securityAnalysis.content as string };
    } catch (error) {
        return { securityReport: "⚠️ VAPT Scan Failed to reach target URL." };
    }
}

// 6. Node: Jira Reporter Agent (Now includes VAPT data)
async function jiraReporterAgent(state: typeof QAState.State) {
    console.log("-> [Agent 4] Preparing Jira Ticket with QA and Security Data...");

    // The AI summarizes BOTH functional test results AND security vulnerabilities
    const prompt = `
      You are a QA Reporter. Summarize this functional test execution and the security vulnerabilities into a clean, 2-paragraph Jira bug description.
      Functional Execution Logs: ${state.executionResult}
      Security VAPT Report: ${state.securityReport}
    `;
    const summaryResponse = await llm.invoke(prompt);

    const jiraPayload = {
        fields: {
            project: { key: process.env.JIRA_PROJECT_KEY || "QA" },
            summary: `Automated Run & Security Scan: OrangeHRM Module`,
            description: summaryResponse.content,
            issuetype: { name: "Bug" }
        }
    };


    console.log("\n⚠️ [DRY RUN MODE] Jira Payload generated:");
    console.log(JSON.stringify(jiraPayload, null, 2));

    return { executionResult: state.executionResult };
}

// 7. Build and Compile the Graph
const workflow = new StateGraph(QAState)
    .addNode("analyst", requirementAnalyst)
    .addNode("engineer", playwrightEngineer)
    .addNode("executor", executionAgent)
    .addNode("vapt", vaptSecurityAgent)       // <-- Added VAPT Node
    .addNode("reporter", jiraReporterAgent)
    .addEdge("__start__", "analyst")
    .addEdge("analyst", "engineer")
    .addEdge("engineer", "executor")
    .addEdge("executor", "vapt")              // <-- Route UI tests to Security Scanner
    .addEdge("vapt", "reporter")              // <-- Route Security Report to Jira
    .addEdge("reporter", END);

const app = workflow.compile();

// 8. Execute the Workflow
async function runExecution() {
    console.log("🚀 Starting Autonomous DevSecOps Pipeline...\n");
    const userStory = "As an Admin, I want to log into the OrangeHRM demo site (username: Admin, password: admin123) and navigate to the PIM module.";
    await app.invoke({ requirement: userStory });
    console.log("\n✅ Pipeline Complete. Check the Jira payload above for the security vulnerabilities found!");
}

runExecution().catch(console.error);