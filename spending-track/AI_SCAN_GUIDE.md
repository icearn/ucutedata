# Intelligent Receipt Scanning: Privacy-First Approach

You requested a solution that avoids external non-open-source LLMs (like OpenAI) due to cost and data privacy. Below are the recommended architectures for a privacy-first, potentially offline solution.

## Option 1: Self-Hosted Backend (Recommended for Prototype)
This gives you LLM power without data leakage. You host the AI on your own server (or even your laptop within the LAN).

**Architecture:**
-   **Mobile App**: Captures image -> Uploads to your server URL.
-   **Server**: Runs a local open-source model using **Ollama**, **vLLM**, or **LocalAI**.
-   **Model**: **Llava** (Large Language-and-Vision Assistant) or **Qwen-VL**. These are open-source and run on consumer GPUs.

**Implementation:**
1.  Install [Ollama](https://ollama.com).
2.  Run: `ollama run llava`
3.  Create a simple Python/Node API that forwards the image to Ollama.
4.  Update `src/lib/ocr.ts` to point to `http://YOUR_SERVER_IP:PORT/analyze`.

**Pros**: Low mobile battery usage, high accuracy, zero cost (hardware dependent).
**Cons**: Requires a server/PC online.

## Option 2: On-Device OCR + Heuristics (Truly Offline)
If you need to run strictly on the phone with no server, you cannot easily run a Vision LLM in Expo Go. You must use a "Development Build" or native app.

**Architecture:**
-   Use **Apple Vision Framework** (iOS) and **ML Kit** (Android) via `react-native-text-recognition`.
-   This provides raw text lines (not structure).
-   Use **Heuristic Logic** (Regex) to parse the text.

**The Parsing Logic (Included in `ocr.ts`):**
I have provided `parseRawOCRText` in `src/lib/ocr.ts` which implements this logic:
1.  **Merchant**: Assume Line 1.
2.  **Total**: Scan all lines for `\d+\.\d{2}`. The largest number is usually the Total.
3.  **Date**: Scan for `\d{2}/\d{2}/\d{2}`.

**Pros**: Works offline, fast, privacy-safe.
**Cons**: Less accurate than LLM; brittle if receipt format changes.

## Option 3: On-Device SLM (Advanced)
To run a Small Language Model (SLM) like *Phi-3* or *Llama-3-8B* directly on the phone:
1.  You must "Eject" from Expo Go (`npx expo prebuild`).
2.  Install `react-native-llama` or `react-native-executorch`.
3.  These libraries bundle the model (`.gguf` file, ~4GB) into your app.
4.  inference takes 5-20 seconds on modern phones.

**Recommendation:** Start with **Option 1 (Self-Hosted Backup)** for accuracy, or **Option 2 (OCR + Regex)** for speed and offline capability.
