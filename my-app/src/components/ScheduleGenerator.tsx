import React, { useState } from 'react';

interface Attendee {
  email: string;
}

interface Event {
  id?: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees?: Attendee[];
}

interface ScheduleGeneratorProps {
  onEventsGenerated: (events: Event[]) => void;
  selectedEvent: Event | null;
  onEventModified: (event: Event) => void;
}

const ScheduleGenerator: React.FC<ScheduleGeneratorProps> = ({ 
  onEventsGenerated, 
  selectedEvent,
  onEventModified 
}) => {
  const [prompt, setPrompt] = useState('');
  const [modificationPrompt, setModificationPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Extract email addresses from the prompt using regex
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const attendeeEmails = prompt.match(emailRegex) || [];
      const attendees = attendeeEmails.map(email => ({ email }));

      const response = await fetch('http://localhost:3001/api/generate-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt,
          attendees 
        }),
      });

      if (!response.ok) throw new Error('Failed to generate schedule');

      const data = await response.json();
      onEventsGenerated(data.events);
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModifyEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:3001/api/events/${selectedEvent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: modificationPrompt,
          eventId: selectedEvent.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to modify event');
      }

      const modifiedEvent = await response.json();
      onEventModified(modifiedEvent);
      setModificationPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">Schedule Manager</h2>
      
      {!selectedEvent ? (
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Tips: 
              - Include attendee emails in your prompt
              - Specify timezone (e.g., PST, EST)
              - Include specific dates and times
            </p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your schedule requirements (include attendee emails)..."
              className="w-full p-2 border rounded"
              rows={4}
            />
          </div>
          {error && <div className="text-red-500 mb-4">{error}</div>}
          <button 
            type="submit" 
            disabled={isLoading || !prompt.trim()}
            className="w-full py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isLoading ? 'Generating...' : 'Generate Schedule'}
          </button>
        </form>
      ) : (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">
            Modify Event: {selectedEvent.summary}
          </h3>
          <form onSubmit={handleModifyEvent}>
            <textarea
              value={modificationPrompt}
              onChange={(e) => setModificationPrompt(e.target.value)}
              placeholder="Describe how you want to modify this event (e.g., 'Move this to tomorrow at 3pm', 'Add john@example.com as an attendee')"
              className="w-full p-2 border rounded mb-4"
              rows={4}
            />
            {error && <div className="text-red-500 mb-4">{error}</div>}
            <div className="button-group">
              <button
                type="button"
                onClick={() => onEventModified(selectedEvent)}
                className="cancel-button"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !modificationPrompt.trim()}
                className="update-button"
              >
                {isLoading ? 'Updating...' : 'Update Event'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ScheduleGenerator;