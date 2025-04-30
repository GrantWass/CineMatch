# Cinematch

Cinematch is a movie recommendation application that helps users discover films based on their preferences. This repository contains both the frontend and backend components of the application.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Running the Application](#running-the-application)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Data Sources](#data-sources)
- [Features](#features)

## Overview

Cinematch provides personalized movie recommendations through natural language searches by analyzing various movie attributes including genres, cast, crew, rating, runtime, and tropes. The application also informs users which streaming platforms currently offer their recommended movies.

Installation
------------

To get started with Cinematch, clone the repository to your local machine:

```
git clone https://github.com/yourusername/Cinematch.git
cd cinematch
```

Running the Application
-----------------------

### Backend Setup

1.  Navigate to the backend directory:

```
cd cinematch-backend
```

2.  Start the backend server:

```
python app.py
```

The backend server will start running.

### Frontend Setup

1.  Open a new terminal window and navigate to the frontend directory:

```
cd cinematch
```

2.  Install the required dependencies:

```
npm install
```

3.  Start the development server:

```
npm run dev
```

The frontend development server will start, and you can access the application in your browser, typically at `http://localhost:3000`

Data Sources
------------

Cinematch utilizes data from several sources to provide comprehensive movie information:

1.  **IMDb Non-Commercial Datasets**:
    -   Source: <https://developer.imdb.com/non-commercial-datasets/>
    -   Used to obtain information about titles, cast and crew, start time, runtime, and genres
2.  **TV Tropes Dataset**:
    -   Source: <https://github.com/dhruvilgala/tvtropes>
    -   Used to obtain information about tropes associated with movies
3.  **Streaming Services Dataset**:
    -   Source: <https://www.kaggle.com/datasets/ruchi798/movies-on-netflix-prime-video-hulu-and-disney>
    -   Used to obtain streaming services where movies can be watched

Features
--------

-   Personalized movie recommendations based on user preferences through a natural language search
-   Detailed movie information including cast, crew, rating, and runtime
-   Streaming service availability for recommended movies
