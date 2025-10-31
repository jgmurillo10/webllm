import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-8">
      <div className="text-center space-y-6">
        <h1 className="text-7xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          WebLLM Demos 🚀
        </h1>
        <p className="text-2xl text-gray-600">
          AI-powered apps running entirely in your browser
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/translate"
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-xl text-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center gap-2"
        >
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
              d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
            />
          </svg>
          Translation App
        </Link>
        <Link
          href="/describe"
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl text-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center gap-2"
        >
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
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          SmolVLM Vision
        </Link>
      </div>
    </main>
  );
}
