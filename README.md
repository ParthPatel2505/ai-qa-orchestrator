# 🤖 DevSecOps AI QA Orchestrator

Welcome to the AI-driven QA automation framework. This tool allows us to write plain-English user stories and automatically generates Playwright UI tests, runs passive security (VAPT) scans, and logs performance metrics.

## 📋 Prerequisites
Before you start, ensure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (v20 or higher)
* Git
* VS Code (Recommended)

## 🚀 Installation & Setup

**1. Clone the repository**
Open your terminal and run:
\`\`\`bash
git clone https://github.com/your-org/ai-qa-orchestrator.git
cd ai-qa-orchestrator
\`\`\`

**2. Install dependencies**
Install the required packages and Playwright browsers:
\`\`\`bash
npm ci
npx playwright install --with-deps chromium
\`\`\`

**3. Configure your Environment Variables**
Create a new file named `.env` in the root folder. **Never commit this file to Git.** Ask your QA Lead for the current API keys and add them here:
\`\`\`text
GOOGLE_API_KEY=your-provided-google-key
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_USER_EMAIL=your.email@company.com
JIRA_API_TOKEN=pending-token-from-admin
JIRA_PROJECT_KEY=QA
\`\`\`

---

## 🧪 How to Add Tests (No Coding Required!)

To assign the AI a new test, you do not need to write complex Playwright JavaScript. Simply open the `test-requirements.json` file and add your assigned user story for the specific module (e.g., IFS ERP Supply Chain, OrangeHRM).

**Example `test-requirements.json` entry:**
\`\`\`json
[
  {
    "module": "IFS ERP - Supply Chain Inventory",
    "targetUrl": "https://your-ifs-staging-environment.com/",
    "story": "As an SCM Consultant, I want to log into the supply chain dashboard and verify the Active Inventory table is loaded and visible."
  }
]
\`\`\`

---

## ▶️ Running the Pipeline

Once your requirements are saved in the JSON file, execute the orchestrator locally:
\`\`\`bash
npm run start:ai
\`\`\`

**What happens next?**
1.  **AI Code Generation:** The AI Analyst reads your English requirement and the AI Engineer writes the Playwright script natively.
2.  **Execution:** A browser will launch and run the functional UI test.
3.  **VAPT & Performance:** The system will passively scan the target URL for security header vulnerabilities and measure page load times against our SLAs.
4.  **Jira Payload:** A unified DevSecOps report will be printed in your terminal (and pushed directly to Jira when the live token is active).

---

## 🌳 Pushing Your Work
When you have successfully tested your assigned domain locally, do not push directly to the main branch. 
1. Create a new branch: `git checkout -b feature/your-module-name`
2. Commit your updated JSON file: `git commit -am "test: added requirements for [Module Name]"`
3. Push and open a Pull Request. 

Our GitHub Actions CI/CD pipeline will automatically run the AI suite in the cloud to validate your requirements before merging!