# WebLLM Demos - Next.js AI Applications

A collection of AI-powered applications running entirely in your browser using [WebLLM](https://github.com/mlc-ai/web-llm), built with Next.js 14, TypeScript, and Tailwind CSS.

## 🚀 Live Demos

- **Translation App** (`/translate`) - ✅ **FULLY WORKING**
- **Image Describer** (`/describe`) - ⚠️ UI Complete, Model Loading Issue

## ✅ Working Features

### Translation App (`/translate`)

A fully functional real-time translation application powered by Llama 3.2 3B.

**Features:**

- 🌍 12 languages supported (English, Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean, Russian, Arabic, Hindi)
- 🔄 Language swap button to quickly switch source and target languages
- ⚡ Real-time streaming translations
- 🎨 Beautiful Google Translate-inspired UI
- 🔒 100% private - runs locally in browser
- 💾 Model cached after first download (~2GB)

**Model:** Llama-3.2-3B-Instruct-q4f32_1-MLC

### Image Describer (`/describe`)

Beautiful UI for image analysis with upload functionality.

**Features:**

- 📸 Drag & drop image upload
- 🎨 Modern purple/pink gradient design
- 🔍 Automatic vision model detection
- ⚙️ Customizable description prompts

**Known Issue:** Vision models (Phi-3.5-vision-instruct) crash with "exit(1)" error due to high memory requirements (~2-3GB). This is a WebGPU/browser memory limitation.

## 🛠️ Tech Stack

- **Framework:** Next.js 14.2.15 (App Router)
- **Language:** TypeScript 5.6.3
- **Styling:** Tailwind CSS 3.x
- **AI Engine:** @mlc-ai/web-llm 0.2.79
- **Package Manager:** pnpm
- **Node Version:** 22.x

## 📦 Getting Started

### Prerequisites

- Node.js 22.x (managed via nvm)
- pnpm

### Installation

```bash
# Use Node 22
nvm use 22

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

The app will be available at `http://localhost:3000` (or 3001/3002 if ports are in use).

### Available Scripts

```bash
pnpm dev     # Start development server
pnpm build   # Build for production
pnpm start   # Start production server
pnpm lint    # Run ESLint
```

## 🎯 How It Works

### WebLLM Integration

Both apps use WebLLM to run AI models entirely in the browser:

1. **First Load:** Downloads and caches the model (~2GB)
2. **Subsequent Loads:** Loads from browser cache instantly
3. **Inference:** Runs on your GPU via WebGPU
4. **Privacy:** All processing happens locally, no data sent to servers

### Browser Requirements

- ✅ Chrome 113+ (WebGPU enabled by default)
- ✅ Edge 113+ (WebGPU enabled by default)
- ❌ Safari (WebGPU support limited)
- ❌ Firefox (WebGPU behind flag)

## 📁 Project Structure

```
webllm/
├── app/
│   ├── describe/
│   │   └── page.tsx          # Image describer (vision model)
│   ├── translate/
│   │   └── page.tsx          # Translation app
│   ├── globals.css           # Global styles + Tailwind
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home page with navigation
├── tailwind.config.js        # Tailwind configuration
├── tsconfig.json             # TypeScript configuration
├── next.config.js            # Next.js configuration
└── package.json              # Dependencies
```

## 🐛 Known Issues

### Vision Models Not Loading

**Issue:** Phi-3.5-vision models crash with "Program terminated with exit(1)"

**Cause:**

- Vision models are very large (~2-3GB)
- WebGPU has memory limitations in browsers
- Browser may run out of GPU memory during model loading

**Attempted Solutions:**

- ✅ Tried q4f32_1 variant (more compatible quantization)
- ✅ Tried q4f16_1 variant (smaller size)
- ✅ Added WebGPU compatibility checks
- ❌ Both variants crash during loading

**Potential Workarounds:**

1. Use a machine with more GPU memory (8GB+ VRAM recommended)
2. Close other browser tabs and applications
3. Wait for WebLLM to release smaller vision models
4. Use a desktop application instead of browser (e.g., MLC-LLM Python)

**Note:** The translation app with Llama 3.2 3B works perfectly because it's significantly smaller and doesn't process images.

## 🎨 UI Design

Both applications feature:

- Modern, clean interfaces inspired by Google Translate
- Responsive design (desktop and mobile)
- Smooth animations and transitions
- Clear visual feedback during loading
- Professional color schemes (blue for translation, purple for vision)

## 📚 Resources

- [WebLLM Documentation](https://webllm.mlc.ai/)
- [WebLLM GitHub](https://github.com/mlc-ai/web-llm)
- [MLC-AI Models](https://huggingface.co/mlc-ai)
- [Phi-3.5-vision Model](https://huggingface.co/mlc-ai/Phi-3.5-vision-instruct-q4f16_1-MLC)

## 🚀 Future Improvements

- [ ] Fix vision model memory issues (waiting for smaller models)
- [ ] Add model selection dropdown
- [ ] Implement conversation history for translation
- [ ] Add text-to-speech for translations
- [ ] Support for document translation
- [ ] Batch image processing for vision model
- [ ] Progressive Web App (PWA) support
- [ ] Offline mode

## 📄 License

This project uses:

- **Next.js:** MIT License
- **WebLLM:** Apache 2.0 License
- **Tailwind CSS:** MIT License

## 🤝 Contributing

This is a demo project showcasing WebLLM capabilities. Feel free to:

- Report issues with browser compatibility
- Suggest UI improvements
- Test on different devices
- Share workarounds for vision model loading

## ⚡ Performance

### Translation App

- **First Load:** ~30-60 seconds (downloads model)
- **Subsequent Loads:** <5 seconds (from cache)
- **Translation Speed:** Real-time streaming (~20-50 tokens/sec)

### Image Describer

- **Status:** Not functional due to model loading issues
- **Expected Performance:** First load ~60-120 seconds, then instant from cache

---

Built with ❤️ using WebLLM, Next.js, and Tailwind CSS
