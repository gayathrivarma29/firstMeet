const Task    = require("../models/tasks");
const Meeting = require("../models/meeting");
const User    = require("../models/user");
const { parseDeadline } = require("../utils/deadlineParser");
const { InferenceClient } = require("@huggingface/inference");

const client = new InferenceClient(process.env.HF_API_KEY);

// ─── Helpers ────────────────────────────────────────────────────────────────

const calculateCompletionRate = (tasks) => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.isCompleted).length;
    return Math.round((completed / tasks.length) * 100);
};

const getRecentDays = (days) => {
    const labels = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(d.toISOString().split("T")[0]);
    }
    return labels;
};

const getRangeStart = (range) => {
    if (!range || range === "all") return null;
    const d = new Date();
    d.setDate(d.getDate() - parseInt(range, 10));
    return d;
};

const getWeekStart = (weeksAgo) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay() - weeksAgo * 7);
    return d;
};

// ─── ADMIN STATS ─────────────────────────────────────────────────────────────

exports.getAdminStats = async (req, res) => {
    try {
        const { range = "all" } = req.query;
        const rangeStart = getRangeStart(range);

        const taskQuery    = rangeStart ? { createdAt: { $gte: rangeStart } } : {};
        const meetingQuery = rangeStart ? { createdAt: { $gte: rangeStart } } : {};

        const allTasks      = await Task.find(taskQuery);
        const meetings      = await Meeting.find(meetingQuery);
        const users         = await User.find({ role: "employee" });
        const totalMeetings = meetings.length;

        // 1. Lifecycle — Created vs Resolved
        const lifecycleDays = range === "7" ? 7 : 14;
        const recentDays    = getRecentDays(lifecycleDays);
        const lifecycle     = recentDays.map(date => ({
            date,
            created:  allTasks.filter(t => t.createdAt.toISOString().split("T")[0] === date).length,
            resolved: allTasks.filter(t => t.isCompleted && t.updatedAt.toISOString().split("T")[0] === date).length,
        }));

        // 2. Pending count
        const pendingCount = allTasks.filter(t => !t.isCompleted).length;

        // 3. Priority distribution
        const priorityDistribution = [
            { name: "HIGH",   value: allTasks.filter(t => t.priority === "HIGH").length },
            { name: "MEDIUM", value: allTasks.filter(t => t.priority === "MEDIUM").length },
            { name: "LOW",    value: allTasks.filter(t => t.priority === "LOW").length },
        ];

        // 4. Member matrix (always full dataset)
        const allTasksFull = rangeStart ? await Task.find() : allTasks;
        const memberMatrix = users.map(user => {
            const userTasks = allTasksFull.filter(t => t.assignedTo === user.userName);
            const completed = userTasks.filter(t => t.isCompleted).length;
            const pending   = userTasks.length - completed;
            return {
                name: user.userName,
                completed,
                pending,
                ratio: userTasks.length > 0 ? Math.round((completed / userTasks.length) * 100) : 0,
            };
        }).sort((a, b) => b.ratio - a.ratio);

        // 5. Real globalFocusScore — % of members hitting ≥70% completion ratio
        const globalFocusScore = memberMatrix.length > 0
            ? Math.round((memberMatrix.filter(m => m.ratio >= 70).length / memberMatrix.length) * 100)
            : 0;

        // 6. Real monthlyGrowth — meetings this month vs last month
        const now            = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const allMeetings    = await Meeting.find();
        const thisMonthCount = allMeetings.filter(m => new Date(m.createdAt) >= thisMonthStart).length;
        const lastMonthCount = allMeetings.filter(m => {
            const d = new Date(m.createdAt);
            return d >= lastMonthStart && d < thisMonthStart;
        }).length;
        const monthlyGrowth = lastMonthCount > 0
            ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)
            : thisMonthCount > 0 ? 100 : 0;

        // 7. Effectiveness Score
        const resolutionRatio    = allTasksFull.length > 0
            ? allTasksFull.filter(t => t.isCompleted).length / allTasksFull.length
            : 0;
        const effectivenessScore = Math.round((resolutionRatio * 70) + (Math.min(allMeetings.length, 100) * 0.3));

        // 8. Meeting frequency by week (last 8 weeks)
        const meetingsByWeek = Array.from({ length: 8 }, (_, i) => {
            const weeksAgo  = 7 - i;
            const weekStart = getWeekStart(weeksAgo);
            const weekEnd   = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);
            return {
                week:  weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                count: allMeetings.filter(m => {
                    const d = new Date(m.createdAt);
                    return d >= weekStart && d < weekEnd;
                }).length,
            };
        });

        // 9. Team Velocity — completed tasks per week, last 8 weeks
        const teamVelocity = Array.from({ length: 8 }, (_, i) => {
            const weeksAgo  = 7 - i;
            const weekStart = getWeekStart(weeksAgo);
            const weekEnd   = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);
            return {
                week:      weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                completed: allTasksFull.filter(t => {
                    if (!t.isCompleted) return false;
                    const d = new Date(t.updatedAt);
                    return d >= weekStart && d < weekEnd;
                }).length,
            };
        });

        // 10. Stale Tasks — open tasks by age (pure createdAt math, no deadline parsing)
        const staleNow   = new Date();
        const staleTasks = allTasksFull.filter(t => !t.isCompleted);
        const ageInDays  = t => (staleNow - new Date(t.createdAt)) / (1000 * 60 * 60 * 24);
        const over7      = staleTasks.filter(t => ageInDays(t) > 7).length;
        const over14     = staleTasks.filter(t => ageInDays(t) > 14).length;
        const over30     = staleTasks.filter(t => ageInDays(t) > 30).length;
        const staleTaskBuckets = [
            { label: ">7 days",  count: over7  - over14 },
            { label: ">14 days", count: over14 - over30 },
            { label: ">30 days", count: over30 },
        ];

        // 11. Action Item Assignee Breakdown — flatten meeting actionItems, cross-ref tasks
        const assigneeCounts = {};
        allMeetings.forEach(meeting => {
            (meeting.actionItems || []).forEach(item => {
                const name = item.assignedTo || "Unassigned";
                if (!assigneeCounts[name]) assigneeCounts[name] = { assigned: 0, completed: 0 };
                assigneeCounts[name].assigned++;
                const match = allTasksFull.find(t => t.title === item.title || t.title === item.task);
                if (match && match.isCompleted) assigneeCounts[name].completed++;
            });
        });
        const actionItemAssignees = Object.entries(assigneeCounts)
            .map(([name, c]) => ({ name, assigned: c.assigned, completed: c.completed }))
            .sort((a, b) => b.assigned - a.assigned)
            .slice(0, 7);

        // 12. Overdue Tasks (fuzzy deadline parser)
        const today          = new Date();
        const urgentTasks    = allTasksFull.filter(t => !t.isCompleted && t.priority === "HIGH").slice(0, 5);
        const overdueTasksList = allTasksFull.filter(t => {
            if (t.isCompleted || !t.deadline) return false;
            const parsed = parseDeadline(t.deadline);
            return parsed && parsed < today;
        }).slice(0, 5);

        res.json({
            kpis: {
                totalMeetings,
                completionRate: calculateCompletionRate(allTasks),
                monthlyGrowth,
                effectivenessScore,
                globalFocusScore,
            },
            charts: {
                lifecycle,
                pendingCount,
                priorityDistribution,
                memberMatrix,
                meetingsByWeek,
                teamVelocity,
                staleTaskBuckets,
                actionItemAssignees,
                workloadBalance:    memberMatrix.slice(0, 5).map(m => ({ name: m.name, pending: m.pending })),
                jiraVsLocal: [
                    { name: "Jira",  value: allTasksFull.filter(t =>  t.jiraId).length },
                    { name: "Local", value: allTasksFull.filter(t => !t.jiraId).length },
                ],
                urgentTasks,
                overdueTasksList,
            },
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching admin stats", error: error.message });
    }
};

