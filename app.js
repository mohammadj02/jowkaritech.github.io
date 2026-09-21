document.getElementById("year") &&
  (document.getElementById("year").textContent =
    new Date().getFullYear());


/* =========================================
   JOWKARITECH PREMIUM AI CHAT
========================================= */

const CHAT_ENDPOINT =
  "https://jowkari-ai.jowkari-1mh.workers.dev/chat";

const chatLog =
  document.getElementById("chat-log");

const chatForm =
  document.getElementById("ai-chat-form");

const chatInput =
  document.getElementById("ai-chat-input");

const suggestions =
  document.getElementById("chat-suggestions");

const newChatButton =
  document.getElementById("new-chat-button");

let chatHistory = [];
let chatBusy = false;


const welcomeMessage =
  "Hi! I'm the JowkariTech AI assistant. Tell me what kind of business you run and I'll explain how an AI receptionist could help you.";


function scrollChat() {
  if (!chatLog) return;

  requestAnimationFrame(() => {
    chatLog.scrollTo({
      top: chatLog.scrollHeight,
      behavior: "smooth"
    });
  });
}


function createMessage(text, who) {
  const row =
    document.createElement("div");

  row.className =
    `message-row ${
      who === "user"
        ? "user-message"
        : "bot-message"
    }`;


  const avatar =
    document.createElement("div");

  avatar.className =
    "message-avatar " +
    (who === "user"
      ? "user-avatar"
      : "ai-avatar");

  avatar.textContent =
    who === "user" ? "You" : "AI";


  const content =
    document.createElement("div");

  content.className =
    "message-content";


  const name =
    document.createElement("div");

  name.className =
    "message-name";

  name.textContent =
    who === "user"
      ? "You"
      : "JowkariTech AI";


  const bubble =
    document.createElement("div");

  bubble.className =
    "message-bubble";

  bubble.textContent = text;


  content.appendChild(name);
  content.appendChild(bubble);

  row.appendChild(avatar);
  row.appendChild(content);

  chatLog.appendChild(row);

  scrollChat();

  return row;
}


function createTypingIndicator() {

  const row =
    document.createElement("div");

  row.className =
    "message-row bot-message typing-row";


  row.innerHTML = `
    <div class="message-avatar ai-avatar">
      AI
    </div>

    <div class="message-content">

      <div class="message-name">
        JowkariTech AI
      </div>

      <div class="message-bubble typing-bubble">
        <span></span>
        <span></span>
        <span></span>
      </div>

    </div>
  `;

  chatLog.appendChild(row);

  scrollChat();

  return row;
}


async function sendAIMessage(message) {

  const clean =
    message.trim();

  if (!clean || chatBusy)
    return;


  chatBusy = true;

  suggestions?.classList.add(
    "suggestions-hidden"
  );


  createMessage(
    clean,
    "user"
  );


  chatHistory.push({
    role: "user",
    content: clean
  });


  chatInput.value = "";
  chatInput.disabled = true;


  const typing =
    createTypingIndicator();


  try {

    const response =
      await fetch(
        CHAT_ENDPOINT,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            message: clean,

            history:
              chatHistory
                .slice(0, -1)
                .slice(-8)
          })
        }
      );


    const data =
      await response.json();


    if (!response.ok) {
      throw new Error(
        data.error ||
        "AI request failed"
      );
    }


    typing.remove();


    const reply =
      data.reply ||
      "Sorry, I couldn't answer that right now.";


    createMessage(
      reply,
      "assistant"
    );


    chatHistory.push({
      role: "assistant",
      content: reply
    });


    chatHistory =
      chatHistory.slice(-10);

  }

  catch (error) {

    console.error(error);

    typing.remove();


    createMessage(
      "I'm having trouble connecting right now. You can still use the contact form below or call/text +1 (778) 266-1454.",
      "assistant"
    );

  }

  finally {

    chatBusy = false;

    chatInput.disabled = false;
    chatInput.focus();

  }
}


chatForm?.addEventListener(
  "submit",
  event => {

    event.preventDefault();

    sendAIMessage(
      chatInput.value
    );

  }
);


document
  .querySelectorAll(
    "[data-chat-prompt]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        sendAIMessage(
          button.dataset.chatPrompt
        );

      }
    );

  });


newChatButton?.addEventListener(
  "click",
  () => {

    chatHistory = [];

    chatLog.innerHTML = "";

    createMessage(
      welcomeMessage,
      "assistant"
    );

    suggestions?.classList.remove(
      "suggestions-hidden"
    );

    chatInput.value = "";

    chatInput.focus();

  }
);



/* =========================================
   WEB3FORMS LEAD FORM
========================================= */

const form =
  document.getElementById(
    "lead-form"
  );


if (form) {

  const result =
    document.createElement(
      "div"
    );


  result.className =
    "form-status";


  result.setAttribute(
    "aria-live",
    "polite"
  );


  form.appendChild(result);


  const botcheck =
    document.createElement(
      "input"
    );


  botcheck.type =
    "checkbox";

  botcheck.name =
    "botcheck";

  botcheck.style.display =
    "none";

  botcheck.tabIndex =
    -1;


  form.appendChild(
    botcheck
  );


  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const submitButton =
        form.querySelector(
          'button[type="submit"]'
        );


      submitButton.disabled =
        true;


      submitButton.textContent =
        "Sending...";


      result.className =
        "form-status";


      result.textContent =
        "";


      const formData =
        new FormData(form);


      const data =
        Object.fromEntries(
          formData.entries()
        );


      data.access_key =
        "67b05f47-421b-41f8-837e-c8a12741dc9c";


      data.subject =
        "New JowkariTech AI Receptionist Lead";


      data.from_name =
        "JowkariTech Website";


      try {

        const response =
          await fetch(
            "https://api.web3forms.com/submit",
            {

              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Accept:
                  "application/json"
              },

              body:
                JSON.stringify(
                  data
                )
            }
          );


        const json =
          await response.json();


        if (
          response.ok &&
          json.success
        ) {

          result.className =
            "form-status success";


          result.innerHTML =
            "<strong>Thanks!</strong> Your message was sent. We'll contact you shortly.";


          form.reset();

        }

        else {

          throw new Error(
            json.message ||
            "Submission failed"
          );

        }

      }

      catch (error) {

        console.error(
          error
        );


        result.className =
          "form-status error";


        result.textContent =
          "Something went wrong. Please call or text us at +1 (778) 266-1454.";

      }

      finally {

        submitButton.disabled =
          false;


        submitButton.textContent =
          "Send my business details →";

      }

    }
  );
}
