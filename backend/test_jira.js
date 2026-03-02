require("dotenv").config();
const axios = require('axios');

async function testJira() {
    console.log("Testing Jira Integration...");

    const jiraBaseUrl = process.env.JIRA_BASE_URL;
    const email = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;
    const projectKey = process.env.JIRA_PROJECT_KEY;

    if (!jiraBaseUrl || !email || !apiToken || !projectKey) {
        console.error("Missing environment variables. Check .env file.");
        return;
    }

    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    const jiraData = {
        fields: {
            project: {
                key: projectKey
            },
            summary: "Test Issue from MeetUp App Integration",
            description: {
                type: "doc",
                version: 1,
                content: [
                    {
                        type: "paragraph",
                        content: [
                            {
                                type: "text",
                                text: "If you see this, the integration is working correctly."
                            }
                        ]
                    }
                ]
            },
            issuetype: {
                name: "Task"
            }
        }
    };

    try {
        const response = await axios.post(`${jiraBaseUrl}/rest/api/3/issue`, jiraData, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        console.log("Success! Jira Issue Created:", response.data.key);
    } catch (error) {
        console.error("Jira Integration Error:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    }
}

testJira();
