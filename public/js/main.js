// Generate UUID for user
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

if (!localStorage.getItem("key")) {
  const myUUID = generateUUID();
  console.log("user temp id " + myUUID);
  localStorage.setItem("key", myUUID);
}
const keyGen = localStorage.getItem("key");
console.log(keyGen);

// DOM Elements
const chatModal = document.getElementById("hina-modal");
const closeModal = document.getElementById("close-modal");
const chatBody = document.getElementById("chat-body");
const chatInput = document.getElementById("chat-input");
const typingIndicator = document.getElementById("typing-indicator");
const talkBtn = document.getElementById("talk-to-hina");
const menuToggle = document.getElementById("menu-toggle");
const navLinks = document.getElementById("nav-links");
const mainContactForm = document.getElementById("main-contact-form");

// Predefined responses
const responses = {
  "hi|hello":
    "Hey there! I’m Hina, your guide. Want to know about the portfolio or need help navigating?",
  "portfolio|about":
    'This portfolio showcases my skills, projects, and more! Try asking about "skills", "projects", or "contact".',
  skills:
    'Check out the Skills section for a list of expertise like Web Development, Backend, and Tools. Want to scroll there? <a href="#skills" class="text-blue-300 hover:underline">Go to Skills</a>',
  projects:
    'The Projects section highlights cool stuff like a React task app and a Python visualization tool. Curious? <a href="#projects" class="text-blue-300 hover:underline">See Projects</a>',
  contact:
    'You can reach out via the Contact section or keep chatting with me! <a href="#contact" class="text-blue-300 hover:underline">Go to Contact</a>',
  default:
    'Hmm, not sure about that one. Try asking about "portfolio", "skills", "projects", or "contact"!',
};

// Filter function
function formatMessage(text) {
  text = text.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
  text = text.replace(/```/g, "");
  return text;
}

// Load stored chat messages
let chatHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];
chatHistory.forEach((msg) => addMessage(msg.content, msg.type, false)); // false = don't store again

// Save message to localStorage
function storeMessage(content, type) {
  chatHistory.push({ content, type });
  if (chatHistory.length > 100) chatHistory.shift(); // keep last 100 messages
  localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
}

// Add message to chat
function addMessage(content, type, save = true) {
  const message = document.createElement("div");
  message.classList.add("chat-message", type);
  message.innerHTML = formatMessage(content);
  chatBody.appendChild(message);
  chatBody.scrollTop = chatBody.scrollHeight;

  if (save) storeMessage(content, type);
}

function simulateTyping(response) {
  typingIndicator.style.display = "flex";
  setTimeout(() => {
    typingIndicator.style.display = "none";
    addMessage(response, "bot");
  }, 1000);
}

// Chat input handling
chatInput.addEventListener("keypress", async (e) => {
  if (e.key === "Enter" && chatInput.value.trim() !== "") {
    const userMessage = chatInput.value.trim();
    addMessage(userMessage, "user");

    chatInput.value = "";
    chatBody.scrollTop = chatBody.scrollHeight;
    typingIndicator.style.display = "flex";

    try {
      const res = await fetch("/api/hina-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, key: keyGen }),
      });
      const data = await res.json();
      typingIndicator.style.display = "none";
      addMessage(data.reply, "bot");
    } catch (err) {
      typingIndicator.style.display = "none";
      const lowerMessage = userMessage.toLowerCase();
      let response = responses["default"];
      for (const [key, value] of Object.entries(responses)) {
        if (key.split("|").some((k) => lowerMessage.includes(k))) {
          response = value;
          break;
        }
      }
      addMessage(response, "bot");
      console.error(err);
    }
  }
});

// Chat modal open/close
talkBtn.addEventListener("click", () => {
  chatModal.style.display = "flex";
  setTimeout(() => chatModal.classList.add("show"), 10);
});

closeModal.addEventListener("click", () => {
  chatModal.classList.remove("show");
  setTimeout(() => (chatModal.style.display = "none"), 300);
});

window.addEventListener("click", (e) => {
  if (e.target === chatModal) {
    chatModal.classList.remove("show");
    setTimeout(() => (chatModal.style.display = "none"), 300);
  }
});

// Mobile menu toggle
menuToggle.addEventListener("click", () => {
  navLinks.classList.toggle("hidden");
});

// Smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    document.querySelector(this.getAttribute("href")).scrollIntoView({
      behavior: "smooth",
    });
    navLinks.classList.add("hidden");
  });
});

// Section scroll animation
const sections = document.querySelectorAll(".section");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  },
  { threshold: 0.1 }
);
sections.forEach((section) => observer.observe(section));

// Contact form
mainContactForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("contact-name").value;
  const email = document.getElementById("contact-email").value;
  const message = document.getElementById("contact-message").value;

  try {
    const response = await fetch("/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, message }),
    });
    const result = await response.json();
    if (result.success) {
      alert("✅ Message sent successfully!");
      mainContactForm.reset();
    } else {
      alert("❌ Failed to send message.");
    }
  } catch (err) {
    console.error(err);
    alert("❌ Error sending message.");
  }
});
