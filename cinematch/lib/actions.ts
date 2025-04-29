"use server"

import { z } from "zod"

// Define the movie type based on the API response
export type Movie = {
  primaryTitle: string
  startYear?: number
  averageRating?: number
  genres: string[]
  AllPeople: string[]
  StreamingServices: string[]
  llmExplanation?: string // Explanation from LLM if available
  // Add these fields for UI display
  description?: string
  image?: string
  duration?: string | number
}

// Schema for validating the recommendation request
const recommendationSchema = z.object({
  query: z.string().min(1, "Please enter what you're looking for"),
  streamingServices: z.array(z.string()).optional().default([]),
})

// Server action to get movie recommendations
export async function getMovieRecommendations(formData: FormData) {
  try {
    // Extract and validate the data
    const query = formData.get("query") as string
    const streamingServicesRaw = formData.get("streamingServices") as string
    const streamingServices = streamingServicesRaw ? JSON.parse(streamingServicesRaw) : []

    const validatedData = recommendationSchema.parse({
      query,
      streamingServices,
    })

    // Call our internal API route
    const response = await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"}/api/recommend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validatedData),
    })

    if (!response.ok) {
      throw new Error(`Failed to get recommendations: ${response.statusText}`)
    }

    const data = await response.json()

    // If we're in development or the API is not available, use mock data
    if (!data.recommendations || data.recommendations.length === 0) {
      return getMockRecommendations(validatedData.query)
    }

    // Process the API response to match our UI needs
    return data.recommendations.map((movie: Movie) => {
      // Conditionally exclude invalid fields
      const { duration, averageRating, startYear, ...rest } = movie

      console.log("Duration", duration)

      return {
        ...rest,
        duration: (duration && duration !== "0" && duration !== 0) ? duration : undefined,
        averageRating: averageRating !== 0 ? averageRating : undefined,
        startYear: startYear !== 0 ? startYear : undefined,
        description:
          movie.description ||
          `A ${movie.genres.join(", ")} movie from ${movie.startYear} featuring ${movie.AllPeople.slice(0, 3).join(", ")}.`,
      }
    })
  } catch (error) {
    console.error("Error getting recommendations:", error)
    // Return mock data as fallback
    return getMockRecommendations("fallback query")
  }
}

// Fallback function to get mock recommendations
function getMockRecommendations(query: string) {
  console.log(`Using mock data for query: ${query}`)

  // This is the same mock data we had before, but with the fields matching our API
  return [
    {
      primaryTitle: "Inception",
      startYear: 2010,
      averageRating: 8.8,
      genres: ["Sci-Fi", "Action", "Thriller"],
      AllPeople: ["Christopher Nolan", "Leonardo DiCaprio", "Joseph Gordon-Levitt"],
      StreamingServices: ["Netflix", "Amazon Prime"],
      description:
        "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
      duration: "2h 28m",
    },
    {
      primaryTitle: "The Shawshank Redemption",
      startYear: 1994,
      averageRating: 9.3,
      genres: ["Drama", "Crime"],
      AllPeople: ["Frank Darabont", "Tim Robbins", "Morgan Freeman"],
      StreamingServices: ["HBO Max", "Netflix"],
      description:
        "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.",
      duration: "2h 22m",
    },
    {
      primaryTitle: "Pulp Fiction",
      startYear: 1994,
      averageRating: 8.9,
      genres: ["Crime", "Drama"],
      AllPeople: ["Quentin Tarantino", "John Travolta", "Uma Thurman", "Samuel L. Jackson"],
      StreamingServices: ["Amazon Prime", "Hulu"],
      description:
        "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
      duration: "2h 34m",
    },
    {
      primaryTitle: "The Dark Knight",
      startYear: 2008,
      averageRating: 9.0,
      genres: ["Action", "Crime", "Drama"],
      AllPeople: ["Christopher Nolan", "Christian Bale", "Heath Ledger"],
      StreamingServices: ["HBO Max", "Netflix"],
      description:
        "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
      duration: "2h 32m",
    },
    {
      primaryTitle: "Fight Club",
      startYear: 1999,
      averageRating: 8.8,
      genres: ["Drama", "Thriller"],
      AllPeople: ["David Fincher", "Brad Pitt", "Edward Norton"],
      StreamingServices: ["Hulu", "Disney+"],
      description:
        "An insomniac office worker and a devil-may-care soapmaker form an underground fight club that evolves into something much, much more.",
      duration: "2h 19m",
    },
  ]
}
