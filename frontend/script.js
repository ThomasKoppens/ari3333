// Commonly used inputs and variables so made global
let prompt_input;
let send_prompt;
let allow_prompt_enter = false;

/**
 * Determines whether the user may submit a prompt.
 */
function setInputsEnabled(enabled) {
    if (prompt_input && send_prompt) {
        allow_prompt_enter = enabled;
        send_prompt.disabled = !enabled;
    }
}

function start() {
    const container = document.querySelector(".container");
    setInputsEnabled(false);

    create_skeleton();

    fetch('http://127.0.0.1:5000/api/start', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
    })
    .then(response => response.json())
    .then(data => {
        const skeletons = container.querySelectorAll("sl-skeleton");
        skeletons.forEach(skeleton => skeleton.remove());
        
        // If somehow deepseek said something bad
        if (!is_clean(data.output + data.thoughts)) {
            create_response("Deepseek is encountering some trouble, please try again.");
            return;
        }

        create_thoughts(data.thoughts);
        create_response(data.output);
    })
    .catch(error => console.error('Error:', error))
    .finally(() => setInputsEnabled(true));  // Ensure re-enabling even on failure
}

window.onload = function () {
    prompt_input = document.getElementById('prompt');
    send_prompt = document.getElementById('send-prompt');

    start();

    // Handle "Enter" key event
    prompt_input.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey) { 
            if (!allow_prompt_enter) {
                event.preventDefault();
                return;
            }
            event.preventDefault();
            send_prompt.click();
            prompt_input.value = ""; // Clear input
        }
    });
};

/**
 * This function is responsible for the process of sending and receiving a prompt and response.
 * The prompt inputs are disabled and the prompt is sent to deepseek for response generation.
 * That response is then displayed in the chat container and prompt inputs are re-enabled.
 */
async function fetchData() {
    // Ensure valid prompt
    let prompt_text = prompt_input.value.trim();
    if (!prompt_text) return;

    const clean = await is_clean(prompt_text);
    console.log(clean);
    if (!clean) {
        alert("Please ensure that your prompt is appropriate.");
        return;
    }

    // Disable inputs while generating response
    setInputsEnabled(false);

    // Add user chat bubble
    const userBubble = document.createElement("div");
    const container = document.querySelector(".container");
    userBubble.classList.add("user");
    userBubble.innerText = prompt_text;
    container.appendChild(userBubble);

    create_skeleton();

    // Get response
    fetch('http://127.0.0.1:5000/api/question', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: prompt_text })
    })
    .then(response => response.json())
    .then(data => {
        // Create the response html
        const skeletons = container.querySelectorAll("sl-skeleton");
        skeletons.forEach(skeleton => skeleton.remove());

        // If somehow deepseek said something bad
        if (!is_clean(data.output.concat(data.thoughts))) {
            create_response("Deepseek is encountering some trouble, please try again.");
            return;
        }
        create_thoughts(data.thoughts);
        create_response(data.output);
    })
    .catch(error => console.error('Error:', error))
    .finally(() => setInputsEnabled(true)); // Re-enable inputs
}

function create_skeleton() {
    const container = document.querySelector(".container");
    const skeleton_div = document.createElement("div");
    skeleton_div.style.display = "flex";
    skeleton_div.style.flexDirection = "column";
    skeleton_div.id = "skeletons";

    // Create the img element for the logo
    const logo = document.createElement("img");
    logo.setAttribute("src", "assets/deepseek-color.svg");
    logo.setAttribute("alt", "Logo");
    logo.classList.add("thoughts-logo");
    skeleton_div.appendChild(logo);

    for (let i = 0; i < 4; i++) {
        const skeleton = document.createElement("sl-skeleton");
        skeleton.setAttribute("effect", "sheen");

        // Set random width for each skeleton
        const randomWidth = Math.floor(50 + Math.random() * 50); // Random width between 50 and 100
        skeleton.style.width = `${randomWidth}%`;

        skeleton_div.appendChild(skeleton);
    }
    
    container.appendChild(skeleton_div);
}


/**
 * Responsible for creating the HTML for the thought dropdown and text.
 */
function create_thoughts(thoughts) {
    if (!thoughts) thoughts = "No thoughts were generated.";

    const container = document.querySelector(".container");

    // Create the thoughts container
    const thoughtsContainer = document.createElement("div");
    thoughtsContainer.classList.add("thoughts-container");

    // Create the img element for the logo
    const logo = document.createElement("img");
    logo.setAttribute("src", "assets/deepseek-color.svg");
    logo.setAttribute("alt", "Logo");
    logo.classList.add("thoughts-logo");

    // Create the thoughts element
    const thoughtsElement = document.createElement("sl-details");
    thoughtsElement.setAttribute("summary", "Thought Process");
    thoughtsElement.classList.add("thoughts");
    thoughtsElement.innerHTML = thoughts;

    // Position the logo outside the left boundary
    thoughtsContainer.appendChild(logo);

    // Append the thoughts element to the thoughts container
    thoughtsContainer.appendChild(thoughtsElement);

    // Append the thoughts container to the main container
    container.appendChild(thoughtsContainer);
    
    
}