// ─── EMPLOYEE STATS ───────────────────────────────────────────────────────────

exports.getEmployeeStats = async (req, res) => {
    try {
        const { userName, range = "all" } = req.query;
        if (!userName) return res.status(400).json({ message: "Username required" });

        const rangeStart = getRangeStart(range);
        const taskQuery  = rangeStart
            ? { assignedTo: userName, createdAt: { $gte: rangeStart } }
            : { assignedTo: userName };

        const myTasks        = await Task.find(taskQuery);
        const allMyTasks     = await Task.find({ assignedTo: userName });
        const completedTasks = myTasks.filter(t => t.isCompleted);
        const myMeetings     = await Meeting.find({ userName });

        // Personal Focus Score: completed this week / assigned this week
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const assignedThisWeek   = allMyTasks.filter(t => new Date(t.createdAt)  >= weekStart).length;
        const completedThisWeek  = allMyTasks.filter(t => t.isCompleted && new Date(t.updatedAt) >= weekStart).length;
        const personalFocusScore = assignedThisWeek > 0
            ? Math.round((completedThisWeek / assignedThisWeek) * 100)
            : completedThisWeek > 0 ? 100 : 0;

        // 1. Productivity by Day
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const productivityByDay = days.map((day, index) => ({
            day,
            count: completedTasks.filter(t => new Date(t.updatedAt).getDay() === index).length,
        }));

        // 2. Efficiency Radar
        const priorityMatrix = [
            { subject: "High Impact",  A: myTasks.filter(t => t.priority === "HIGH").length, fullMark: 10 },
            { subject: "Consistency",  A: new Set(completedTasks.map(t => t.updatedAt.toISOString().split("T")[0])).size, fullMark: 10 },
            { subject: "Speed",        A: myTasks.length > 0 ? Math.round(calculateCompletionRate(myTasks) / 10) : 0, fullMark: 10 },
            { subject: "Volume",       A: completedTasks.length, fullMark: 10 },
            { subject: "Involvement",  A: myMeetings.length, fullMark: 10 },
        ];

        // 3. 7-day Throughput
        const recentDates = getRecentDays(7);
        const throughput  = recentDates.map(date => ({
            date:  date.split("-").slice(1).join("/"),
            count: completedTasks.filter(t => t.updatedAt.toISOString().split("T")[0] === date).length,
        }));

        // 4. Priority Distribution
        const priorityDistribution = [
            { name: "HIGH",   value: myTasks.filter(t => t.priority === "HIGH").length },
            { name: "MEDIUM", value: myTasks.filter(t => t.priority === "MEDIUM").length },
            { name: "LOW",    value: myTasks.filter(t => t.priority === "LOW").length },
        ];

        // 5. Meeting history with notes flag
        const meetingsWithNotes = myMeetings.map(m => ({
            _id:              m._id,
            title:            m.title,
            summary:          m.summary,
            actionItemsCount: (m.actionItems || []).length,
            hasNote:          (m.notes || []).some(n => n.userName === userName && n.content && n.content.trim()),
            createdAt:        m.createdAt,
        }));

        res.json({
            kpis: {
                openTasks:          myTasks.filter(t => !t.isCompleted).length,
                completedRatio:     calculateCompletionRate(myTasks),
                streak:             new Set(completedTasks.map(t => t.updatedAt.toISOString().split("T")[0])).size,
                personalImpact:     Math.round((completedTasks.length * 10) + (myMeetings.length * 5)),
                meetingsAttended:   myMeetings.length,
                personalFocusScore,
                completedThisWeek,
                assignedThisWeek,
            },
            charts: {
                productivityByDay,
                priorityDistribution,
                pendingCount: myTasks.filter(t => !t.isCompleted).length,
                priorityMatrix,
                throughput,
                upcomingDeadlines: myTasks.filter(t => !t.isCompleted && t.deadline).slice(0, 5),
                meetingsWithNotes,
            },
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching employee stats", error: error.message });
    }
};

// ─── AI WEEKLY DIGEST ─────────────────────────────────────────────────────────

exports.getWeeklyDigest = async (req, res) => {
    try {
        const now       = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - 7);

        const weekTasks    = await Task.find({ createdAt: { $gte: weekStart } });
        const weekMeetings = await Meeting.find({ createdAt: { $gte: weekStart } });
        const allOpenTasks = await Task.find({ isCompleted: false });

        const completedThisWeek    = weekTasks.filter(t => t.isCompleted).length;
        const highPriorityOpen     = allOpenTasks.filter(t => t.priority === "HIGH").length;
        const prevWeekStart        = new Date(weekStart);
        prevWeekStart.setDate(prevWeekStart.getDate() - 7);
        const prevWeekMeetingCount = await Meeting.countDocuments({
            createdAt: { $gte: prevWeekStart, $lt: weekStart },
        });
        const meetingTrend = weekMeetings.length > prevWeekMeetingCount ? "increased"
            : weekMeetings.length < prevWeekMeetingCount ? "decreased"
            : "stayed the same";

        const statsText = `This week: ${completedThisWeek} tasks completed, ${weekTasks.length} tasks created, ` +
            `${highPriorityOpen} HIGH priority tasks still open, ${weekMeetings.length} meetings held ` +
            `(${meetingTrend} vs prior week).`;

        const response = await client.chatCompletion({
            model: "Qwen/Qwen2.5-72B-Instruct",
            messages: [
                {
                    role:    "system",
                    content: "You are a concise productivity analyst. Write exactly 3 sentences of plain prose. No bullet points, no markdown, no asterisks, no headers.",
                },
                {
                    role:    "user",
                    content: `Write a weekly team performance digest based on: ${statsText}`,
                },
            ],
            max_tokens: 220,
        });

        res.json({ digest: response.choices[0].message.content });
    } catch (error) {
        res.status(500).json({ message: "Error generating digest", error: error.message });
    }
};
