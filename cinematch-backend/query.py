import requests
from flask import Flask, request, jsonify
import ast

def recommend_movies_v2(request, movies_collection, GEMINI_API_KEY):
    try:
        data = request.get_json()
        natural_query = data.get("natural_language_query", "").strip()
        streaming_services = data.get("streaming_services", [])
        
        if not natural_query:
            return jsonify({"message": "Missing natural_language_query"}), 400

        # Gemini Prompt
        prompt = (
            f"Convert this natural language movie request into a MongoDB query as a Python dict. "
            f"The fields available in the database are:\n"
            f" - genres (list of strings)\n"
            f" - AllPeople (list of actors and directors)\n"
            f" - averageRating (float)\n"
            f" - primaryTitle (string)\n\n"
            f" - SteamingServices (list of strings)\n\n"
            f" - runtimeMinutes (int)\n\n"
            f" - startYear (int)\n\n"
            f" - isAdult (0 or 1)\n\n"
            f"User request: \"{natural_query}\"\n\n"
            f"Also, filter by the following streaming services (if any): {streaming_services}\n\n"
            f"Prefer the newest movies with the highest rating"
            f"Respond only with the Python dictionary."
        )

        print("User Query:", natural_query)


        gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ]
        }
        headers = {"Content-Type": "application/json"}

        response = requests.post(gemini_url, headers=headers, json=payload)
        response.raise_for_status()

        response_json = response.json()
        raw_output = response_json["candidates"][0]["content"]["parts"][0]["text"]
        print("🔍 Gemini Raw Output:\n", raw_output)

        # Clean Gemini response
        cleaned_output = raw_output.strip()
        if cleaned_output.startswith("```") and "python" in cleaned_output:
            cleaned_output = '\n'.join(
                line for line in cleaned_output.splitlines()
                if not line.strip().startswith("```")
            )

        updated_query_raw = ast.literal_eval(cleaned_output)
        print("✅ Parsed Gemini Output:", updated_query_raw)

        # Query DB
        recommendations = list(movies_collection.find(updated_query_raw).limit(5))

        print("recs:", recommendations)

        if recommendations:
            return jsonify({
                "recommendations": [
                    {
                        "primaryTitle": m.get("primaryTitle"),
                        "startYear": m.get("startYear"),
                        "averageRating": m.get("averageRating"),
                        "genres": m.get("genres", []),
                        "AllPeople": m.get("AllPeople", []),
                        "StreamingServices": m.get("StreamingServices", [])
                    } for m in recommendations
                ],
                "parsedQuery": updated_query_raw
            }), 200
        else:
            return jsonify({"message": "No recommendations found."}), 404

    except Exception as e:
        print(f"🔥 Error in /recommendationsv2: {e}")
        return jsonify({"message": "Error processing natural language recommendation."}), 500