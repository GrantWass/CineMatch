import React, { useState } from 'react';
import axios from 'axios';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import './MovieRecommender.css';

export default function MovieRecommender() {
  const [genres, setGenres] = useState('');
  const [actors, setActors] = useState('');
  const [minRating, setMinRating] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [originalPrefs, setOriginalPrefs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleSubmit = async () => {
    setLoading(true);
    setFeedbackSent(false);
    setRecommendations([]);
    setCurrentIndex(0);

    const userPrefs = {
      genres,
      actors,
      min_rating: minRating ? parseFloat(minRating) : 0,
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
        originalPreferences: originalPrefs,
      });
      setFeedbackSent(true);
      setFeedback('');
    } catch (err) {
      console.error(err);
      alert('Failed to send feedback');
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? recommendations.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === recommendations.length - 1 ? 0 : prev + 1));
  };

  const currentMovie = recommendations[currentIndex];

  return (
    <div className="recommender-container">
      <h1 className="title">🎬 Cinematch</h1>

      <div className="form">
        <input
          className="input"
          placeholder="Preferred genres (comma-separated)"
          value={genres}
          onChange={(e) => setGenres(e.target.value)}
        />
        <input
          className="input"
          placeholder="Favorite actors (comma-separated)"
          value={actors}
          onChange={(e) => setActors(e.target.value)}
        />
        <input
          className="input"
          placeholder="Minimum rating (0-10)"
          type="number"
          value={minRating}
          onChange={(e) => setMinRating(e.target.value)}
          min="0"
          max="10"
        />
        <button
          className="button submit-button"
          onClick={handleSubmit}
          disabled={loading || !minRating}
        >
          {loading ? 'Generating...' : 'Get Recommendations'}
        </button>
      </div>

      {recommendations.length > 0 && (
        <div className="recommendation-section">
          <h2 className="section-title">Top Recommendations</h2>

          <div className="recommendation-card">
            <div className="nav-arrow left" onClick={handlePrev}>
              <ArrowLeft />
            </div>

            <div>
              <h3 className="movie-title">{currentMovie.primaryTitle}</h3>
              <p className="movie-year">({currentMovie.startYear})</p>
              <p className="movie-rating">⭐ {currentMovie.averageRating}</p>
              <p className="movie-detail">
                <strong>Genres:</strong> {currentMovie.genres.join(', ')}
              </p>
              <p className="movie-detail">
                <strong>Relevant People:</strong> {currentMovie.AllPeople.join(', ')}
              </p>
              {currentMovie.StreamingServices && currentMovie.StreamingServices.length > 0 && (
                <p className="movie-detail">
                  <strong>Available On:</strong> {currentMovie.StreamingServices.join(', ')}
                </p>
              )}
            </div>

            <div className="nav-arrow right" onClick={handleNext}>
              <ArrowRight />
            </div>
          </div>

          <div className="feedback">
            <textarea
              className="feedback-input"
              placeholder="What did you think of these recommendations?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <button
              className="button feedback-button"
              onClick={sendFeedback}
              disabled={!feedback}
            >
              Send Feedback
            </button>
            {feedbackSent && <p className="feedback-message">Thanks for your feedback!</p>}
          </div>
        </div>
      )}
    </div>
  );
}
