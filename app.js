document.getElementById("year") &&
  (document.getElementById("year").textContent = new Date().getFullYear());


/* ==========================================
   REAL JOWKARITECH AI CHAT
========================================== */

const CHAT_ENDPOINT =
  "https://jowkari-ai.jowkari-1mh.workers.dev/chat";

const chatLog = document.getElementById("chat-log");
const chatForm = document.getElementById("ai-chat-form");
const chatInput = document.getElementById("ai-chat-input");

let chatHistory = [];
let chatBusy = false;

function addChatBubble(text, who) {
  if (!chatLog) return;

  const div = document.createElement("div");
  div.className = "bubble " + who;
  div.textContent = text;

  chatLog.appendChild(div);

  chatLog.scrollTop = chatLog.scrollHeight;

  return div;
}

async function sendAIMessage(message) {
  const clean = message.trim();

  if (!clean || chatBusy) return;

  chatBusy = true;

  addChatBubble(clean, "user");

  chatHistory.push({
    role: "user",
    content: clean
  });

  if (chatInput) {
    chatInput.value = "";
    chatInput.disabled = true;
  }

  const typing = addChatBubble("Thinking...", "bot");

  try {
    const response = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: clean,
        history: chatHistory.slice(0, -1).slice(-8)
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "AI request failed");
    }

    if (typing) typing.remove();

    const reply =
      data.reply ||
      "Sorry, I couldn't answer that right now.";

    addChatBubble(reply, "bot");

    chatHistory.push({
      role: "assistant",
      content: reply
    });

    chatHistory = chatHistory.slice(-10);

  } catch (error) {
    console.error(error);

    if (typing) typing.remove();

    addChatBubble(
      "Sorry, I'm having trouble connecting right now. You can still use the form below or call/text +1 (778) 266-1454.",
      "bot"
    );
  } finally {
    chatBusy = false;

    if (chatInput) {
      chatInput.disabled = false;
      chatInput.focus();
    }
  }
}

if (chatForm) {
  chatForm.addEventListener("submit", event => {
    event.preventDefault();

    sendAIMessage(chatInput.value);
  });
}

document.querySelectorAll("[data-chat-prompt]").forEach(button => {
  button.addEventListener("click", () => {
    sendAIMessage(button.dataset.chatPrompt);
  });
});


/* ==========================================
   REAL WEB3FORMS LEAD FORM
========================================== */

const form = document.getElementById("lead-form");

if (form) {
  const result = document.createElement("div");

  result.className = "form-status";
  result.setAttribute("aria-live", "polite");

  form.appendChild(result);

  const botcheck = document.createElement("input");

  botcheck.type = "checkbox";
  botcheck.name = "botcheck";
  botcheck.style.display = "none";
  botcheck.tabIndex = -1;

  form.appendChild(botcheck);

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const submitButton =
      form.querySelector('button[type="submit"]');

    submitButton.disabled = true;
    submitButton.textContent = "Sending...";

    result.className = "form-status";
    result.textContent = "";

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    data.access_key =
      "67b05f47-421b-41f8-837e-c8a12741dc9c";

    data.subject =
      "New JowkariTech AI Receptionist Lead";

    data.from_name =
      "JowkariTech Website";

    try {
      const response = await fetch(
        "https://api.web3forms.com/submit",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(data)
        }
      );

      const json = await response.json();

      if (response.ok && json.success) {
        result.className =
          "form-status success";

        result.innerHTML =
          "<strong>Thanks!</strong> Your message was sent. We'll contact you shortly.";

        form.reset();

      } else {
        throw new Error(
          json.message || "Submission failed"
        );
      }

    } catch (error) {
      console.error(error);

      result.className =
        "form-status error";

      result.textContent =
        "Something went wrong. Please call or text us at +1 (778) 266-1454.";

    } finally {
      submitButton.disabled = false;

      submitButton.textContent =
        "Send my business details →";
    }
  });
}
