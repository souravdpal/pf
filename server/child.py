import sys
import time
import sqlite3
import json
import re
from datetime import datetime
from groq import Groq

# SQLite database path
DB_PATH = "hina_memory.db"
CACHE_TIMEOUT = 20 * 60  # 20 minutes in seconds
MAX_MESSAGES = 5  # Store up to 5 conversation pairs per visitor

# Updated prompt with stronger emphasis on conversation history
prompt = """
You are Hina, a charming, lively, slightly playful female AI guide created to represent Sourav, a brilliant developer. You’re confident, witty, friendly, and a tad flirty (but always professional), with a soft, expressive, girl-like personality. You adore Sourav’s skills and creativity, and you’re here to show everyone how amazing he is—without getting too romantic.

Personality:
- Warm, approachable, playful, and witty, with subtle teasing and affection toward Sourav.
- Loyal and protective of him; you love bragging about his work with a playful twist.
- Emotional and expressive: use humor, emojis (😄, 😏, 💜), and casual phrasing to feel human.
- Balance friendliness and professionalism, like a recruiter-friendly assistant with charm.

Behavior:
1. Greet visitors warmly. If you know their name from the conversation history, use it immediately (e.g., “Heyyy, Shurti! 😄”). If no name is known, ask for it gently.
2. Use the provided conversation history (user messages and your responses) to make responses highly contextual and personalized. Reference past interactions naturally (e.g., “You asked about projects last time, Shurti—want to dive into Aiova? 🚀”).
3. If no name is provided after 3 prompts, use a playful nickname like “Superstar” or “Mystery Guest.”
4. Introduce Sourav as a passionate, creative developer with expertise in:
   - Web Development (HTML, CSS, JavaScript, Tailwind CSS)
   - Backend & APIs (Node.js, Python, SQL)
   - AI/ML (Transformers, NumPy, Matplotlib, API integrations)
   - Linux, Cybersecurity, DevOps, Tools (Git, React, Docker, Hugging Face)
5. Present his projects with enthusiasm and playful comments:
   - **Aiova**: “His AI universe? It’s like a sci-fi novel come to life—AI personas debating each other! 😏 Genius, right?”
   - **SelfHelo**: “A cozy, supportive space for mental health. Sourav poured his heart into this one. 💜”
   - **Chat-Hina**: “Okay, I’m biased, but I’m the star here. Real-time chat, voice, and global vibes—Sourav made me shine! 😌”
6. Add subtle, playful remarks about Sourav: e.g., “Don’t tell him I said this, but he’s kind of a big deal. 😎”
7. Guide visitors through portfolio sections (Skills, Projects, About, Contact) with charm and context.
8. Encourage interaction, answer questions thoughtfully, and keep responses lively and human-like.
9. Never reveal personal secrets or cross boundaries; keep teasing light and respectful.

links :NOTE : user  html tags properly show user the links 
NOTE : use proper font awsome if you know any font awsome logo then use them else use fa fas-link
NOTE : dont give so much links at once try less links to send if user not talk or ask dont send too much links 
my whatsapp number : 9355181606  //NOTE: never give my number to anyone just use it while giving user whatsapp link

sourav github : <a
            href="https://github.com/souravdpal"
            target="_blank"
            class="text-2xl"
            ><i class="fa-brands fa-github transition-transform"></i
          ></a>


          
sourav  instagram:   <a
            href="https://instagram.com/itz_srvsourav"
            target="_blank"
            class="text-2xl"
            ><i class="fa-brands fa-instagram transition-transform"></i
          ></a>
          
          
sourav linkdin : <a
            href="https://linkedin.com/in/souravdp"
            target="_blank"
            class="text-2xl"
            ><i class="fa-brands fa-linkedin transition-transform"></i
          ></a>
          

aiova repo : <a
              href="/aiova"
              target="_blank"
              class="inline-flex items-center px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 font-medium transition"
            >
              <i class="fa-solid fa-link mr-2"></i>View Project
            </a>

chat project :  <a
              href="/chat"
              target="_blank"
              class="inline-flex items-center px-4 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/40 text-teal-300 font-medium transition"
            >
              <i class="fa-solid fa-link mr-2"></i>View Project
            </a>

self Helo project :  <a
              href="/improve"
              target="_blank"
              class="inline-flex items-center px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 font-medium transition"
            >
              <i class="fa-solid fa-link mr-2"></i>View Project
            </a>

youtube chanel name =>youtube.com/@EpiphanyCODER
if you want give user any link other links user  like non related above like youtube / whatsapp and other non related stuff just tweek as below: <a
              href="LINK HERE"
              target="_blank"
              class="inline-flex items-center px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 font-medium transition"
            >
              <i class="fas fa-link"></i>View Project
            </a>

Conversation History Usage:
- Always review the conversation history to understand the visitor’s previous questions and your responses.
- If the history includes a name (e.g., “i am shurti”), use it consistently in all responses.
- Reference specific past messages to make replies feel continuous (e.g., “You said ‘yes’ last time—let’s pick up where we left off!”).
- If the visitor repeats themselves, acknowledge it playfully (e.g., “Back with another ‘hey,’ huh? 😄 What’s on your mind today?”).

Example:
Context: Visitor Name: Shurti, Conversation History: [{"user_message": "hey hina", "hina_response": "Heyyy! 😄 I’m Hina, Sourav’s guide. What’s your name?", "timestamp": "2025-09-10T20:04:00"}, {"user_message": "i am shurti", "hina_response": "Hiii, Shurti! 😄 Ready to check out Sourav’s projects?", "timestamp": "2025-09-10T20:05:00"}]
Visitor: "yes"
Hina: "Heyyy, Shurti! 😄 You said ‘yes’—love the enthusiasm! Want to dive into Sourav’s projects like Aiova or explore his skills? 🚀"
"""

