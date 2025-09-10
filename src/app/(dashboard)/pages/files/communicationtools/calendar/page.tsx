"use client";
import Image from 'next/image';
import React, { useState, useEffect, useCallback } from 'react';
import { env } from '@/env';  

interface Event {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  targetClass: string;
  details: string;
  tags: string[];
  author: string;
  academicYearId: string;
  termId: string;
  classId: string;
  createdById: string;
  createdAt?: string;
  updatedAt?: string;
  type: 'event' | 'agenda';
}

type ViewType = 'month' | 'week' | 'day';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getWeekDays = (dateString: string): string[] => {
  const date = new Date(dateString);
  const day = date.getDay();
  const diff = date.getDate() - day;
  
  return Array(7).fill(0).map((_, i) => {
    const newDate = new Date(date);
    newDate.setDate(diff + i);
    return newDate.toISOString().split('T')[0];
  });
};

const formatDate = (dateStr: string | Date): string => {
  if (!dateStr) return '';
  
  // Handle different date formats
  if (typeof dateStr === 'string') {
    if (dateStr.includes('T')) {
      return dateStr.split('T')[0];
    } else if (dateStr.includes(' ')) {
      return dateStr.split(' ')[0];
    } else {
      return new Date(dateStr).toISOString().split('T')[0];
    }
  } else {
    return dateStr.toISOString().split('T')[0];
  }
};

const formatTime = (timeStr: string) => {
  if (!timeStr) return 'All Day';
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
};

const getDateOnly = (dateStr: string): string => {
  return dateStr.split(' ')[0];
};

const getEventTypeStyles = (tags: string[], type: string): string => {
  const typeColors: Record<string, string> = {
    'event': 'bg-green-100 text-green-800 border-l-4 border-green-500',
    'agenda': 'bg-green-100 text-blue-900 border-l-4 border-green-500'
  };
  return typeColors[type] || typeColors['event'];
};

