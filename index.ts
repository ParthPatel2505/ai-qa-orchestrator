import { StateGraph, END, Annotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const llm = new ChatGoogleGenerativeAI({
    model: "gemini-3.1-flash-lite",
    temperature: 0.2
});

async function safeInvoke(prompt: string) {
    let attempts = 0;
    while (attempts < 5) {
        try {
            return await llm.invoke(prompt);
        } catch (error: any) {
            if (error.status === 429 || (error.message && error.message.includes('429'))) {
                console.log(`      ⚠️ Google API Speed Limit (429). Retrying in 20s...`);
                await sleep(20000);
                attempts++;
            } else {
                throw error;
            }
        }
    }
    throw new Error("❌ AI API blocked after 5 retries.");
}

// ==========================================
// STATE DEFINITION
// ==========================================
const QAState = Annotation.Root({
    testId: Annotation<string>(),
    requirement: Annotation<string>(),
    targetUrl: Annotation<string>(),
    testFilePath: Annotation<string>(),
    aiDirectives: Annotation<string>(),
    runUI: Annotation<boolean>(),
    runVAPT: Annotation<boolean>(),
    runPerformance: Annotation<boolean>(),
    createJiraTicket: Annotation<boolean>(),
    hasExecutionError: Annotation<boolean>(),
    testPlan: Annotation<string>(),
    playwrightCode: Annotation<string>(),
    executionResult: Annotation<string>(),
});

// ==========================================
// AGENTS
// ==========================================
async function requirementAnalyst(state: typeof QAState.State) {
    console.log(`-> [Analyst] Building Plan: ${state.testId}...`);
    const prompt = `Analyze this user story: ${state.requirement}. Mandatory Directives: ${state.aiDirectives}. Output a test plan for UI, Security, and Performance.`;
    const response = await safeInvoke(prompt);
    return { testPlan: response.content as string };
}

async function playwrightEngineer(state: typeof QAState.State) {
    await sleep(2000);
    console.log(`-> [Engineer] Writing Tagged Code: ${state.testId}...`);
    const prompt = `Write a Playwright JS script. 
  1. const { test, expect } = require('@playwright/test');
  2. Write 3 blocks: test('UI @UI'), test('Security @VAPT'), test('Performance @Performance').
  3. URL: ${state.targetUrl}.
  4. Output raw JS ONLY. No markdown. Plan: ${state.testPlan}`;
    const response = await safeInvoke(prompt);
    return { playwrightCode: response.content as string };
}

async function codeSaver(state: typeof QAState.State) {
    const dir = path.dirname(state.testFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(state.testFilePath, state.playwrightCode);
    return {};
}

async function executionAgent(state: typeof QAState.State) {
    let tags: string[] = [];
    if (state.runUI) tags.push("@UI");
    if (state.runVAPT) tags.push("@VAPT");
    if (state.runPerformance) tags.push("@Performance");

    if (tags.length === 0) return { executionResult: "⚠️ No flags set.", hasExecutionError: false };

    const grepPattern = tags.join("|");
    const safePath = state.testFilePath.replace(/\\/g, '/');
    console.log(`-> [Executor] Testing ${state.testId} sections: ${tags.join(", ")}`);

    try {
        const { stdout } = await execPromise(`npx playwright test "${safePath}" --grep "${grepPattern}" --headed`);
        return { executionResult: stdout, hasExecutionError: false };
    } catch (error: any) {
        return { executionResult: error.stdout || error.message, hasExecutionError: true };
    }
}

async function jiraReporterAgent(state: typeof QAState.State) {
    if (!state.createJiraTicket || !state.hasExecutionError) return {};

    await sleep(2000);
    console.log("-> [Jira] Reporting Bug...");
    const prompt = `Create a Jira bug report from these logs: ${state.executionResult}`;
    const response = await safeInvoke(prompt);
    console.log("\n⚠️ [JIRA BUG]:\n", response.content);
    return {};
}

async function reportWriterAgent(state: typeof QAState.State) {
    console.log(`-> [Report] Writing local Audit file...`);
    const prompt = `Summarize these logs into: What Happened, Error, and Test Result (Pass/Fail). Logs: ${state.executionResult}`;
    const analysis = await safeInvoke(prompt);

    const reportPath = state.testFilePath.replace('tests', 'reports').replace('.spec.js', '.md');
    const dir = path.dirname(reportPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const content = `# Report: ${state.testId}\n\n${analysis.content}\n\n---\n*Time: ${new Date().toLocaleString()}*`;
    fs.writeFileSync(reportPath, content);
    return {};
}

// ==========================================
// WORKFLOWS
// ==========================================
const generationWorkflow = new StateGraph(QAState)
    .addNode("analyst", requirementAnalyst)
    .addNode("engineer", playwrightEngineer)
    .addNode("saver", codeSaver)
    .addEdge("__start__", "analyst")
    .addEdge("analyst", "engineer")
    .addEdge("engineer", "saver")
    .addEdge("saver", END).compile();

const executionWorkflow = new StateGraph(QAState)
    .addNode("executor", executionAgent)
    .addNode("jira", jiraReporterAgent)
    .addNode("report", reportWriterAgent)
    .addEdge("__start__", "executor")
    .addEdge("executor", "jira")
    .addEdge("jira", "report")
    .addEdge("report", END).compile();

// ==========================================
// ROUTER
// ==========================================
function getAllTestRequirements(dirPath: string, arrayOfFiles: any[] = []) {
    if (!fs.existsSync(dirPath)) return arrayOfFiles;
    fs.readdirSync(dirPath).forEach(file => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) arrayOfFiles = getAllTestRequirements(fullPath, arrayOfFiles);
        else if (file.endsWith('.json')) {
            const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
            arrayOfFiles = arrayOfFiles.concat(parsed.map((req: any) => ({ ...req, sourcePath: fullPath })));
        }
    });
    return arrayOfFiles;
}

async function runEngine() {
    const [mode, targetFile] = [process.argv[2], process.argv[3]];
    let allRequirements = targetFile ? JSON.parse(fs.readFileSync(path.resolve(targetFile), 'utf-8')).map((r: any) => ({ ...r, sourcePath: path.resolve(targetFile) })) : getAllTestRequirements(path.join(__dirname, 'requirements'));

    for (const req of allRequirements) {
        const relativePath = path.relative(path.join(__dirname, 'requirements'), req.sourcePath);
        const testFilePath = path.join(__dirname, 'tests', path.dirname(relativePath), path.basename(relativePath, '.json'), `${req.id}.spec.js`);

        const initialState = {
            testId: req.id, requirement: req.story, targetUrl: req.targetUrl,
            testFilePath, aiDirectives: JSON.stringify(req.aiDirectives || {}),
            runUI: req.executionFlags?.runUI !== false,
            runVAPT: req.executionFlags?.runVAPT !== false,
            runPerformance: req.executionFlags?.runPerformance !== false,
            createJiraTicket: req.executionFlags?.createJiraTicket !== false,
            hasExecutionError: false
        };

        if (mode === '--generate') {
            if (fs.existsSync(testFilePath)) { console.log(`⏭️ Skipping ${req.id}`); continue; }
            await generationWorkflow.invoke(initialState);
        } else if (mode === '--execute') {
            await executionWorkflow.invoke(initialState);
        }
        await sleep(5000);
    }
}
runEngine().catch(console.error);