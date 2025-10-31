"use client";

import { useState, useEffect } from "react";
import * as webllm from "@mlc-ai/web-llm";

export default function DescribePage() {
  const [engine, setEngine] = useState<webllm.MLCEngine | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isDescribing, setIsDescribing] = useState(false);
  const [prompt, setPrompt] = useState("Describe this image in detail.");
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // Check available models on mount
  useEffect(() => {
    const models = webllm.prebuiltAppConfig.model_list
      .filter((m) => m.model_id.toLowerCase().includes("vision"))
      .map((m) => m.model_id);
    setAvailableModels(models);
    console.log("Available vision models:", models);
  }, []);

  const initializeEngine = async () => {
    setIsLoading(true);
    setProgress("Initializing Vision Model...");

    try {
      // Check WebGPU support
      if (!navigator.gpu) {
        throw new Error(
          "WebGPU is not supported in this browser. Please use Chrome, Edge, or another WebGPU-enabled browser."
        );
      }

      const initProgressCallback = (report: webllm.InitProgressReport) => {
        setProgress(report.text);
      };

      // Try the q4f32_1 variant first (better compatibility)
      // Then fall back to q4f16_1 if needed
      let selectedModel = "Phi-3.5-vision-instruct-q4f32_1-MLC";

      if (availableModels.length > 0) {
        // Prefer f32 variant for better compatibility
        const f32Model = availableModels.find((m) => m.includes("q4f32"));
        selectedModel = f32Model || availableModels[0];
        console.log("Using vision model:", selectedModel);
      }

      setProgress(`Loading ${selectedModel}...`);

      const newEngine = await webllm.CreateMLCEngine(selectedModel, {
        initProgressCallback,
      });

      setEngine(newEngine);
      setProgress("Vision model ready! 🎉");
      setIsLoading(false);
    } catch (error: any) {
      console.error("Error initializing engine:", error);
      const errorMessage =
        error?.message || error?.toString() || "Unknown error";
      setProgress(
        `Error: ${errorMessage}\n\nTry refreshing the page or use a WebGPU-enabled browser (Chrome/Edge).`
      );
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setDescription("");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDescribe = async () => {
    if (!engine || !selectedImage) return;

    setIsDescribing(true);
    setDescription("");

    try {
      // Use vision model format with image content
      const messages: webllm.ChatCompletionMessageParam[] = [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: selectedImage },
            },
          ],
        },
      ];

      const chunks = await engine.chat.completions.create({
        messages,
        stream: true,
      });

      let fullResponse = "";
      for await (const chunk of chunks) {
        const content = chunk.choices[0]?.delta?.content || "";
        fullResponse += content;
        setDescription(fullResponse);
      }
    } catch (error: any) {
      console.error("Description error:", error);
      const errorMsg = error?.message || "Unknown error";
      setDescription(`Error: ${errorMsg}`);
    } finally {
      setIsDescribing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🔍</div>
              <h1 className="text-2xl font-semibold text-purple-600">
                Image Describer
              </h1>
            </div>
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Powered by Vision AI
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!engine ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Initialize Vision Model
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                First time setup will download the Vision AI model (~2-3GB).
                This runs entirely in your browser with advanced image
                understanding capabilities!
              </p>
              {availableModels.length > 0 && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <p className="font-semibold text-green-800 mb-1">
                    Available Vision Models:
                  </p>
                  {availableModels.map((model) => (
                    <p key={model} className="text-green-700">
                      {model}
                    </p>
                  ))}
                </div>
              )}
              {availableModels.length === 0 && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  ⚠️ No vision models found in prebuilt config. Will attempt
                  fallback.
                </div>
              )}
              <button
                onClick={initializeEngine}
                disabled={isLoading}
                className={`px-8 py-3 rounded-lg font-semibold text-white transition-all transform ${
                  isLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700 hover:scale-105 active:scale-95"
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Loading...
                  </span>
                ) : (
                  "Initialize Vision Model"
                )}
              </button>
              {progress && (
                <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-purple-800">{progress}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Prompt Input */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What would you like to know about the image?
              </label>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Describe this image, What objects are in this picture?"
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Image Upload Section */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-3">
                  <h3 className="text-white font-semibold flex items-center gap-2">
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
                    Upload Image
                  </h3>
                </div>
                <div className="p-6">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
                    {selectedImage ? (
                      <div className="space-y-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedImage}
                          alt="Uploaded"
                          className="max-h-96 mx-auto rounded-lg shadow-md"
                        />
                        <label className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-lg cursor-pointer hover:bg-purple-200 transition-colors">
                          Change Image
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <div className="space-y-4">
                          <svg
                            className="w-16 h-16 mx-auto text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          <div>
                            <p className="text-lg font-medium text-gray-700">
                              Click to upload an image
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              PNG, JPG, GIF up to 10MB
                            </p>
                          </div>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Description Output */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3">
                  <h3 className="text-white font-semibold flex items-center gap-2">
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Description
                  </h3>
                </div>
                <div className="p-6">
                  <div className="min-h-[400px] p-4 bg-indigo-50 border-2 border-indigo-200 rounded-lg overflow-auto">
                    {description ? (
                      <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                        {description}
                      </p>
                    ) : isDescribing ? (
                      <div className="flex items-center gap-2 text-gray-600">
                        <svg
                          className="animate-spin h-5 w-5"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Analyzing image...
                      </div>
                    ) : (
                      <p className="text-gray-400">
                        Upload an image and click &quot;Describe Image&quot; to
                        see the AI description
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Describe Button */}
            <div className="text-center">
              <button
                onClick={handleDescribe}
                disabled={isDescribing || !selectedImage}
                className={`px-12 py-4 rounded-xl font-bold text-white text-lg transition-all transform shadow-lg ${
                  isDescribing || !selectedImage
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:scale-105 active:scale-95 hover:shadow-xl"
                }`}
              >
                {isDescribing ? (
                  <span className="flex items-center gap-3">
                    <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    Describe Image
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
