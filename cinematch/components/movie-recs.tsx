"use client"

import type React from "react"

import { useState, useTransition } from "react"
import { Search, ChevronLeft, ChevronRight, Clock, Star, PlayCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { getMovieRecommendations, type Movie } from "@/lib/actions"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

// Available streaming services
const STREAMING_SERVICES = ["Disney+", "Hulu", "Netflix", "Prime Video"]

export function MovieRecommendation() {
  const [query, setQuery] = useState("")
  const [isPending, startTransition] = useTransition()
  const [currentPage, setCurrentPage] = useState(0)
  const [movies, setMovies] = useState<Movie[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [likedTropes, setLikedTropes] = useState<string[]>([]) // Tracks liked tropes
  const [likedGenres, setLikedGenres] = useState<string[]>([]) // Tracks liked genres
  const [dislikedTitles, setDislikedTitles] = useState<string[]>([]) // Tracks disliked movie titles

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
      setCurrentPage(0)
    })
  }

  const toggleService = (service: string) => {
    setSelectedServices((prev) => (prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]))
  }

  const handleLike = (movie: Movie) => {
    const tropes = movie.Tropes || []
    const genres = movie.genres || []

    // Add the current movie's tropes and genres to the liked ones
    const newLikedTropes = [...new Set([...likedTropes, ...tropes])]
    const newLikedGenres = [...new Set([...likedGenres, ...genres])]

    setLikedTropes(newLikedTropes)
    setLikedGenres(newLikedGenres)

    // Reorder movies to prioritize those with similar tropes or genres
    const updated = movies
      .filter((m) => m.primaryTitle !== movie.primaryTitle && !dislikedTitles.includes(m.primaryTitle))
      .sort((a, b) => {
        const aMatchesTropes = (a.Tropes || []).filter((t) => newLikedTropes.includes(t)).length
        const bMatchesTropes = (b.Tropes || []).filter((t) => newLikedTropes.includes(t)).length

        const aMatchesGenres = (a.genres || []).filter((g) => newLikedGenres.includes(g)).length
        const bMatchesGenres = (b.genres || []).filter((g) => newLikedGenres.includes(g)).length

        // Total similarity score based on both genres and tropes
        const aScore = aMatchesTropes + aMatchesGenres
        const bScore = bMatchesTropes + bMatchesGenres

        return bScore - aScore
      })

    setMovies([movie, ...updated])
  }

  const handleDislike = (movie: Movie) => {
    const updated = movies.filter((m) => m.primaryTitle !== movie.primaryTitle)
    setDislikedTitles((prev) => [...prev, movie.primaryTitle])
    setMovies(updated)
  }

  // Calculate pagination
  const moviesPerPage = 4
  const totalPages = Math.ceil(movies.length / moviesPerPage)
  const startIndex = currentPage * moviesPerPage
  const currentMovies = movies.slice(startIndex, startIndex + moviesPerPage)

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {movies.length === 0 ? (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">Find Your Next Movie</h2>
            <p className="text-slate-300">Tell us what you're in the mood for and we'll suggest movies for you</p>
          </div>

          <form onSubmit={handleSearch} className="space-y-4 max-w-md mx-auto">
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
            <div className="flex items-center space-x-4">
              <Button
                onClick={goToPrevPage}
                disabled={currentPage === 0}
                variant="outline"
                className="text-slate-300 border-slate-700 hover:bg-slate-700"
                size="icon"
              >
                <ChevronLeft className="h-4 w-4 text-black" />
              </Button>
              <span className="text-sm text-slate-400">
                Page {currentPage + 1} of {totalPages}
              </span>
              <Button
                onClick={goToNextPage}
                disabled={currentPage >= totalPages - 1}
                variant="outline"
                className="text-slate-300 border-slate-700 hover:bg-slate-700"
                size="icon"
              >
                <ChevronRight className="h-4 w-4 text-black" />
              </Button>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
            {currentMovies.map((movie) => (
              <Card key={movie.primaryTitle} className="bg-slate-800 border-slate-700 h-full flex flex-col">
                <CardContent className="p-4 space-y-3 flex-grow">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">{movie.primaryTitle}</h3>
                    <div className="flex items-center space-x-2 text-xs">
                      {movie.startYear && <span className="text-slate-400">({movie.startYear})</span>}
                      <div className="flex items-center">
                        {movie.duration && <Clock className="h-3 w-3 text-slate-300 mr-1" />}
                        {movie.duration && <span className="text-slate-300">{movie.duration} minutes</span>}
                      </div>
                      <div className="flex items-center">
                        {movie.averageRating && <Star className="h-3 w-3 text-yellow-500 mr-1" />}
                        {movie.averageRating && <span className="text-slate-300">{movie.averageRating}/10</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {movie.genres.map((genre) => (
                      <Badge key={genre} variant="secondary" className="bg-slate-700 text-white text-xs">
                        {genre}
                      </Badge>
                    ))}
                  </div>

                  {movie.llmExplanation && (
                    <>
                      <div className="text-xs font-medium text-white">Why You'll Like It:</div>
                      <p className="text-xs text-slate-300">{movie.llmExplanation}</p>
                    </>
                  )}

                  {movie.AllPeople && movie.AllPeople.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-white">Cast & Crew:</div>
                      <p className="text-xs text-slate-400">
                        {movie.AllPeople.slice(0, 8).join(", ")}
                        {movie.AllPeople.length > 8 && "..."}
                      </p>
                    </div>
                  )}

                  {movie.StreamingServices && movie.StreamingServices.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-white">Available on:</div>
                      <div className="flex flex-wrap gap-1">
                        {movie.StreamingServices.map((platform) => (
                          <div
                            key={platform}
                            className="flex items-center space-x-1 text-xs bg-slate-700 px-1.5 py-0.5 rounded"
                          >
                            <PlayCircle className="h-3 w-3 text-rose-500" />
                            <span className="text-white">{platform}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2 mt-2">
                    <Button
                      onClick={() => handleLike(movie)}
                      className="bg-green-700 text-black text-xs px-3 py-1 rounded-md"
                    >
                      👍 Like
                    </Button>
                    <Button
                      onClick={() => handleDislike(movie)}
                      className="bg-red-700 text-black text-xs px-3 py-1 rounded-md"
                    >
                      👎 Dislike
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
