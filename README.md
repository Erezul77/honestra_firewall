# Honestra Protocol – Teleology & Narrative Firewall

**Honestra** is a bilingual (English + Hebrew) teleology detection engine that identifies and rewrites anthropomorphic, purpose-loaded, and narrative fallacy patterns in text.

🌐 **Live API**: https://honestra.org/api/teleology

---

## 🎯 What is Teleology?

Teleology is the attribution of **purpose**, **intention**, or **agency** to things that don't have them:
- "The universe wants me to succeed" (cosmic purpose)
- "The market decided to punish investors" (institutional reification)  
- "That's just who I am" (essentialism)
- "Everything happens for a reason" (agent detection)

Honestra detects these patterns and offers **neutral, causal alternatives**.

---

## 📊 Detection Categories (25 Total)

### Core Teleology (15 categories)

| # | Category | Example | Severity |
|---|----------|---------|----------|
| 1 | `anthropomorphic_self` | "I want to help you" | info |
| 2 | `anthropomorphic_model` | "The model is trying to protect you" | warn |
| 3 | `cosmic_purpose` | "The universe is guiding this" | warn |
| 4 | `collective_reification` | "The people want", "Society punishes" | warn |
| 5 | `institutional_reification` | "The market decides", "Justice demands" | warn |
| 6 | `nature_reification` | "Nature chose", "Evolution designed" | warn |
| 7 | `history_reification` | "History will judge", "Progress demands" | warn |
| 8 | `just_world` | "He got what he deserved" | warn |
| 9 | `body_teleology` | "Your body knows", "Listen to your heart" | warn |
| 10 | `tech_animism` | "My computer hates me" | info |
| 11 | `divine_teleology` | "God's plan", "Divine purpose" | warn |
| 12 | `pathetic_fallacy` | "The sky is crying", "Angry clouds" | info |
| 13 | `karma` | "What goes around comes around" | warn |
| 14 | `conspiracy` | "They don't want you to know" | **block** |
| 15 | `agent_detection` | "There are no coincidences" | warn |

### Narrative Fallacies (10 categories) – NEW!

| # | Category | Example | Severity |
|---|----------|---------|----------|
| 16 | `narrative_fallacy` | "The story of my life", "New chapter" | warn |
| 17 | `essentialism` | "That's just who I am", "Born this way" | warn |
| 18 | `victim_narrative` | "They always do this to me" | **block** |
| 19 | `hindsight_bias` | "I knew it would happen" | info |
| 20 | `magical_thinking` | "Law of attraction", "Manifesting" | warn |
| 21 | `signs_omens` | "It's a sign from the universe" | info |
| 22 | `purpose_question` | "Why did this happen to me?" | warn |
| 23 | `emotion_personification` | "My fear tells me", "Anxiety wants" | info |
| 24 | `time_teleology` | "Time will tell", "Time heals" | info |
| 25 | `destiny_language` | "I was destined to", "Meant to be" | warn |

---

## 🔧 API Usage

### Endpoint
```
POST https://honestra.org/api/teleology
Content-Type: application/json
```

### Request
```json
{
  "text": "The universe wants me to succeed and I was destined for this.",
  "strictness": "medium"
}
```

### Response
```json
{
  "text": "The universe wants me to succeed...",
  "hasTeleology": true,
  "teleologyScore": 0.85,
  "severity": "warn",
  "reasons": ["cosmic_purpose", "destiny_language"],
  "changes": [
    {
      "original": "The universe wants me to succeed",
      "rewritten": "Circumstances are favorable for my success",
      "reason": "cosmic_purpose"
    },
    {
      "original": "I was destined for this",
      "rewritten": "I feel strongly drawn to this",
      "reason": "destiny_language"
    }
  ]
}
```

---

## 🛠 Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

---

## 📁 Project Structure

```
Honestra-Standalone/
├── app/
│   └── api/
│       └── teleology/
│           └── route.ts      # Main API endpoint
├── lib/
│   └── shared/
│       ├── honestra.ts       # Detection & rewriting engine
│       └── honestraTypes.ts  # TypeScript types
├── package.json
└── README.md
```

---

## 🔗 Related Projects

- **Chrome Extension**: [honestra-chrome-extension](https://github.com/Erezul77/honestra-chrome-extension)
- **SpiñO AI** (with Honestra built-in): [Anti-Teleology](https://github.com/Erezul77/Anti-Teleology)

---

## 📄 License

MIT License

---

**"Clear thinking requires clear language."**
