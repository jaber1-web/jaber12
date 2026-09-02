import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { EventsPage } from './pages/EventsPage';
import { AttendancePage } from './pages/AttendancePage';
import { DirectoryPage } from './pages/DirectoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { CreateEventModal } from './components/CreateEventModal';
import { EditEventModal } from './components/EditEventModal';
import { ReportModal } from './components/ReportModal';
import { PdfPreviewModal } from './components/PdfPreviewModal';
import { AuthModal } from './components/AuthModal';

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const {
    persons,
    settings,
    createEvent,
    isCreateEventOpen,
    setIsCreateEventOpen,
    isEditEventOpen,
    setIsEditEventOpen,
    editingEvent,
    setEditingEvent,
    updateEvent,
    reportModalEvent,
    setReportModalEvent,
    pdfModalEvent,
    setPdfModalEvent,
    isAuthModalOpen,
    setIsAuthModalOpen,
  } = useApp();

  const getFontSizeClass = () => {
    switch (settings.fontSize) {
      case 'compact': return 'text-xs';
      case 'comfortable': return 'text-base';
      case 'normal':
      default:
        return 'text-sm';
    }
  };

  return (
    <div className={`min-h-screen bg-[#F8F9FA] text-[#1A1A1A] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900 ${getFontSizeClass()}`} dir="rtl">
      {/* Main Responsive Sidebar (Desktop Fixed Right, Mobile Slide-over Drawer) */}
      <Sidebar />

      {/* Main Pages Content Container (Offset by Sidebar width on lg+ screens) */}
      <div className="flex-1 lg:mr-72 flex flex-col min-w-0">
        <main className="flex-1 max-w-6xl w-full mx-auto p-3.5 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/events" replace />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/events/:eventId" element={<AttendancePage />} />
            <Route path="/people" element={<DirectoryPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/events" replace />} />
          </Routes>
        </main>
      </div>

      {/* Global Modals */}
      {isCreateEventOpen && (
        <CreateEventModal
          isOpen={isCreateEventOpen}
          onClose={() => setIsCreateEventOpen(false)}
          onCreateEvent={eventData => {
            const newEvt = createEvent(eventData);
            setIsCreateEventOpen(false);
            // Navigate directly to the newly created event's attendance page
            navigate(`/events/${newEvt.id}`);
          }}
          allPersons={persons}
        />
      )}

      {isEditEventOpen && editingEvent && (
        <EditEventModal
          isOpen={isEditEventOpen}
          onClose={() => {
            setIsEditEventOpen(false);
            setEditingEvent(null);
          }}
          event={editingEvent}
          onSave={(eventId, title, date, location, notes) => {
            updateEvent({
              ...editingEvent,
              title: title || editingEvent.title,
              date: date || editingEvent.date,
              location: location !== undefined ? location : editingEvent.location,
              notes: notes !== undefined ? notes : editingEvent.notes,
            });
            setIsEditEventOpen(false);
            setEditingEvent(null);
          }}
        />
      )}

      {reportModalEvent && (
        <ReportModal
          isOpen={!!reportModalEvent}
          onClose={() => setReportModalEvent(null)}
          event={reportModalEvent}
        />
      )}

      {pdfModalEvent && (
        <PdfPreviewModal
          isOpen={!!pdfModalEvent}
          onClose={() => setPdfModalEvent(null)}
          event={pdfModalEvent}
        />
      )}

      {/* Cloud Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
