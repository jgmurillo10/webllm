import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-8">
      <div className="text-center space-y-6">
        <h1 className="text-7xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Hello World! 👋
        </h1>
        <p className="text-2xl text-gray-600">
          Welcome to Next.js with pnpm and Node 22
        </p>
      </div>
      <Link
        href="/translate"
        className="bg-blue-600 text-white px-8 py-4 rounded-xl text-xl font-semibold hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
      >
        Go to Translation App →
      </Link>
    </main>
  );
}
