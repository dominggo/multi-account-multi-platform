import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-900 dark:text-white">
          Multi-Account Messaging Platform
        </h1>

        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Welcome
          </h2>

          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Unified Telegram & WhatsApp Web Client for managing multiple accounts.
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                Features:
              </h3>
              <ul className="list-disc list-inside text-blue-800 dark:text-blue-300 space-y-1">
                <li>Multi-account support for Telegram and WhatsApp</li>
                <li>Real-time messaging</li>
                <li>Account keep-alive system</li>
                <li>Message history persistence</li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                Setup Required:
              </h3>
              <ol className="list-decimal list-inside text-yellow-800 dark:text-yellow-300 space-y-1">
                <li>Install dependencies for all services</li>
                <li>Configure environment variables</li>
                <li>Set up MySQL database</li>
                <li>Start backend services</li>
                <li>Get Telegram API credentials</li>
              </ol>
            </div>

            <button
              onClick={() => setCount((count) => count + 1)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Click count: {count}
            </button>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-500 dark:text-gray-400 text-sm">
          <p>Check ONBOARDING.md for detailed setup instructions</p>
          <p className="mt-2">Built with React + TypeScript + Vite + Tailwind CSS</p>
        </div>
      </div>
    </div>
  )
}

export default App
