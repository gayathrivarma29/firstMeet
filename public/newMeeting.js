
function onSubmit() {

    const fileInput = document.getElementById("WordDoc");
    const file = fileInput.files[0];
    const divSummary = document.getElementById("summary");
    const prompt = `
    You are a professional meeting analysis assistant. Don't add any asterisks or bolding throughout the response.

    I will provide a meeting transcript below.

    Your task is to analyze the transcript and respond in EXACTLY TWO sections using the markers [[SUMMARY]] and [[ACTION_ITEMS]].
    
    Do NOT include action items in the Summary section.

    [[SUMMARY]]
    Provide a clear, well-structured summary of the meeting.
    The summary must:
    - Clearly mention key discussion points.
    - Specify who said what (attribute statements to speakers where possible).
    - Highlight important decisions made.
    - State the final conclusion or outcome of the meeting.
    - Be written in professional, concise language.
    - Use bullet points where appropriate.
    
    [[ACTION_ITEMS]]
    List all final action items mentioned in the meeting.

    For EACH action item, include:
    - Task: What needs to be done
    - Assigned To: Who is responsible
    - Assigned By: Who assigned the task (if mentioned)
    - Deadline: Deadline (if mentioned; otherwise write "Not specified")

    Only include confirmed action items — do NOT include suggestions that were not finalized.

    Format each action item clearly and separately.
    `;

    if (!file) {
        alert("Please Upload a Word File");
        return;
    }

    divSummary.innerText = "Reading Doc";

    document.getElementById("resultSection").style.display = "block";


    const formData = new FormData();
    formData.append("file", file);
    formData.append("prompt", prompt);

    fetch("/ask", {
        method: "POST",
        body: formData
    })

        .then(async res => {
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || "Server Error");
            }
            return res.text();
        })
        .then(data => {

            console.log(data);

            const summaryMarker = "[[SUMMARY]]";
            const actionMarker = "[[ACTION_ITEMS]]";

            const summaryIndex = data.indexOf(summaryMarker);
            const actionIndex = data.indexOf(actionMarker);

            let summaryText = "";
            let actionText = "";

            if (summaryIndex !== -1 && actionIndex !== -1) {
                if (summaryIndex < actionIndex) {
                    summaryText = data.substring(summaryIndex + summaryMarker.length, actionIndex).trim();
                    actionText = data.substring(actionIndex + actionMarker.length).trim();
                } else {
                    actionText = data.substring(actionIndex + actionMarker.length, summaryIndex).trim();
                    summaryText = data.substring(summaryIndex + summaryMarker.length).trim();
                }
            } else {
                const parts = data.split(/ACTION ITEMS|\[\[ACTION_ITEMS\]\]/i);
                summaryText = (parts[0] || "").replace(/\[\[SUMMARY\]\]|SECTION 1: SUMMARY/gi, "").trim();
                actionText = (parts[1] || "").trim();
            }

            document.getElementById("summary").innerText = summaryText;

            // Parse and render action items
            const actionListDiv = document.getElementById("actionList");
            actionListDiv.innerHTML = ""; // Clear previous content

            // Basic parsing strategy: Split by "Task:" keyword which marks the start of a new item
            // Note: This relies on the model following the prompt instructions.
            const rawItems = actionText.split(/Task:/i).filter(item => item.trim().length > 0);

            if (rawItems.length === 0) {
                // Fallback if formatting failed
                actionListDiv.innerText = actionText;
            } else {
                rawItems.forEach(itemText => {
                    const card = document.createElement("div");
                    card.className = "action-card";

                    // LEFT SIDE (Text)
                    const textDiv = document.createElement("div");
                    textDiv.className = "action-text";
                    textDiv.innerHTML = `<strong>Task:</strong> ${itemText.trim().replace(/\n/g, "<br>")}`;

                    // RIGHT SIDE (Buttons)
                    const btnDiv = document.createElement("div");
                    btnDiv.className = "action-buttons";

                    btnDiv.innerHTML = `
                        <button class="edit-btn">Edit</button>
                        <button class="assign-btn">Assign</button>
                        <button class="delete-btn">Delete</button>
                    `;

                    // Append left & right
                    card.appendChild(textDiv);
                    card.appendChild(btnDiv);

                    actionListDiv.appendChild(card);

                });
            }

        })

        .catch(function (error) {
            console.error(error);
            divSummary.innerText = error.message || "Something went wrong";
        }
        )

}