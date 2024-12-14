import React from 'react';
import { Info } from 'lucide-react';

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

interface TimelineDashboardProps {
  events: Event[];
  onEventSelect: (event: Event) => void;
}

const TimelineDashboard: React.FC<TimelineDashboardProps> = ({ events, onEventSelect }) => {
  const handleEventClick = (event: Event) => {
    onEventSelect(event);
    // Scroll to schedule manager section
    const scheduleManager = document.getElementById('assistant-section');
    if (scheduleManager) {
      scheduleManager.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const formatEventTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatEventDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Timeline</h2>
        <div className="flex items-center text-sm text-gray-500">
          <Info size={16} className="mr-2" />
          Click any event to modify it
        </div>
      </div>
      
      <div className="space-y-4">
        {events.map((event) => (
          <div 
            key={event.id} 
            onClick={() => handleEventClick(event)}
            className="p-4 bg-white/5 rounded-lg border border-gray-700 hover:border-emerald-500 transition-colors duration-200 cursor-pointer"
          >
            <h3 className="text-lg font-medium mb-2">{event.summary}</h3>
            
            <div className="space-y-2 text-sm">
              <div className="text-gray-300">
                {formatEventDate(event.start.dateTime)}, {formatEventTime(event.start.dateTime)} - {formatEventTime(event.end.dateTime)}
              </div>

              {event.description && !event.description.includes('https://g.co/calendar') && (
                <p className="text-gray-400">{event.description}</p>
              )}
              
              {event.attendees && event.attendees.length > 0 && (
                <div className="text-gray-400">
                  <span className="font-medium">Attendees:</span>{' '}
                  {event.attendees.map((attendee: Attendee) => attendee.email).join(', ')}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {events.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No events scheduled
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineDashboard;