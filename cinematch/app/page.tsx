import { MovieRecommendation } from "@/components/movie-recs"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Movie Match</h1>
        <MovieRecommendation />
      </div>
    </main>
  )
}
