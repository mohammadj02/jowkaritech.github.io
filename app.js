document.getElementById("year") &&
  (document.getElementById("year").textContent = new Date().getFullYear());

/* =========================
   INTERACTIVE DEMO CHAT
========================= */

const chat = document.getElementById("chat");
const quick = document.querySelector(".quick");

const flows = {
  quote: [
    "I need a quote.",
    "Of course. What service do you need help with?",
    "Great — what name and phone number should the team use to follow up?"
  ],
  hours: [
    "What are your hours?",
    "I can help with hours and availability. Would you like me to collect your details for a callback?",
    "What name and phone number should the team use to contact you?"
  ],
  book: [
    "I'd like to book a service.",
    "Absolutely. What service do you need and what day works best for you?",
    "Perfect — I can collect your contact details for the booking request."
  ]
};

function addBubble(text, who) {
  if (!chat || !quick) return;

  const div = document.createElement("div");
  div.className = "bubble " + who;
  div.textContent = text;

  chat.insertBefore(div, quick);
}

document.querySelectorAll("[data-demo]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const flow = flows[btn.dataset.demo];

    if (!flow) return;

    document.querySelectorAll("[data-demo]").forEach((b) => {
      b.disabled = true;
    });

    addBubble(flow[0], "user");

    setTimeout(() => addBubble(flow[1], "bot"), 350);
    setTimeout(() => addBubble(flow[2], "bot"), 900);
  });
});

/* =========================
   REAL LEAD FORM
========================= */

const form = document.getElementById("lead-form");

if (form) {
  const result = document.createElement("div");
  result.className = "form-status";
  result.setAttribute("aria-live", "polite");

  form.appendChild(result);

  // Honeypot anti-spam field
  const botcheck = document.createElement("input");
  botcheck.type = "checkbox";
  botcheck.name = "botcheck";
  botcheck.style.display = "none";
  botcheck.tabIndex = -1;

  form.appendChild(botcheck);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');

    submitButton.disabled = true;
    submitButton.textContent = "Sending...";
    result.className = "form-status";
    result.textContent = "";

    const formData = new FormData(form);

    const data = Object.fromEntries(formData.entries());

    data.access_key = "67b05f47-421b-41f8-837e-c8a12741dc9c";
    data.subject = "New JowkariTech AI Receptionist Lead";
    data.from_name = "JowkariTech Website";

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(data)
      });

      const json = await response.json();

      if (response.ok && json.success) {
        result.className = "form-status success";
        result.innerHTML =
          "<strong>Thanks!</strong> Your message was sent. We'll contact you shortly.";

        form.reset();
      } else {
        throw new Error(json.message || "Submission failed");
      }
    } catch (error) {
      console.error(error);

      result.className = "form-status error";
      result.textContent =
        "Something went wrong. Please call or text us at +1 (778) 266-1454.";
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Send my business details →";
    }
  });
}
