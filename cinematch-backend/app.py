import ast
from flask import Flask, request, jsonify
import pandas as pd
import json
import requests
import os
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv

# Initialize Flask app and CORS
app = Flask(__name__)
CORS(app)

# Load environment variables from .env
load_dotenv()

# Connect to MongoDB
connection_string = os.getenv("MONGO_DB_URI")
client = MongoClient(connection_string)
db = client.CineMatchDB
movies_collection = db.Movies

# Set up Gemini API key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


@app.route('/api/recommend', methods=['POST'])
def recommend_movies():
    try:
        # Get user preferences from request
        user_prefs = request.get_json()
        genres = [g.strip() for g in user_prefs.get(
            "genres", "").split(',') if g.strip()]
        actors = [a.strip() for a in user_prefs.get(
            "actors", "").split(',') if a.strip()]
        min_rating = float(user_prefs.get("min_rating", 0))
        streaming_services = user_prefs.get("streaming_services", [])

        # Build MongoDB query from user preferences
        query = {
            "averageRating": {"$gte": min_rating}
        }

        if genres:
            query["genres"] = {"$in": genres}

        if actors:
            query["AllPeople"] = {"$in": actors}

        if streaming_services:
            query["StreamingServices"] = {"$in": streaming_services}

        # Fetch recommendations from MongoDB
        recommendations = list(movies_collection.find(query).limit(5))

        # Check if we have recommendations
        if recommendations:
            response = {
                "recommendations": [
                    {
                        "primaryTitle": movie.get("primaryTitle"),
                        "startYear": movie.get("startYear"),
                        "averageRating": movie.get("averageRating"),
                        "genres": movie.get("genres", []),
                        "AllPeople": movie.get("AllPeople", []),
                        "StreamingServices": movie.get("StreamingServices", [])
                    } for movie in recommendations
                ]
            }
            return jsonify(response), 200
        else:
            return jsonify({"message": "No recommendations found for the given preferences."}), 404
    except Exception as e:
        print(f"Error during recommendation process: {e}")
        return jsonify({"message": "Error during recommendation process."}), 500


@app.route('/api/feedback', methods=['POST'])
def handle_feedback():
    try:
        data = request.get_json()
        feedback = data.get("feedback", "")
        original_preferences = data.get("originalPreferences", {})

        if feedback and original_preferences:
            # Construct prompt
            prompt = (
                f"A user provided feedback on movie recommendations. "
                f"The original MongoDB query was based on preferences: {json.dumps(original_preferences)}. "
                f"The feedback was: '{feedback}'. "
                f"Based on this, rewrite the MongoDB query filter (in Python dict format) to better match the user's taste. "
                f"Only return the updated MongoDB query dict, nothing else."
            )

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

            # Get Gemini raw output
            response_json = response.json()
            raw_output = response_json["candidates"][0]["content"]["parts"][0]["text"]
            print("🔍 Raw Gemini Output:\n", raw_output)

            # Clean Gemini response: remove code block formatting if present
            cleaned_output = raw_output.strip()
            if cleaned_output.startswith("```") and "python" in cleaned_output:
                cleaned_output = '\n'.join(
                    line for line in cleaned_output.splitlines()
                    if not line.strip().startswith("```")
                )

            # Try to parse and convert to MongoDB query
            try:
                updated_query_raw = ast.literal_eval(cleaned_output)
                print("✅ Parsed Gemini Output:", updated_query_raw)

                # Transform into proper MongoDB query
                updated_query = {}

                # Handle genres
                genres = updated_query_raw.get("genres")
                if genres:
                    updated_query["genres"] = {
                        "$in": [genres] if isinstance(genres, str) else genres}

                # Handle actors
                actors = updated_query_raw.get(
                    "actors") or updated_query_raw.get("AllPeople")
                if actors:
                    updated_query["AllPeople"] = {
                        "$in": [actors] if isinstance(actors, str) else actors}

                # Handle rating
                min_rating = updated_query_raw.get(
                    "min_rating") or updated_query_raw.get("averageRating")
                if min_rating is not None:
                    updated_query["averageRating"] = {
                        "$gte": float(min_rating)}

                # Handle title or other filters
                if "title" in updated_query_raw:
                    updated_query["primaryTitle"] = updated_query_raw["title"]

                print("🛠️ Final MongoDB Query:", updated_query)

            except Exception as e:
                print("❌ Failed to parse Gemini response into dict:", e)
                return jsonify({
                    "message": "Failed to parse Gemini response.",
                    "rawGeminiResponse": raw_output
                }), 500

            # Run the updated query
            new_recommendations = list(
                movies_collection.find(updated_query).limit(5))

            print("🎬 New Recommendations:")
            for movie in new_recommendations:
                print({
                    "primaryTitle": movie.get("primaryTitle"),
                    "startYear": movie.get("startYear"),
                    "averageRating": movie.get("averageRating"),
                    "genres": movie.get("genres", []),
                    "AllPeople": movie.get("AllPeople", []),
                    "StreamingServices": movie.get("StreamingServices", [])
                })

            return jsonify({
                "message": "Refined recommendations based on feedback.",
                "recommendations": [
                    {
                        "primaryTitle": movie.get("primaryTitle"),
                        "startYear": movie.get("startYear"),
                        "averageRating": movie.get("averageRating"),
                        "genres": movie.get("genres", []),
                        "AllPeople": movie.get("AllPeople", []),
                        "StreamingServices": movie.get("StreamingServices", [])
                    } for movie in new_recommendations
                ],
                "parsedQuery": updated_query
            }), 200
        else:
            return jsonify({"message": "Feedback or preferences are missing."}), 400
    except Exception as e:
        print(f"Error processing feedback: {e}")
        return jsonify({"message": "Error processing feedback."}), 500


if __name__ == '__main__':
    app.run(debug=True)