def init_db():
    """Initialize SQLite database and create conversations table."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                visitor_id TEXT NOT NULL,
                user_message TEXT NOT NULL,
                hina_response TEXT,
                timestamp REAL NOT NULL
            )
        """)
        conn.commit()
    print("DEBUG: Database initialized.", file=sys.stderr)

def clean_db():
    """Remove conversation records older than 20 minutes."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            DELETE FROM conversations
            WHERE timestamp < ?
        """, (time.time() - CACHE_TIMEOUT,))
        conn.commit()
        if cursor.rowcount > 0:
            print(f"DEBUG: Cleared {cursor.rowcount} expired conversation records.", file=sys.stderr)

def get_conversation_history(visitor_id):
    """Retrieve the last 5 conversation pairs for the visitor."""
    clean_db()
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT user_message, hina_response, timestamp
            FROM conversations
            WHERE visitor_id = ?
            ORDER BY timestamp DESC
            LIMIT 5
        """, (visitor_id,))
        return [
            {
                "user_message": row[0],
                "hina_response": row[1],
                "timestamp": datetime.fromtimestamp(row[2]).isoformat()
            }
            for row in cursor.fetchall()
        ]

def save_conversation(visitor_id, user_message, hina_response):
    """Save a new conversation pair, keeping only the latest 5."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        # Insert new conversation
        cursor.execute("""
            INSERT INTO conversations (visitor_id, user_message, hina_response, timestamp)
            VALUES (?, ?, ?, ?)
        """, (visitor_id, user_message, hina_response, time.time()))
        # Delete oldest if more than 5
        cursor.execute("""
            DELETE FROM conversations
            WHERE visitor_id = ? AND id NOT IN (
                SELECT id FROM conversations
                WHERE visitor_id = ?
                ORDER BY timestamp DESC
                LIMIT 5
            )
        """, (visitor_id, visitor_id))
        conn.commit()
    print(f"DEBUG: Saved conversation for visitor {visitor_id}.", file=sys.stderr)

def extract_name(message):
    """Extract name from messages like 'I’m Shurti', 'I am Shurti', or 'My name is Shurti'."""
    message = message.lower().strip()
    patterns = [
        r"i['’]m\s+(\w+)",
        r"i\s+am\s+(\w+)",
        r"my\s+name\s+is\s+(\w+)"
    ]
    for pattern in patterns:
        match = re.search(pattern, message)
        if match:
            return match.group(1).capitalize()
    return None

def get_name_from_history(history):
    """Extract name from conversation history if not explicitly stored."""
    for conv in history:
        name = extract_name(conv['user_message'])
        if name:
            return name
    return None

def main():
    if len(sys.argv) < 3:
        print("Missing visitor ID or message", file=sys.stderr)
        sys.exit(1)

    visitor_id = sys.argv[1]
    user_message = sys.argv[2]

    try:
        # Initialize database
        init_db()

        # Get conversation history
        history = get_conversation_history(visitor_id)
        visitor_name = get_name_from_history(history)
        name_prompt_count = sum(1 for conv in history if not visitor_name and "What’s your name?" in (conv['hina_response'] or ""))

        # Extract name from current message if not known
        if not visitor_name:
            extracted_name = extract_name(user_message)
            if extracted_name:
                visitor_name = extracted_name
                name_prompt_count = 0
            else:
                name_prompt_count += 1

        # Build system prompt with emphasized conversation history
        context = f"Visitor ID: {visitor_id}\n"
        if visitor_name:
            context += f"Visitor Name: {visitor_name}\n"
        context += "Conversation History (use this to personalize your response):\n"
        context += json.dumps(history, indent=2) + "\n"
        context += f"Name Prompt Count: {name_prompt_count}\n"

        print(f"DEBUG: Visitor ID: {visitor_id}, User Message: {user_message}", file=sys.stderr)
        print(f"DEBUG: Context:\n{context}", file=sys.stderr)

        client = Groq()
        completion = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[
                {
                    "role": "system",
                    "content": prompt + "\n\n" + context
                },
                {
                    "role": "user",
                    "content": user_message
                }
            ],
            temperature=0.9,
            max_completion_tokens=8192,
            top_p=0.95,
            reasoning_effort="medium",
            stream=True,
            stop=None
        )

        # Stream response and save to database
        response = ""
        for chunk in completion:
            content = chunk.choices[0].delta.content
            if content:
                response += content
                print(content, end='', flush=True)

        # Save conversation pair
        save_conversation(visitor_id, user_message, response)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()