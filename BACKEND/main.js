const express = require('express');
const cors = require('cors');
const { OpenAI } = require("openai");
const { google } = require("googleapis");
const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

let calendar;

// Initialize calendar client
async function initializeCalendarClient(auth) {
  calendar = google.calendar({ version: 'v3', auth });
  return calendar;
}

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

// OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
});

async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

async function generateSchedule(prompt, attendees) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ 
        role: "user", 
        content: `Extract event details and attendee emails from this prompt. Include all mentioned email addresses as attendees: ${prompt}` 
      }],
      functions: [
        {
          name: "create_schedule",
          description: "Create a schedule of events with detailed descriptions and attendees",
          parameters: {
            type: "object",
            properties: {
              events: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    summary: { type: "string" },
                    description: { type: "string" },
                    start: { type: "string", format: "date-time" },
                    end: { type: "string", format: "date-time" },
                    timeZone: { type: "string" },
                    attendees: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          email: { type: "string" }
                        }
                      }
                    }
                  },
                  required: ["summary", "start", "end", "timeZone", "description"]
                }
              }
            },
            required: ["events"]
          }
        }
      ],
      function_call: { name: "create_schedule" }
    });

    const functionCall = response.choices[0]?.message?.function_call;
    if (!functionCall || !functionCall.arguments) {
      throw new Error('Invalid response from OpenAI');
    }

    const parsedData = JSON.parse(functionCall.arguments);
    return parsedData;
  } catch (error) {
    console.error('Error in generateSchedule:', error);
    throw error;
  }
}

async function modifyEvent(eventId, modificationPrompt) {
  if (!calendar) {
    throw new Error('Calendar client not initialized');
  }

  try {
    // 1. Get the existing event
    const existingEvent = await calendar.events.get({
      calendarId: 'primary',
      eventId: eventId,
    });

    console.log('Existing event:', existingEvent.data);

    // 2. Generate modifications using OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ 
        role: "user", 
        content: `Modify this event according to these changes. Return a complete event object with all required fields and preserve existing attendees unless explicitly modified:
        
        Current event: ${JSON.stringify(existingEvent.data)}
        
        Requested changes: ${modificationPrompt}`
      }],
      functions: [
        {
          name: "modify_event",
          description: "Modify an existing event with updated details",
          parameters: {
            type: "object",
            properties: {
              summary: { type: "string" },
              description: { type: "string" },
              start: { type: "string", format: "date-time" },
              end: { type: "string", format: "date-time" },
              timeZone: { type: "string" },
              attendees: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    email: { type: "string" }
                  }
                }
              }
            },
            required: ["summary", "description", "start", "end", "timeZone"]
          }
        }
      ],
      function_call: { name: "modify_event" }
    });

    const functionCall = response.choices[0]?.message?.function_call;
    if (!functionCall || !functionCall.arguments) {
      throw new Error('Invalid response from OpenAI');
    }

    const modifiedEventData = JSON.parse(functionCall.arguments);
    console.log('Modified event data:', modifiedEventData);

    // Ensure we have valid datetime strings
    if (!Date.parse(modifiedEventData.start) || !Date.parse(modifiedEventData.end)) {
      throw new Error('Invalid date format received from OpenAI');
    }

    // 3. Prepare the update data
    const updateData = {
      summary: modifiedEventData.summary,
      description: modifiedEventData.description,
      start: { 
        dateTime: modifiedEventData.start, 
        timeZone: modifiedEventData.timeZone || existingEvent.data.start.timeZone 
      },
      end: { 
        dateTime: modifiedEventData.end, 
        timeZone: modifiedEventData.timeZone || existingEvent.data.end.timeZone 
      },
      attendees: modifiedEventData.attendees || existingEvent.data.attendees || [],
    };

    console.log('Update data being sent:', updateData);

    // 4. Update the event
    const updatedEvent = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      sendUpdates: 'all',
      requestBody: updateData
    });

    return updatedEvent.data;
  } catch (error) {
    console.error('Detailed error in modifyEvent:', error);
    throw new Error(`Failed to modify event: ${error.message}`);
  }
}

async function generateModifiedEventDetails(originalEvent, modificationPrompt) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ 
        role: "user", 
        content: `Modify this event according to these changes. Return only the function call, no other text: ${modificationPrompt}` 
      }],
      functions: [
        {
          name: "modify_event",
          description: "Modify an existing event with updated details",
          parameters: {
            type: "object",
            properties: {
              summary: { type: "string" },
              description: { type: "string" },
              start: { type: "string", format: "date-time" },
              end: { type: "string", format: "date-time" },
              timeZone: { type: "string" },
              attendees: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    email: { type: "string" }
                  }
                }
              }
            },
            required: ["summary", "start", "end", "timeZone", "description"]
          }
        }
      ],
      function_call: { name: "modify_event" }
    });

    const functionCall = response.choices[0]?.message?.function_call;
    if (!functionCall || !functionCall.arguments) {
      throw new Error('Invalid response from OpenAI');
    }

    return JSON.parse(functionCall.arguments);
  } catch (error) {
    console.error('Error in generateModifiedEventDetails:', error);
    throw error;
  }
}

async function initializeServer() {
  try {
    const auth = await authorize();
    await initializeCalendarClient(auth);
    
    // API Endpoints
    app.get('/api/events', async (req, res) => {
      try {
        const response = await calendar.events.list({
          calendarId: 'primary',
          timeMin: new Date().toISOString(),
          timeMax: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          singleEvents: true,
          orderBy: 'startTime'
        });
        res.json(response.data.items);
      } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
      }
    });

    app.post('/api/generate-schedule', async (req, res) => {
      try {
        const { prompt, attendees } = req.body;
        console.log('Received attendees:', attendees); // Debug log
    
        const generatedData = await generateSchedule(prompt, attendees);
        console.log('Generated schedule with attendees:', generatedData); // Debug log
    
        const createdEvents = [];
        for (const event of generatedData.events) {
          const response = await calendar.events.insert({
            calendarId: 'primary',
            sendUpdates: 'all',
            requestBody: {
              summary: event.summary,
              description: event.description,
              start: { dateTime: event.start, timeZone: event.timeZone },
              end: { dateTime: event.end, timeZone: event.timeZone },
              attendees: event.attendees,
              guestsCanModify: true,
              guestsCanSeeOtherGuests: true,
            }
          });
          createdEvents.push(response.data);
        }
        
        res.json({ events: createdEvents });
      } catch (error) {
        console.error('Error details:', error);
        res.status(500).json({ 
          error: 'Failed to generate schedule', 
          details: error.message 
        });
      }
    });

    app.put('/api/events/:eventId', async (req, res) => {
      try {
        const { eventId } = req.params;
        const { prompt } = req.body;
        
        if (!eventId || !prompt) {
          return res.status(400).json({ 
            error: 'Missing required parameters',
            details: 'Both eventId and prompt are required'
          });
        }
    
        console.log('Modifying event:', eventId);
        console.log('Modification prompt:', prompt);
    
        const modifiedEvent = await modifyEvent(eventId, prompt);
        console.log('Successfully modified event:', modifiedEvent.id);
        
        res.json(modifiedEvent);
      } catch (error) {
        console.error('Error in PUT /api/events/:eventId:', error);
        res.status(500).json({ 
          error: 'Failed to update event',
          details: error.message
        });
      }
    });
    
    app.delete('/api/events/:eventId', async (req, res) => {
      try {
        const { eventId } = req.params;
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: eventId
        });
        res.json({ message: 'Event deleted successfully' });
      } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: 'Failed to delete event' });
      }
    });

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server initialization failed:', error);
    process.exit(1);
  }
}

initializeServer().catch(console.error);