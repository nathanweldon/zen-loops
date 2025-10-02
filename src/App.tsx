// src/App.tsx
import GameBoard from './components/GameBoard';

export default function App() {
  return (
    <div className="min-h-full grid place-items-start app-shell py-3">
      <main className="w-full max-w-2xl rounded-2xl shadow-soft bg-surface p-4 sm:p-6">
        <header className="mb-2">
          <h1 className="text-2xl font-semibold">Zen Loops</h1>
          <p className="text-white/70">A calm, lightweight puzzle.</p>
          {/* The solved message will appear just beneath this header (rendered by GameBoard). */}
        </header>

        <GameBoard />
      </main>
    </div>
  );
}
