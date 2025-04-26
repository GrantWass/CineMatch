"use client"

import type React from "react"

import { useState, useTransition } from "react"
import { Search, ThumbsUp, ThumbsDown, Clock, Star, PlayCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { getMovieRecommendations, type Movie } from "@/lib/actions"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

// Available streaming services
const STREAMING_SERVICES = ["Netflix", "Amazon Prime", "Hulu", "Disney+", "HBO Max", "Apple TV+"]

export function MovieRecommendation() {
  const [query, setQuery] = useState("")
  const [isPending, startTransition] = useTransition()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [movies, setMovies] = useState<Movie[]>([])
  const [direction, setDirection] = useState<"left" | "right" | null>(null)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim() === "") return

    startTransition(async () => {
      // Create a FormData object to pass to the server action
      const formData = new FormData()
      formData.append("query", query)
      formData.append("streamingServices", JSON.stringify(selectedServices))

      // Call the server action
      const recommendations = await getMovieRecommendations(formData)
      setMovies(recommendations)
      setCurrentIndex(0)
    })
  }

  const handleLike = () => {
    setDirection("right")
    setTimeout(() => {
      setDirection(null)
      if (currentIndex < movies.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        // Reset when we've gone through all movies
        setMovies([])
      }
    }, 300)
  }

  const handleDislike = () => {
    setDirection("left")
    setTimeout(() => {
      setDirection(null)
      if (currentIndex < movies.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        // Reset when we've gone through all movies
        setMovies([])
      }
    }, 300)
  }

  const toggleService = (service: string) => {
    setSelectedServices((prev) => (prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]))
  }

  const currentMovie = movies[currentIndex]

  return (
    <div className="max-w-md mx-auto">
      {movies.length === 0 ? (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">Find Your Next Movie</h2>
            <p className="text-slate-300">Tell us what you're in the mood for and we'll suggest movies for you</p>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="E.g., sci-fi with plot twists"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
              <Button
                type="submit"
                disabled={isPending || query.trim() === ""}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {isPending ? "Searching..." : <Search className="h-4 w-4" />}
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="text-sm text-slate-300 border-slate-700 hover:bg-slate-700 text-black"
              >
                {showFilters ? "Hide Filters" : "Show Filters"}
              </Button>

              {selectedServices.length > 0 && (
                <span className="text-xs text-slate-400">{selectedServices.length} services selected</span>
              )}
            </div>

            {showFilters && (
              <div className="p-4 bg-slate-800 rounded-md border border-slate-700">
                <h3 className="text-sm font-medium mb-3">Streaming Services</h3>
                <div className="grid grid-cols-2 gap-2">
                  {STREAMING_SERVICES.map((service) => (
                    <div key={service} className="flex items-center space-x-2">
                      <Checkbox
                        id={`service-${service}`}
                        checked={selectedServices.includes(service)}
                        onCheckedChange={() => toggleService(service)}
                      />
                      <Label htmlFor={`service-${service}`} className="text-sm text-slate-300">
                        {service}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>

          {isPending && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-500 mx-auto"></div>
              <p className="mt-4 text-slate-300">Finding movies for you...</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => {
                setMovies([])
                setQuery("")
              }}
              className="text-slate-300 border-slate-700 hover:bg-slate-700 text-black"
            >
              New Search
            </Button>
            <div className="text-sm text-slate-400">
              {currentIndex + 1} of {movies.length}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentMovie.primaryTitle}
              initial={{ opacity: 1 }}
              animate={{
                opacity: 1,
                x: direction === "left" ? -200 : direction === "right" ? 200 : 0,
                rotate: direction === "left" ? -10 : direction === "right" ? 10 : 0,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="overflow-hidden bg-slate-800 border-slate-700">
                <div className="relative">
                  <img
                    src={currentMovie.image || "/placeholder.svg"}
                    alt={currentMovie.primaryTitle}
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                    <h3 className="text-xl font-bold text-white">{currentMovie.primaryTitle}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <Clock className="h-4 w-4 text-slate-300" />
                      <span className="text-sm text-slate-300">{currentMovie.duration}</span>
                      <Star className="h-4 w-4 text-yellow-500 ml-2" />
                      <span className="text-sm text-slate-300">{currentMovie.averageRating}/10</span>
                      <span className="text-sm text-slate-400">({currentMovie.startYear})</span>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {currentMovie.genres.map((genre) => (
                      <Badge key={genre} variant="secondary" className="bg-slate-700 text-white">
                        {genre}
                      </Badge>
                    ))}
                  </div>

                  <p className="text-sm text-slate-300">{currentMovie.description}</p>

                  {currentMovie.AllPeople && currentMovie.AllPeople.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-white">Cast & Crew:</div>
                      <p className="text-sm text-slate-400">
                        {currentMovie.AllPeople.slice(0, 4).join(", ")}
                        {currentMovie.AllPeople.length > 4 && "..."}
                      </p>
                    </div>
                  )}

                  {currentMovie.StreamingServices && currentMovie.StreamingServices.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Available on:</div>
                      <div className="flex flex-wrap gap-2">
                        {currentMovie.StreamingServices.map((platform) => (
                          <div
                            key={platform}
                            className="flex items-center space-x-1 text-sm bg-slate-700 px-2 py-1 rounded-md"
                          >
                            <PlayCircle className="h-4 w-4 text-rose-500" />
                            <span>{platform}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between pt-4">
                    <Button onClick={handleDislike} className="bg-slate-700 hover:bg-slate-600 rounded-full h-14 w-14">
                      <ThumbsDown className="h-6 w-6" />
                    </Button>
                    <Button onClick={handleLike} className="bg-rose-600 hover:bg-rose-700 rounded-full h-14 w-14">
                      <ThumbsUp className="h-6 w-6" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
