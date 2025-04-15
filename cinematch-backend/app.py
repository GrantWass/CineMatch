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
        genres = user_prefs.get("genres", "").split(',')
        actors = user_prefs.get("actors", "").split(',')
        min_rating = float(user_prefs.get("min_rating", 0))

        # Build MongoDB query from user preferences
        query = {
            "genres": {"$in": genres},
            "averageRating": {"$gte": min_rating}
        }

        if actors:
            query["AllPeople"] = {"$in": actors}

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
            prompt = (
                f"Refine movie recommendations based on the following feedback: '{feedback}'. "
                f"The original preferences were: {json.dumps(original_preferences)}. "
                f"Provide 3-5 movie suggestions with brief justifications for each."
            )

            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

            payload = {
                "contents": [
                    {
                        "parts": [{"text": prompt}]
                    }
                ]
            }

            headers = {
                "Content-Type": "application/json"
            }

            response = requests.post(gemini_url, headers=headers, json=payload)
            response.raise_for_status()

            response_json = response.json()
            refined_response = response_json["candidates"][0]["content"]["parts"][0]["text"]

            return jsonify({"message": "Feedback received and processed.", "refinedRecommendations": refined_response}), 200
        else:
            return jsonify({"message": "Feedback or preferences are missing."}), 400
    except Exception as e:
        print(f"Error processing feedback: {e}")
        return jsonify({"message": "Error processing feedback."}), 500

if __name__ == '__main__':
    app.run(debug=True)
