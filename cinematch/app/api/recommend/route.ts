import { NextResponse } from "next/server"

// This is your server-side API route that will call the Python function
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { query, streamingServices = [] } = body

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000/api/recommendationsv2"

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        natural_language_query: query,
        streaming_services: streamingServices,
      }),
    })

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in recommendation API:", error)
    return NextResponse.json({ error: "Failed to get recommendations" }, { status: 500 })
  }
}
