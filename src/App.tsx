// src/App.tsx
import GameBoard from './components/GameBoard';

export default function App() {
  return (
    // app-shell adds side padding; py-4 keeps comfortable vertical spacing
    <div className="min-h-full grid place-items-center app-shell py-4">
      <main className="w-full max-w-2xl rounded-2xl shadow-soft bg-surface p-6">
        <header className="mb-4">
          <h1 className="text-2xl font-semibold">Zen Loops</h1>
          <p className="text-white/70">A calm, lightweight puzzle. iPhone-ready PWA.</p>
        </header>
        <GameBoard />
      </main>
    </div>
  );
}
