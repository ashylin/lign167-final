import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { Moon, Sun, Calendar, MessageSquare } from 'lucide-react';
import TimelineDashboard from './components/TimelineDashboard';
import ScheduleGenerator from './components/ScheduleGenerator';
import './App.css';

const CLIENT_ID = '585382158344-32a6j55ffpoo5jskpc6oprpf69afnk4c.apps.googleusercontent.com';

interface Event {
  id?: string;
  summary: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  description?: string;
  attendees?: { email: string }[];
}

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const handleAuthSuccess = async (credentialResponse: any) => {
    setIsAuthenticated(true);
    fetchEvents();
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/events');
      const data = await response.json();
      console.log('Received events:', data);
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchEvents();
      const intervalId = setInterval(fetchEvents, 10000);
      return () => clearInterval(intervalId);
    }
  }, [isAuthenticated]);

  const handleNavClick = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'light' : 'dark');
  };

  const handleNewEvents = (newEvents: Event[]) => {
    setEvents(prevEvents => [...prevEvents, ...newEvents]);
  };

  const handleEventSelect = (event: Event) => {
    setSelectedEvent(event);
  };

  const handleEventModified = (modifiedEvent: Event) => {
    setEvents(prevEvents => 
      prevEvents.map(event => 
        event.id === modifiedEvent.id ? modifiedEvent : event
      )
    );
    setSelectedEvent(null);
  };

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <div className="app" data-theme={isDarkMode ? 'dark' : 'light'}>
        {isAuthenticated && (
          <aside className="sidebar">
            <h2>Calendar Assistant</h2>
            <nav className="sidebar-nav">
              <button 
                className="nav-button"
                onClick={() => handleNavClick('calendar-section')}
              >
                <Calendar className="icon" /> Calendar
              </button>
              <button 
                className="nav-button"
                onClick={() => handleNavClick('assistant-section')}
              >
                <MessageSquare className="icon" /> Assistant
              </button>
            </nav>
            <div className="theme-toggle-container">
              <button className="theme-toggle" onClick={toggleTheme}>
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </aside>
        )}
        
        <main className="main-content">
          {!isAuthenticated ? (
            <div className="login-container">
              <h1>Welcome to Calendar Assistant</h1>
              <p>Sign in with Google to manage your meetings and schedule</p>
              <div className="login-button-container">
                <GoogleLogin
                  onSuccess={handleAuthSuccess}
                  onError={() => console.log('Login Failed')}
                />
              </div>
            </div>
          ) : (
            <div className="dashboard">
              <div id="calendar-section" className="card">
                <TimelineDashboard 
                  events={events} 
                  onEventSelect={handleEventSelect}
                />
              </div>
              <div id="assistant-section" className="card">
                <ScheduleGenerator 
                  onEventsGenerated={handleNewEvents}
                  selectedEvent={selectedEvent}
                  onEventModified={handleEventModified}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </GoogleOAuthProvider>
  );
};

export default App;