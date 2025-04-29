import requests
from flask import request, jsonify
import ast
from datetime import datetime

genreOptions = ['Action', 'Adult', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'Film-Noir', 'Game-Show', 'History', 'Horror', 'Music', 'Musical', 'Mystery', 'News', 'Reality-TV', 'Romance', 'Sci-Fi', 'Short', 'Sport', 'Talk-Show', 'Thriller', 'War', 'Western']

def recommend_movies_v2(request, movies_collection, GEMINI_API_KEY):
    try:
        data = request.get_json()
        natural_query = data.get("natural_language_query", "").strip()
        streaming_services = data.get("streaming_services", [])

        if not natural_query:
            return jsonify({"message": "Missing natural_language_query"}), 400

        # Step 1: Send original prompt to get MongoDB query
        prompt_for_query = (
            f"Convert this natural language movie request into a MongoDB query as a Python dict. "
            f"The fields available in the database are:\n"
            f" - genres (list of strings)\n"
            f" - AllPeople (list of actors and directors)\n"
            f" - averageRating (float)\n"
            f" - primaryTitle (string)\n"
            f" - StreamingServices (list of strings)\n"
            f" - runtimeMinutes (int)\n"
            f" - startYear (int)\n"
            f" - isAdult (0 or 1)\n\n"
            f" Examples of Genres: {', '.join(genreOptions)}\n\n"
            f"Only use a regex search on `primaryTitle` if the user:\n"
            f" - explicitly states the want an exact movie (e.g., 'Frozen', 'Oppenheimer')\n"
            f" - asks for a sequel, part 2, or continuation (e.g., 'Frozen 2', 'another Top Gun')\n\n"
            f"Otherwise, do not use regex in any query.\n"
            f" Please specific at least one genre, actor, or director in the query.\n\n"
            f" Use your best judgment to interpret the user's intent and create a query that captures it.\n\n"
            f"User request: \"{natural_query}\"\n\n"
            f"Also, filter by the following streaming services (if any): {streaming_services}\n\n"
            f"Respond only with the Python dictionary."
        )

        print("User Query:", natural_query)

        gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
        payload = {"contents": [{"parts": [{"text": prompt_for_query}]}]}
        headers = {"Content-Type": "application/json"}

        response = requests.post(gemini_url, headers=headers, json=payload)
        response.raise_for_status()

        response_json = response.json()
        raw_output = response_json["candidates"][0]["content"]["parts"][0]["text"]
        print("🔍 Gemini Raw Output (MongoDB Query):\n", raw_output)

        # Clean Gemini response
        cleaned_output = raw_output.strip()
        if cleaned_output.startswith("```") and "python" in cleaned_output:
            cleaned_output = '\n'.join(
                line for line in cleaned_output.splitlines()
                if not line.strip().startswith("```")
            )

        updated_query_raw = ast.literal_eval(cleaned_output)
        current_year = datetime.now().year
        if "$and" in updated_query_raw:
            updated_query_raw["$and"].append({"startYear": {"$lte": current_year}})
        else:
            updated_query_raw = {"$and": [updated_query_raw, {"startYear": {"$lte": current_year}}]}
        print("✅ Parsed Gemini Output:", updated_query_raw)

        print(movies_collection.distinct("genres"))

        # Step 2: Pull ~50 raw movies sorted by newest & highest rated
        raw_movies = list(
            movies_collection.find(updated_query_raw)
            .sort([("averageRating", -1), ("startYear", -1)])
            .limit(80)
        )

        if not raw_movies:
            print("No results found, relaxing the query")
            relaxed_query = updated_query_raw.copy()

            # Relax the query
            relaxed_query.pop('genres', None)
            relaxed_query.pop('AllPeople', None)

            # If still no results, remove StreamingServices
            if 'StreamingServices' in relaxed_query:
                relaxed_query.pop('StreamingServices')

            print("Relaxed Query:", relaxed_query)

            raw_movies = list(movies_collection.find(
                relaxed_query).sort("averageRating", -1).limit(5))
            print("Relaxed Attempt Recommendations:", raw_movies)
        if not raw_movies:
            return jsonify({"message": "No recommendations found."}), 404

        # Step 3: Ask Gemini to rank + explain
        movies_for_ranking = [
            {
                "primaryTitle": m.get("primaryTitle", ""),
                "genres": m.get("genres", []),
                "startYear": m.get("startYear", ""),
                "averageRating": m.get("averageRating", ""),
                "AllPeople": m.get("AllPeople", ""),
                "Tropes": m.get("Trope", []),
                "Duration": m.get("runtimeMinutes", ""),
            }
            for m in raw_movies
        ]
        
        ranking_prompt = (
            f"The user asked: \"{natural_query}\".\n\n"
            f"Here are candidate movies from our database:\n\n"
            f"{movies_for_ranking}\n\n"
            f"Your task:\n"
            f"- Select the 20 movies that best match the user's intent.\n"
            f"- Base your reasoning both on the provided metadata (genres, rating, people, year) and your own knowledge about the movies.\n"
            f"- For each selected movie, give:\n"
            f"   - \"primaryTitle\": the movie title.\n"
            f"   - \"reason\": a short, thoughtful explanation why this movie suits the user request.\n"
            f"   - Please write the reason in 2nd person perspective, as if you are speaking directly to the user.\n"
            f"\n"
            f"Formatting instructions:\n"
            f"- Respond with a valid JSON array only.\n"
            f"- Example:\n"
            f"[{{\"primaryTitle\": \"Movie Name\", \"reason\": \"short explanation\"}}, ...]\n"
            f"\n"
            f"Important guidelines:\n"
            f"- Do NOT just rephrase the movie metadata.\n"
            f"- If possible, reference plot themes, tone, style, critical reception, or audience appeal.\n"
            f" - Please prefer american movies, but if the user is looking for a specific country, please include that country.\n"
            f"- Be concise but meaningful."
        )

        payload = {"contents": [{"parts": [{"text": ranking_prompt}]}]}
        response = requests.post(gemini_url, headers=headers, json=payload)
        response.raise_for_status()

        response_json = response.json()
        ranked_response_text = response_json["candidates"][0]["content"]["parts"][0]["text"]

        print("🔍 Gemini Ranked Output:\n", ranked_response_text)

        # Clean & Parse Gemini's ranked output
        ranked_response_cleaned = ranked_response_text.strip()
        if ranked_response_cleaned.startswith("```") and "json" in ranked_response_cleaned:
            ranked_response_cleaned = '\n'.join(
                line for line in ranked_response_cleaned.splitlines()
                if not line.strip().startswith("```")
            )
        
        ranked_movies = ast.literal_eval(ranked_response_cleaned)

        # Step 4: Map title to full movie data
        title_to_movie = { m["primaryTitle"]: m for m in raw_movies }

        final_recommendations = []
        for ranked in ranked_movies:
            title = ranked.get("primaryTitle")
            reason = ranked.get("reason")
            movie = title_to_movie.get(title)
            if movie:
                final_recommendations.append({
                    "primaryTitle": movie.get("primaryTitle"),
                    "startYear": movie.get("startYear"),
                    "averageRating": movie.get("averageRating"),
                    "genres": movie.get("genres", []),
                    "AllPeople": movie.get("AllPeople", []),
                    "StreamingServices": movie.get("StreamingServices", []),
                    "Tropes": movie.get("Tropes", []),
                    "llmExplanation": reason,
                    "duration": movie.get("runtimeMinutes", ""),
                })

        return jsonify({
            "recommendations": final_recommendations,
            "parsedQuery": updated_query_raw
        }), 200

    except Exception as e:
        print(f"🔥 Error in /recommendationsv2: {e}")
        return jsonify({"message": "Error processing natural language recommendation."}), 500