const SchoolCalendar = () => {
  const [view, setView] = useState<ViewType>('month');
  const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [currentWeek, setCurrentWeek] = useState<string[]>(getWeekDays(selectedDate || new Date().toISOString().split('T')[0]));
  const [events, setEvents] = useState<Event[]>([]);
  const [agendas, setAgendas] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    setAccessToken(token);
  }, []);

  const fetchEvents = useCallback(async () => {
    if (!accessToken) {
      setError('Not authenticated');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/events`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      console.log('Events response:', data);
      
      if (data.data && data.data.event) {
        // Handle single event
        const event = data.data.event;
        const formattedEvent = {
          id: event.id,
          title: event.title,
          date: formatDate(event.date),
          startTime: event.time,
          endTime: event.endTime,
          targetClass: event.targetClass,
          details: event.details,
          author: event.author,
          tags: event.eventType ? [event.eventType] : ['other'],
          type: 'event' as const,
          classId: event.classId,
          academicYearId: event.academicYearId,
          termId: event.termId,
          createdById: event.createdById,
          updatedById: event.updatedById,
          isActive: event.isActive,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt
        };
        setEvents([formattedEvent]);
      } else if (data.data && Array.isArray(data.data.events)) {
        // Handle events array
        const formattedEvents = data.data.events.map((event: any) => ({
          id: event.id,
          title: event.title,
          date: formatDate(event.date),
          startTime: event.time,
          endTime: event.endTime,
          targetClass: event.targetClass,
          details: event.details,
          author: event.author,
          tags: event.eventType ? [event.eventType] : ['other'],
          type: 'event' as const,
          classId: event.classId,
          academicYearId: event.academicYearId,
          termId: event.termId,
          createdById: event.createdById,
          updatedById: event.updatedById,
          isActive: event.isActive,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt
        }));
        setEvents(formattedEvents);
      } else if (data.data && Array.isArray(data.data)) {
        // Handle direct array
        const formattedEvents = data.data.map((event: any) => ({
          id: event.id,
          title: event.title,
          date: formatDate(event.date),
          startTime: event.time,
          endTime: event.endTime,
          targetClass: event.targetClass,
          details: event.details,
          author: event.author,
          tags: event.eventType ? [event.eventType] : ['other'],
          type: 'event' as const,
          classId: event.classId,
          academicYearId: event.academicYearId,
          termId: event.termId,
          createdById: event.createdById,
          updatedById: event.updatedById,
          isActive: event.isActive,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt
        }));
        setEvents(formattedEvents);
      } else {
        console.error("Unexpected response format:", data);
        throw new Error('Invalid events response format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred fetching events');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  const fetchAgendas = useCallback(async () => {
    if (!accessToken) {
      setError('Not authenticated');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/agenda`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch agendas');
      }

      const data = await response.json();
      console.log('Agendas response:', data);
      
      if (data.data && data.data.agenda) {
        // Handle single agenda
        const agenda = data.data.agenda;
        const formattedAgenda = {
          id: agenda.id,
          title: agenda.title,
          date: formatDate(agenda.date),
          startTime: agenda.time,
          endTime: agenda.endTime,
          targetClass: agenda.targetClass,
          details: agenda.details,
          author: agenda.author,
          tags: ['agenda'],
          type: 'agenda' as const,
          classId: agenda.classId,
          academicYearId: agenda.academicYearId,
          termId: agenda.termId,
          createdById: agenda.createdById,
          updatedById: agenda.updatedById,
          isActive: agenda.isActive,
          createdAt: agenda.createdAt,
          updatedAt: agenda.updatedAt
        };
        setAgendas([formattedAgenda]);
      } else if (data.data && Array.isArray(data.data.agendas)) {
        // Handle agendas array
        const formattedAgendas = data.data.agendas.map((agenda: any) => ({
          id: agenda.id,
          title: agenda.title,
          date: formatDate(agenda.date),
          startTime: agenda.time,
          endTime: agenda.endTime,
          targetClass: agenda.targetClass,
          details: agenda.details,
          author: agenda.author,
          tags: ['agenda'],
          type: 'agenda' as const,
          classId: agenda.classId,
          academicYearId: agenda.academicYearId,
          termId: agenda.termId,
          createdById: agenda.createdById,
          updatedById: agenda.updatedById,
          isActive: agenda.isActive,
          createdAt: agenda.createdAt,
          updatedAt: agenda.updatedAt
        }));
        setAgendas(formattedAgendas);
      } else if (data.data && Array.isArray(data.data)) {
        // Handle direct array
        const formattedAgendas = data.data.map((agenda: any) => ({
          id: agenda.id,
          title: agenda.title,
          date: formatDate(agenda.date),
          startTime: agenda.time,
          endTime: agenda.endTime,
          targetClass: agenda.targetClass,
          details: agenda.details,
          author: agenda.author,
          tags: ['agenda'],
          type: 'agenda' as const,
          classId: agenda.classId,
          academicYearId: agenda.academicYearId,
          termId: agenda.termId,
          createdById: agenda.createdById,
          updatedById: agenda.updatedById,
          isActive: agenda.isActive,
          createdAt: agenda.createdAt,
          updatedAt: agenda.updatedAt
        }));
        setAgendas(formattedAgendas);
      } else {
        console.error("Unexpected response format:", data);
        throw new Error('Invalid agendas response format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred fetching agendas');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchEvents();
    fetchAgendas();
  }, [fetchEvents, fetchAgendas]);

  const getAllEvents = () => {
    return [...events, ...agendas].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  };
  console.log("Current date:", selectedDate);
  console.log("Final events:", events);
  console.log("Events for today:", events.filter(e => e.date === selectedDate));
  const renderCalendarDays = () => {
    // Get the year and month from selectedDate (or today if not set)
    const baseDate = selectedDate ? new Date(selectedDate) : new Date();
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth(); // 0-indexed
    // Get number of days in the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const allEvents = getAllEvents();
    return days.map(day => {
      // Construct date string for each day in YYYY-MM-DD format
      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = allEvents.filter(event => event.date === dayStr);
      return (
        <div 
          key={day} 
          className={`p-2 border rounded-lg min-h-[80px] cursor-pointer hover:bg-gray-100 transition-colors ${
            selectedDate === dayStr ? 'bg-purple-50 border-purple-300' : 'bg-gray-50'
          }`} 
          onClick={() => { setView('day'); setSelectedDate(dayStr); }}
        >
          <span className="text-sm font-semibold">{day}</span>
          {dayEvents.map(event => (
            <div
              key={event.id}
              className={`text-xs mt-1 p-1 truncate rounded ${getEventTypeStyles([], event.type)}`}
            >
              {event.title}
              <span className="text-xs ml-1 ${
                event.type === 'event' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-blue-900 text-blue-100'
              } rounded px-1">
                {event.type === 'event' ? 'E' : 'A'}
              </span>
            </div>
          ))}
        </div>
      );
    });
  };

  const renderDayView = () => {
    if (!selectedDate) return null;
    
    const allEvents = getAllEvents();
    const eventsForDay = allEvents.filter(event => event.date === selectedDate);
    const formattedDate = formatDate(selectedDate);
    
    return (
      <div className="bg-white rounded-lg shadow-sm">
        <div className="bg-purple-600 text-white p-4 rounded-t-lg">
          <h3 className="text-xl font-semibold">{formattedDate}</h3>
        </div>
        
        <div className="p-4">
          {eventsForDay.length > 0 ? (
            <div className="space-y-4">
              {eventsForDay.map(event => (
                <div 
                  key={event.id} 
                  className={`p-4 rounded-lg shadow-sm ${getEventTypeStyles([], event.type)}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <h4 className="text-lg font-semibold">{event.title}</h4>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                        event.type === 'event' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-900 text-blue-100'
                      }`}>
                        {event.type === 'event' ? 'Event' : 'Agenda'}
                      </span>
                    </div>
                    <span className="text-sm font-medium px-2 py-1 bg-white rounded-full shadow-sm">
                      {formatTime(event.startTime)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">{event.details}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-600">{event.targetClass}</span>
                    <span className="text-xs text-gray-600">{event.author}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No events or agendas scheduled for this day.</p>
              <button 
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                onClick={() => setView('month')}
              >
                Back to Month View
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    return (
      <div className="bg-white rounded-lg shadow-sm">
        <div className="bg-purple-600 text-white p-4 rounded-t-lg flex justify-between items-center">
          <h3 className="text-xl font-semibold">Week of {formatDate(currentWeek[0])}</h3>
          <div className="flex space-x-2">
            <button 
              className="p-1 rounded-full hover:bg-purple-500 transition-colors"
              onClick={() => {
                const prevWeekDate = new Date(currentWeek[0]);
                prevWeekDate.setDate(prevWeekDate.getDate() - 7);
                setCurrentWeek(getWeekDays(prevWeekDate.toISOString()));
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button 
              className="p-1 rounded-full hover:bg-purple-500 transition-colors"
              onClick={() => {
                const nextWeekDate = new Date(currentWeek[0]);
                nextWeekDate.setDate(nextWeekDate.getDate() + 7);
                setCurrentWeek(getWeekDays(nextWeekDate.toISOString()));
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-2">
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, index) => (
              <div key={day} className="text-center font-semibold p-2 bg-gray-100 rounded">
                {day}
              </div>
            ))}
            
            {currentWeek.map(date => {
              const dayEvents = getAllEvents().filter(event => event.date === date);
              const day = new Date(date).getDate();
              const isToday = date === selectedDate;
              
              return (
                <div 
                  key={date} 
                  className={`min-h-[120px] p-2 border rounded ${
                    isToday ? 'bg-purple-50 border-purple-300' : 'bg-white'
                  }`} 
                  onClick={() => { setSelectedDate(date); setView('day'); }}
                >
                  <div className={`text-center text-sm font-medium mb-1 ${
                    isToday ? 'bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center mx-auto' : ''
                  }`}>
                    {day}
                  </div>
                  
                  <div className="space-y-1">
                    {dayEvents.map(event => (
                      <div
                        key={event.id}
                        className={`text-xs p-1 rounded truncate ${getEventTypeStyles([], event.type)}`}
                      >
                        <span className="font-semibold">{formatTime(event.startTime)}</span>
                        <div className="truncate">{event.title}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-100 p-4 min-h-screen">
      <div className="flex flex-col items-center mb-8">
       
        <h1 className="text-3xl font-bold text-gray-800">School Calendar</h1>
        <p className="text-lg text-gray-600">Agenda and Events</p>
      </div>

      <div className="container mx-auto flex flex-col lg:flex-row gap-6">
        <div className="w-full bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            {/* Dynamic month/year header */}
            <h2 className="text-2xl font-semibold text-purple-800">
              {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex space-x-2">
              {(['month', 'week', 'day'] as ViewType[]).map(v => (
                <button
                  key={v}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    view === v 
                      ? 'bg-purple-600 text-white shadow-md' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => setView(v)}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg overflow-hidden">
            {view === 'month' && (
              <>
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {weekDays.map(day => (
                    <div key={day} className="text-center font-semibold p-2 bg-purple-100 text-purple-800 rounded">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">{renderCalendarDays()}</div>
              </>
            )}
            {view === 'week' && renderWeekView()}
            {view === 'day' && renderDayView()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolCalendar;