import React, { useState } from 'react';
import axios from 'axios';

export default function MovieRecommender() {
  const [genres, setGenres] = useState('');
  const [actors, setActors] = useState('');
  const [minRating, setMinRating] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [originalPrefs, setOriginalPrefs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setFeedbackSent(false);
    setRecommendations([]);

    const userPrefs = {
      genres,
      actors,
      min_rating: minRating ? parseFloat(minRating) : 0
    };

    try {
      const res = await axios.post('http://localhost:5000/api/recommend', userPrefs);
      setRecommendations(res.data.recommendations);
      setOriginalPrefs(userPrefs);
    } catch (err) {
      console.error(err);
      alert('Something went wrong!');
    } finally {
      setLoading(false);
    }
  };

  const sendFeedback = async () => {
    if (!feedback) return;
    try {
      await axios.post('http://localhost:5000/api/feedback', {
        feedback,
        originalPreferences: originalPrefs
      });
      setFeedbackSent(true);
      setFeedback('');  // Clear feedback after submission
    } catch (err) {
      console.error(err);
      alert('Failed to send feedback');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🎬 Cinematch</h1>

      <div className="space-y-4">
        <input
          className="w-full border p-2 rounded"
          placeholder="Preferred genres (comma-separated)"
          value={genres}
          onChange={(e) => setGenres(e.target.value)}
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="Favorite actors (comma-separated)"
          value={actors}
          onChange={(e) => setActors(e.target.value)}
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="Minimum rating (0-10)"
          type="number"
          value={minRating}
          onChange={(e) => setMinRating(e.target.value)}
          min="0"
          max="10"
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={handleSubmit}
          disabled={loading || !minRating}
        >
          {loading ? 'Generating...' : 'Get Recommendations'}
        </button>
      </div>

      {recommendations.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Top Recommendations:</h2>
          <ul className="space-y-3">
            {recommendations.map((movie, idx) => (
              <li key={idx} className="border p-3 rounded bg-gray-50">
                <strong>{movie.primaryTitle}</strong> ({movie.startYear})<br />
                Rating: {movie.averageRating} | Genres: {movie.genres.join(', ')}<br />
                Actors: {movie.AllPeople.join(', ')}
              </li>
            ))}
          </ul>

          <div className="mt-4">
            <textarea
              className="w-full border p-2 rounded"
              placeholder="What did you think of these recommendations?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <button
              className="mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              onClick={sendFeedback}
              disabled={!feedback}
            >
              Send Feedback
            </button>
            {feedbackSent && <p className="text-green-600 mt-2">Thanks for your feedback!</p>}
          </div>
        </div>
      )}
    </div>
  );
}
