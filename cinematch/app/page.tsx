import { MovieRecommendation } from "@/components/movie-recs"
import Image from "next/image"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center mb-8">
          <Image
            src="/CinematchLogo.png"
            alt="Cinematch Logo"
            width={200}
            height={100}
          />
        </div>
        <MovieRecommendation />
      </div>
    </main>
  )
}
