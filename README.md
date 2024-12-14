# Project Scheduler

By: Ashley Lin, Luke Lin, and Gloria Kao

## Introduction

This website integrates Google Calendar and uses GPT-4o-mini to help your group create a project timeline and schedule meetings.

## Detailed Description

The Project Scheduler consists of two main parts: the frontend and the backend.

### Frontend

The frontend is a React application located in the `my-app` directory. It includes components for displaying a timeline of events, scheduling meetings, generating schedules, and interacting with an AI assistant.

### Backend

The backend is an Express server located in the `BACKEND` directory. It handles authentication with Google Calendar, fetching and updating events, and generating schedules using the OpenAI API.

## Setup Process

### Prerequisites

- Node.js and npm installed on your machine.
- A Google Cloud project with the Google Calendar API enabled.
- OpenAI API key.

### Getting Credentials from Google Console

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing project.
3. Enable the Google Calendar API for your project.
4. Create OAuth 2.0 credentials:
   - Go to the "Credentials" page.
   - Click "Create Credentials" and select "OAuth 2.0 Client IDs".
   - Configure the consent screen if prompted.
   - Set the application type to "Web application".
   - Add `http://localhost:3000` to the "Authorized JavaScript origins".
   - Add `http://localhost:3001/oauth2callback` to the "Authorized redirect URIs".
   - Click "Create" and download the `credentials.json` file.
5. Place the `credentials.json` file in the `BACKEND` directory.

### Setting Up and Running the Code

1. Clone the repository:
   ```sh
   git clone https://github.com/ashylin/project-scheduler.git
   cd project-schedular
   ```

2. Install dependencies for both frontend and backend:
   ```sh
   cd my-app
   npm install
   cd ../BACKEND
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the `BACKEND` directory with the following content:
     ```
     OPEN_AI_API_KEY=your-openai-api-key
     ```

4. Run the backend server:
   ```sh
   cd BACKEND
   node main.js
   ```

5. Run the frontend application:
   ```sh
   cd my-app
   npm start
   ```

6. Open your browser and navigate to `http://localhost:3000` to use the Project Scheduler.