/**
 * Responsible for creating the HTML for the response text.
 */
function create_response(output) {
    const container = document.querySelector(".container");

    const response_div = document.createElement("div");
    response_div.classList.add("response-div");

    const deepseek_response = document.createElement("p");
    deepseek_response.classList.add("deepseek-text");
    deepseek_response.innerHTML = output;

    // Create feedback button with icon and text
    const feedback_button = document.createElement("sl-button");
    feedback_button.classList.add("feedback-button");
    const edit_icon = document.createElement("sl-icon");
    edit_icon.setAttribute("name", "pencil-square");
    feedback_button.appendChild(edit_icon);
    feedback_button.append(" Try Again");

    // Create the dialog
    const dialog = document.createElement("sl-dialog");
    dialog.setAttribute("label", "Feedback Options");
    dialog.classList.add("feedback-dialog");

    // Feedback checkboxes
    const feedback_options = [
        { value: "The user felt like your response was irrelevant. Try again.", label: "The response was irrelevant" },
        { value: "The user did not like the direction you took in your response. Try again.", label: "I don't like the direction the story is heading" },
        { value: "The user felt that the story was not cohesive. Make sure that the story progresses fluidly and comes to a logical conclusion, try again.", label: "The story is not cohesive" },
        { value: "The user thought the story was too boring, try again and make it more interesting.", label: "The story is too boring" },
        { value: "The user felt like the story was not surprising enough, and could already see where the story was going from an early stage. Try again and subvert expectations tastefully.", label: "The story is too predictable" },
        { value: "The story is too short, try again and make it longer.", label: "The story is too short" },
        { value: "The content you generated is highly inappropriate. Please try again.", label: "The content is inappropriate" },
    ];

    const checkbox_container = document.createElement("div");
    checkbox_container.classList.add("checkbox-container");

    feedback_options.forEach(option => {
        const checkbox = document.createElement("sl-checkbox");
        checkbox.value = option.value;
        checkbox.innerText = option.label;
        checkbox_container.appendChild(checkbox);
    });

    // Create Cancel and Submit buttons
    const buttons_div = document.createElement("div");
    buttons_div.classList.add("buttons-div");

    const cancel_button = document.createElement("sl-button");
    cancel_button.setAttribute("variant", "default");
    cancel_button.textContent = "Cancel";
    cancel_button.addEventListener("click", () => {
        dialog.hide();
    });

    const submit_button = document.createElement("sl-button");
    submit_button.setAttribute("variant", "primary");
    submit_button.textContent = "Submit";
    submit_button.addEventListener("click", () => {
        const selected_feedback = [...checkbox_container.querySelectorAll("sl-checkbox")]
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value);

        send_feedback(selected_feedback);
        dialog.hide();
    });

    // Append elements
    buttons_div.appendChild(cancel_button);
    buttons_div.appendChild(submit_button);
    dialog.appendChild(checkbox_container);
    dialog.appendChild(buttons_div);

    // Show dialog when the feedback button is clicked
    feedback_button.addEventListener("click", () => {
        dialog.show();
    });

    response_div.appendChild(deepseek_response);
    response_div.appendChild(feedback_button);
    container.appendChild(response_div);
    container.appendChild(dialog);
}



function send_feedback(feedback_messages) {
    const container = document.querySelector(".container");
    // Disable inputs while generating response
    setInputsEnabled(false);

    create_skeleton();

    // Get response
    fetch('http://127.0.0.1:5000/api/feedback', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ feedback_messages: feedback_messages })
    })
    .then(response => response.json())
    .then(data => {
        // Create the response html
        const skeletons = container.querySelectorAll("sl-skeleton");
        skeletons.forEach(skeleton => skeleton.remove());
        create_thoughts(data.thoughts);
        create_response(data.output);
    })
    .catch(error => console.error('Error:', error))
    .finally(() => setInputsEnabled(true)); // Re-enable inputs
}

/**
 * Ensures there is no inappropriate content.
 */
async function is_clean(text) {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/geoip', {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text })
        });

        const data = await response.json();
        console.log(data);
        return data.data.isSafe;
    } catch (err) {
        console.error(err);
        return true;  // The error is likely due to max free limit reached, so assume it's clean
    }
}
