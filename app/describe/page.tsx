"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface MessageContent {
  type: "text" | "image";
  text?: string;
  image?: string;
}

interface Message {
  role: "user" | "assistant";
  content: MessageContent[];
}

type ProgressItem = {
  file: string;
  progress: number;
  loaded?: number;
  total?: number;
};

export default function DescribePage() {
  const worker = useRef<Worker | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [gpuSupported, setGpuSupported] = useState<boolean | null>(null);
  const [status, setStatus] = useState<null | "loading" | "ready">(null);
  const [error, setError] = useState<null | string>(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [tps, setTps] = useState<number | null>(null);
  const [numTokens, setNumTokens] = useState<number | null>(null);

  // Predefined image URLs
  const predefinedImages = [
    "https://media.elgourmet.com/recetas/cover/97dee7a5ee5095b05cfaf66b516eaa67_3_3_photo.png",
  ];

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Detect WebGPU support
  useEffect(() => {
    if (typeof navigator !== "undefined" && "gpu" in navigator) {
      setGpuSupported(true);
    } else {
      setGpuSupported(false);
    }
  }, []);

  // Worker setup
  useEffect(() => {
    if (!worker.current) {
      worker.current = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
      });
      worker.current.postMessage({ type: "check" });
    }

    const onMessageReceived = (e: MessageEvent<any>) => {
      switch (e.data.status) {
        case "loading":
          setStatus("loading");
          setLoadingMessage(e.data.data);
          break;
        case "initiate":
          setProgressItems((prev) => [...prev, e.data]);
          break;
        case "progress":
          setProgressItems((prev) =>
            prev.map((item) =>
              item.file === e.data.file ? { ...item, ...e.data } : item
            )
          );
          break;
        case "done":
          setProgressItems((prev) =>
            prev.filter((item) => item.file !== e.data.file)
          );
          break;
        case "ready":
          setStatus("ready");
          setLoadingMessage("");
          setProgressItems([]);
          break;
        case "start":
          setIsThinking(true);
          setIsStreaming(false);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: [{ type: "text", text: "" }] },
          ]);
          break;
        case "update": {
          if (isThinking) setIsThinking(false);
          setIsStreaming(true);
          const { output, tps, numTokens } = e.data;
          setTps(tps);
          setNumTokens(numTokens);
          setMessages((prev) => {
            const cloned = [...prev];
            const last = cloned.at(-1);
            if (!last) return cloned;
            const lastContent = last.content[0];
            cloned[cloned.length - 1] = {
              ...last,
              role: "assistant",
              content: [
                {
                  type: "text",
                  text:
                    lastContent.type === "text"
                      ? (lastContent.text || "") + output
                      : output,
                },
              ],
            };
            return cloned;
          });
          break;
        }
        case "complete":
          setIsStreaming(false);
          setIsThinking(false);
          break;
        case "error":
          setIsStreaming(false);
          setIsThinking(false);
          setError(e.data.data);
          break;
      }
    };

    const onErrorReceived = (e: Event) => {
      console.error("Worker error:", e);
      setError("Worker encountered an error");
    };

    worker.current.addEventListener("message", onMessageReceived);
    worker.current.addEventListener("error", onErrorReceived);

    return () => {
      if (worker.current) {
        worker.current.removeEventListener("message", onMessageReceived);
        worker.current.removeEventListener("error", onErrorReceived);
      }
    };
  }, [isThinking]);

  // Trigger generation on new user messages
  useEffect(() => {
    if (messages.length === 0) return;
    if (messages.at(-1)?.role === "assistant") return;

    if (worker.current) {
      worker.current.postMessage({ type: "generate", data: messages });
    }
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePredefinedImage = async (url: string) => {
    try {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error("Failed to fetch image from proxy");
      }

      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Failed to load predefined image:", error);
      setError("Failed to load the sample image. Please try uploading your own.");
    }
  };

  const handleSendMessage = () => {
    if ((!selectedImage && !inputText.trim()) || isStreaming) return;

    const content: MessageContent[] = [];

    if (selectedImage) {
      content.push({ type: "image", image: selectedImage });
    }

    if (inputText.trim()) {
      content.push({ type: "text", text: inputText });
    }

    setMessages((prev) => [...prev, { role: "user", content }]);
    setInputText("");
    setSelectedImage(null);
    setTps(null);
    setNumTokens(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
  };

  // SSR-safe placeholder
  if (gpuSupported === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!gpuSupported) {
    return (
      <div className="fixed w-screen h-screen flex justify-center items-center bg-black text-white text-2xl font-semibold">
        WebGPU is not supported on this browser.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
        <div className="max-w-5xl mx-auto py-3 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <svg
              className="w-6 h-6 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            SmolVLM Chat
          </h1>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              <span className="relative flex h-2 w-2 mr-1.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                    status === "ready" ? "bg-green-400" : "bg-red-400"
                  } opacity-75`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    status === "ready" ? "bg-green-500" : "bg-red-500"
                  }`}
                ></span>
              </span>
              {status === "ready" ? "Ready" : "Loading"}
            </span>
            <Link
              href="/"
              className="text-gray-600 hover:text-purple-600 transition-colors text-sm font-medium"
            >
              ← Back
            </Link>
          </div>
        </div>
      </header>

      {/* Loading Screen */}
      {(status === null || status === "loading") && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
            <div className="flex justify-center mb-6">
              <svg
                className="w-16 h-16 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              SmolVLM Vision Model
            </h2>
            <p className="text-gray-600 mb-6 leading-relaxed text-sm">
              A lightweight 256M parameter vision-language model running locally
              in your browser with WebGPU.
            </p>

            {status === null ? (
              <button
                onClick={() => {
                  if (worker.current) {
                    worker.current.postMessage({ type: "load" });
                    setStatus("loading");
                  }
                }}
                className="px-8 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 active:scale-95"
              >
                Load Model
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-purple-600 font-medium">
                  {loadingMessage || "Initializing..."}
                </p>
                {progressItems.map((item, i) => (
                  <div key={i} className="w-full">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span className="truncate max-w-[70%]">{item.file}</span>
                      <span>
                        {item.progress?.toFixed(0) || 0}%
                        {item.total ? ` of ${formatBytes(item.total)}` : ""}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                        style={{ width: `${item.progress || 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Interface */}
      {status === "ready" && (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center mb-4">
                    <svg
                      className="w-8 h-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Start a conversation
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md">
                    Upload an image and ask me anything about it. I can describe,
                    analyze, and answer questions about visual content.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {predefinedImages.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePredefinedImage(url)}
                        className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Try Sample Image
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          msg.role === "user"
                            ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white"
                            : "bg-white shadow-sm border border-gray-200 text-gray-900"
                        }`}
                      >
                        {msg.content.map((c, ci) => {
                          if (c.type === "image") {
                            return (
                              <img
                                key={ci}
                                src={c.image}
                                alt="uploaded"
                                className="rounded-lg max-w-sm w-full mb-2"
                              />
                            );
                          } else {
                            return (
                              <p key={ci} className="whitespace-pre-wrap text-sm leading-relaxed">
                                {c.text}
                              </p>
                            );
                          }
                        })}
                      </div>
                    </div>
                  ))}

                  {isThinking && (
                    <div className="flex justify-start">
                      <div className="bg-white shadow-sm border border-gray-200 rounded-2xl px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {isStreaming && tps && (
                    <div className="flex justify-start">
                      <div className="text-xs text-gray-500 px-4">
                        {tps.toFixed(1)} tok/s • {numTokens} tokens
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 bg-white flex-shrink-0">
            <div className="max-w-3xl mx-auto p-4">
              {/* Image Preview */}
              {selectedImage && (
                <div className="mb-3 relative inline-block">
                  <img
                    src={selectedImage}
                    alt="To upload"
                    className="h-20 w-20 object-cover rounded-lg border-2 border-purple-300"
                  />
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Input Box */}
              <div className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isStreaming}
                  className="flex-shrink-0 p-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Attach image"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </button>

                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about an image..."
                  disabled={isStreaming}
                  className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed max-h-32"
                  rows={1}
                  style={{
                    minHeight: "44px",
                    height: "auto",
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "44px";
                    target.style.height = target.scrollHeight + "px";
                  }}
                />

                <button
                  onClick={handleSendMessage}
                  disabled={(!selectedImage && !inputText.trim()) || isStreaming}
                  className="flex-shrink-0 p-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-2 text-center">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
