'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { env } from '@/env'
import { supabase } from '../../../../../../lib/supabaseClient'
import DialogBox from '@/components/Dailogbox'

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName?: string;
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  type: 'sent' | 'received';
  isRead: boolean;
  createdAt: string;
}

interface ContactOption {
  value: string;
  label: string;
  role?: string;
  recipient_type: 'staff' | 'parent' | 'student';
  guardian_name?: string;
  guardian_relationship?: string;
  studentName?: string;
  studentClass?: string;
}

// Contact types for tab selection
type ContactType = 'teacher' | 'staff' | 'parent' | 'student' | 'all';

// Base API URL
const API_BASE = `${env.BACKEND_API_URL}/api/v1`;

export default function Communications() {
  // Get current user info from localStorage
  const getUserInfo = useCallback(() => {
    try {
      // First try getting from 'userInfo'
      let userInfo = localStorage.getItem('userInfo');
      
      // If not found, try getting from 'user' (as used in Login component)
      if (!userInfo) {
        userInfo = localStorage.getItem('user');
      }
      
      if (userInfo) {
        return JSON.parse(userInfo);
      }
    } catch (err) {
      console.error('Failed to parse user info:', err);
    }
    return null;
  }, []);

  // Get current user ID - memoized to prevent unnecessary re-renders
  const getCurrentUserId = useCallback(() => {
    const userInfo = getUserInfo();
    return userInfo?.id || '';
  }, [getUserInfo]);

  // Get current user name - memoized to prevent unnecessary re-renders
  const getCurrentUserName = useCallback(() => {
    const userInfo = getUserInfo();
    if (!userInfo) return 'You';
    return `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim() || 'You';
  }, [getUserInfo]);

  // States
  const [userRole, setUserRole] = useState<'staff' | 'parent' | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactOption | null>(null);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<ContactOption[]>([]);
  const [selectedContactType, setSelectedContactType] = useState<ContactType>('all');
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Add dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogType, setDialogType] = useState<'delete' | 'warning' | 'info'>('info');
  const [confirmText, setConfirmText] = useState('OK');
  const [cancelText, setCancelText] = useState('Cancel');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Detect user role on component mount
  useEffect(() => {
    const userInfo = getUserInfo();
    if (userInfo) {
      // First check the userRole property directly (from Login component)
      if (userInfo.role) {
        const role = userInfo.role.toLowerCase();
        if (['teacher', 'admin', 'bursar', 'staff'].includes(role)) {
          setUserRole('staff');
        } else if (role === 'parent' || role === 'guardian') {
          setUserRole('parent');
        }
      } else {
        // Fallback to checking role property
        if (['teacher', 'admin', 'bursar', 'staff'].includes((userInfo.role || '').toLowerCase())) {
          setUserRole('staff');
        } else if ((userInfo.role || '').toLowerCase() === 'parent' || (userInfo.role || '').toLowerCase() === 'guardian') {
          setUserRole('parent');
        }
      }
    } else {
      // Check if we need to redirect to login
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        // User not authenticated, redirect to login
        window.location.href = '/sign-in'; 
      }
    }
  }, [getUserInfo]);

  // Enhanced interface for student data with guardian information
  interface StudentContact extends ContactOption {
    guardian_name?: string;
    guardian_relationship?: string;
  }

  // Fetch contacts based on user role and selected contact type
  const fetchContacts = useCallback(async () => {
    if (!selectedContactType || selectedContactType === 'all') {
      return; // Don't fetch if no specific type is selected
    }
    
    setLoadingContacts(true);
    setContactsError(null);
    
    try {
      const token = localStorage.getItem('accessToken');
      let endpoint = '';
      
      // Determine endpoint based on selected contact type
      if (selectedContactType === 'student' || selectedContactType === 'parent') {
        // For students or parents, use the students endpoint to get guardian info
        endpoint = `${env.BACKEND_API_URL}/api/v1/students/filter?page=1&pageSize=10000`;
      } else {
        // For staff and teachers, use the users endpoint
        endpoint = `${env.BACKEND_API_URL}/api/v1/integration/users?page=1&pageSize=50`;
      }
      
      console.log(`Fetching contacts from: ${endpoint} for type: ${selectedContactType}`);
      
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch contacts: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API response:', data);
      
      let contactOptions: (ContactOption | StudentContact)[] = [];
      
      if (selectedContactType === 'student') {
        // Process students data with guardian information
        const students = data.data?.students || [];
        console.log(`Found ${students.length} students`);
        
        contactOptions = students.map((student: any) => ({
          value: student.id,
          label: `${student.first_name || ''} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name || ''} (${student.class_assigned || ''})`,
          role: 'student',
          recipient_type: 'student',
          guardian_name: student.guardian1_name || student.guardian2_name || 'N/A',
          guardian_relationship: student.guardian1_relationship || student.guardian2_relationship || 'N/A'
        }));
      } else if (selectedContactType === 'parent') {
        // For parent type, create options from student guardian information
        const students = data.data?.students || [];
        console.log(`Found ${students.length} students' guardians`);
        
        // Create unique parent entries from guardian information
        const parentMap = new Map();
        
        students.forEach((student: any) => {
          // Add guardian 1 if available
          if (student.guardian1_name) {
            const guardianKey = `${student.guardian1_name}-${student.guardian1_phone1 || 'no-phone'}`;
            
            if (!parentMap.has(guardianKey)) {
              parentMap.set(guardianKey, {
                value: `parent-${student.id}-1`, // Create a unique ID
                label: `${student.guardian1_name} (${student.guardian1_relationship || 'Guardian'} of ${student.first_name || ''}${student.middle_name ? ' ' + student.middle_name : ''}${student.last_name ? ' ' + student.last_name : ''}${student.class_assigned ? ' - ' + student.class_assigned : ''})`,
                role: 'parent',
                recipient_type: 'parent',
                studentName: `${student.first_name || ''}${student.middle_name ? ' ' + student.middle_name : ''}${student.last_name ? ' ' + student.last_name : ''}`,
                studentClass: student.class_assigned || 'No Class'
              });
            }
          }
          
          // Add guardian 2 if available and different from guardian 1
          if (student.guardian2_name && student.guardian2_name !== student.guardian1_name) {
            const guardianKey = `${student.guardian2_name}-${student.guardian2_phone1 || 'no-phone'}`;
            
            if (!parentMap.has(guardianKey)) {
              parentMap.set(guardianKey, {
                value: `parent-${student.id}-2`, // Create a unique ID
                label: `${student.guardian2_name} (${student.guardian2_relationship || 'Guardian'} of ${student.first_name || ''}${student.middle_name ? ' ' + student.middle_name : ''}${student.last_name ? ' ' + student.last_name : ''}${student.class_assigned ? ' - ' + student.class_assigned : ''})`,
                role: 'parent',
                recipient_type: 'parent',
                studentName: `${student.first_name || ''}${student.middle_name ? ' ' + student.middle_name : ''}${student.last_name ? ' ' + student.last_name : ''}`,
                studentClass: student.class_assigned || 'No Class'
              });
            }
          }
        });
        
        contactOptions = Array.from(parentMap.values());
      } else {
        // Process users data
        const users = data.data?.users || [];
        console.log(`Found ${users.length} users`);
        
        if (selectedContactType === 'teacher') {
          // Filter to only teachers
          const teacherUsers = users.filter((user: any) => 
            (user.role || '').toLowerCase() === 'teacher'
          );
          
          console.log(`Found ${teacherUsers.length} teachers`);
          
          contactOptions = teacherUsers.map((user: any) => ({
            value: user.id,
            label: `${user.first_name || ''} ${user.last_name || ''} (${user.section || 'Teacher'})`,
            role: user.role || '',
            recipient_type: 'staff'
          }));
        } else if (selectedContactType === 'staff') {
          // Filter to staff excluding teachers
          const staffUsers = users.filter((user: any) => 
            ['admin', 'bursar', 'staff'].includes((user.role || '').toLowerCase())
          );
          
          console.log(`Found ${staffUsers.length} staff members`);
          
          contactOptions = staffUsers.map((user: any) => ({
            value: user.id,
            label: `${user.first_name || ''} ${user.last_name || ''} (${user.role || ''})`,
            role: user.role || '',
            recipient_type: 'staff'
          }));
        }
      }
      
      console.log(`Setting ${contactOptions.length} contact options`);
      setContacts(contactOptions);
      setFilteredContacts(contactOptions);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setContactsError('Failed to load contacts');
    } finally {
      setLoadingContacts(false);
    }
  }, [selectedContactType]);
  
  // Fetch contacts when user role or contact type changes
  useEffect(() => {
    if (userRole && selectedContactType) {
      fetchContacts();
    }
  }, [userRole, selectedContactType, fetchContacts]);
  
  // Filter contacts based on selected type
  useEffect(() => {
    if (contacts.length === 0) return;
    
    // When a specific type is selected, contacts are already filtered by the API call
    // Just use the contacts directly
    setFilteredContacts(contacts);
    
  }, [contacts, selectedContactType]);

  // Fetch messages function
  const fetchMessages = useCallback(async (recipientId: string) => {
    setLoadingMessages(true);
    try {
      const token = localStorage.getItem('accessToken');
      const userId = getCurrentUserId();
      const currentUserName = getCurrentUserName();
      
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/chats/history?senderId=${userId}&recipientId=${recipientId}&page=1&pageSize=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Process messages and identify sent vs received
      const messagesList = data.data?.messages || [];
      
      const processedMessages = messagesList.map((msg: any) => {
        const isSent = msg.senderId === userId;
        return {
          ...msg,
          type: isSent ? 'sent' : 'received',
          // If the current user sent it, use current user's name, otherwise use the contact's name
          senderName: isSent ? currentUserName : selectedContact?.label.split(' (')[0]
        };
      });
      
      setMessages(processedMessages);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [getCurrentUserId, getCurrentUserName, selectedContact]);

  // Fetch chat messages when contact selected
  useEffect(() => {
    if (selectedContact) fetchMessages(selectedContact.value);
  }, [selectedContact, fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle contact type selection
  const handleContactTypeChange = (type: ContactType) => {
    setSelectedContactType(type);
    setSelectedContact(null); // Reset selected contact when changing type
    setContacts([]); // Clear current contacts
    setFilteredContacts([]); // Clear filtered contacts
  };

  // Send a new message
  async function handleSendMessage() {
    if (!selectedContact) return;
    if (!messageInput.trim() && !file) {
      showErrorDialog('Validation Error', 'Please enter a message or attach a file.');
      return;
    }
    
    const token = localStorage.getItem('accessToken');
    const userId = getCurrentUserId();
    let fileUrl = null, fileName = null, fileType = null;
    
    if (file) {
      // Upload the file to our API endpoint
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const uploadResponse = await fetch('/api/messages', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file');
        }
        
        const uploadResult = await uploadResponse.json();
        fileUrl = uploadResult.path; // Use the path returned from the server
        fileName = uploadResult.fileName;
        fileType = file.type;
      } catch (error) {
        console.error('Error uploading file:', error);
        showErrorDialog('Upload Error', 'Failed to upload file. Please try again.');
        return; // Exit the function if file upload fails
      }
    }
    
    const payload = {
      senderId: userId,
      recipientId: selectedContact.value,
      content: messageInput.trim() || null,
      fileUrl,
      fileName,
      fileType
    };
    
    try {
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/chats/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send message: ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success' || data.status?.returnCode === '00') {
        // Add the new message to the state
        const newMessage = {
          ...data.data.message,
          type: 'sent', // Since we sent this message
          senderName: getCurrentUserName() // Add sender name
        };
        
        setMessages(prev => [...prev, newMessage]);
        setMessageInput('');
        setFile(null);
      } else {
        showErrorDialog('Send Error', data.message || data.status?.returnMessage || 'Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      showErrorDialog('Send Error', 'Failed to send message');
    }
  }

  // Handle editing a message
  function handleEditMessage(message: Message) {
    setEditingMessageId(message.id);
    setEditingContent(message.content || '');
  }

  // Save edited message
  async function saveEditMessage(messageId: string) {
    const token = localStorage.getItem('accessToken');
    try {
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/chats/message/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: editingContent })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to edit message: ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success' || data.status?.returnCode === '00') {
        setMessages(prev =>
          prev.map(msg => msg.id === messageId ? { ...msg, content: editingContent } : msg)
        );
        setEditingMessageId(null);
        setEditingContent('');
      } else {
        showErrorDialog('Edit Error', data.message || data.status?.returnMessage || 'Failed to edit message');
      }
    } catch (err) {
      console.error('Error editing message:', err);
      showErrorDialog('Edit Error', 'Failed to edit message');
    }
  }

  // Delete a message
  async function handleDeleteMessage(message: Message) {
    showConfirmDialog(
      'Delete Message',
      'Are you sure you want to delete this message?',
      'delete',
      'Delete',
      'Cancel',
      () => performDeleteMessage(message)
    );
  }

  // Perform the actual delete operation
  async function performDeleteMessage(message: Message) {
    const token = localStorage.getItem('accessToken');
    try {
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/chats/message/${message.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete message: ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success' || data.status?.returnCode === '00') {
        setMessages(prev => prev.filter(msg => msg.id !== message.id));
      } else {
        showErrorDialog('Delete Error', data.message || data.status?.returnMessage || 'Failed to delete message');
      }
    } catch (err) {
      console.error('Error deleting message:', err);
      showErrorDialog('Delete Error', 'Failed to delete message');
    }
  }

  // Handle contact selection
  const handleContactSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const contactId = e.target.value;
    if (contactId) {
      const contact = contacts.find(c => c.value === contactId);
      if (contact) {
        setSelectedContact(contact);
      } else {
        setSelectedContact(null);
      }
    } else {
      setSelectedContact(null);
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFile(file || null);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get page title based on user role
  const getPageTitle = () => {
    if (userRole === 'staff') {
      return 'Staff Communications';
    } else if (userRole === 'parent') {
      return 'Parent Communications';
    }
    return 'School Communications';
  };

  // Get page subtitle based on user role
  const getPageSubtitle = () => {
    if (userRole === 'staff') {
      return 'Message Parents & Other Staff';
    } else if (userRole === 'parent') {
      return 'Message Teachers & School Staff';
    }
    return 'Connect with the School Community';
  };

  // Get contact label based on user role
  const getContactLabel = () => {
    if (userRole === 'staff') {
      return 'Select Parent or Staff:';
    } else if (userRole === 'parent') {
      return 'Select Staff Member:';
    }
    return 'Select Contact:';
  };

  // Function to get Supabase URL for files
  const getFileUrl = (fileName: string | null) => {
    if (!fileName) return null;
    
    // If it's already a full URL, return it as is
    if (fileName.startsWith('http')) {
      return fileName;
    }
    
    // Otherwise, construct the Supabase URL
    const { data } = supabase.storage
      .from('message-photos')
      .getPublicUrl(fileName);
    
    return data?.publicUrl || null;
  };

  // Dialog helper functions
  const showErrorDialog = (title: string, message: string) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogType('warning');
    setConfirmText('OK');
    setCancelText('Close');
    setIsDialogOpen(true);
    setPendingAction(null);
  };

  const showConfirmDialog = (
    title: string, 
    message: string, 
    type: 'delete' | 'warning' | 'info',
    confirmText: string,
    cancelText: string,
    onConfirm: () => void
  ) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogType(type);
    setConfirmText(confirmText);
    setCancelText(cancelText);
    setIsDialogOpen(true);
    setPendingAction(() => onConfirm);
  };

  const handleDialogConfirm = () => {
    if (pendingAction) {
      pendingAction();
    }
    setIsDialogOpen(false);
  };

  const handleDialogCancel = () => {
    setIsDialogOpen(false);
    setPendingAction(null);
  };

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col items-center p-4">
      <header className="w-full max-w-4xl bg-white shadow-md rounded-md p-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
        
          <div>
            <h1 className="text-xl font-bold">{getPageTitle()}</h1>
            <p className="text-sm text-gray-600">{getPageSubtitle()}</p>
          </div>
        </div>
 
      </header>

      {/* Contact Type Tabs - Always shown */}
      <div className="w-full max-w-4xl mt-4 bg-white shadow-md rounded-md p-4">
        <div className="mb-2 text-sm font-semibold">Select Contact Type:</div>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="contactType"
              checked={selectedContactType === 'all'}
              onChange={() => handleContactTypeChange('all')}
              className="form-radio text-blue-500"
            />
            <span>All</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="contactType"
              checked={selectedContactType === 'teacher'}
              onChange={() => handleContactTypeChange('teacher')}
              className="form-radio text-blue-500"
            />
            <span>Teachers</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="contactType"
              checked={selectedContactType === 'staff'}
              onChange={() => handleContactTypeChange('staff')}
              className="form-radio text-blue-500"
            />
            <span>Other Staff</span>
          </label>
                    {/*
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="contactType"
              checked={selectedContactType === 'parent'}
              onChange={() => handleContactTypeChange('parent')}
              className="form-radio text-blue-500"
            />
            <span>Parents</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="contactType"
              checked={selectedContactType === 'student'}
              onChange={() => handleContactTypeChange('student')}
              className="form-radio text-blue-500"
            />
            <span>Students</span>
          </label>
          */}
        </div>
      </div>

      {/* Only show the rest if a contact type is selected */}
      {selectedContactType !== 'all' && (
        <>
          {/* Contact Selector */}
          <div className="w-full max-w-4xl mt-4">
            <label htmlFor="contact" className="text-sm font-semibold">
              {getContactLabel()}
            </label>
            <select
              id="contact"
              className="w-full p-2 mt-2 border rounded-md"
              onChange={handleContactSelect}
              value={selectedContact?.value || ''}
            >
              <option value="">Select...</option>
              {filteredContacts.map((contact, index) => (
                <option key={index} value={contact.value}>
                  {contact.label}
                </option>
              ))}
            </select>
            {loadingContacts && <div className="text-xs text-gray-500 mt-2">Loading contacts...</div>}
            {contactsError && <div className="text-xs text-red-500 mt-2">{contactsError}</div>}
            {filteredContacts.length === 0 && !loadingContacts && !contactsError && (
              <div className="text-xs text-gray-500 mt-2">No contacts available for this type.</div>
            )}
          </div>

          {/* Chat Section - Only shown when a contact is selected */}
          {selectedContact ? (
            <>
              <main className="w-full max-w-4xl mt-4 flex-grow bg-white shadow-md rounded-md p-4 overflow-y-auto">
                <h2 className="text-center text-lg font-semibold mb-4">
                  Chat with {selectedContact.label}
                </h2>
                
                {/* Guardian information for students */}
                {selectedContact.recipient_type === 'student' && (selectedContact as any).guardian_name && (
                  <div className="bg-blue-50 p-2 mb-4 rounded-md border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">Guardian:</span> {(selectedContact as any).guardian_name} 
                      ({(selectedContact as any).guardian_relationship})
                    </p>
                  </div>
                )}
                

                
                {loadingMessages && <div className="text-xs text-gray-500 mb-2">Loading messages...</div>}
                <div ref={chatContainerRef} className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {messages.map((message, index) => {
                    const isSent = message.senderId === getCurrentUserId();
                    return (
                    <div
                      key={message.id || index}
                      className={`flex items-start my-2 ${
                        isSent ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`relative p-3 rounded-md max-w-sm shadow-sm space-y-1 group ${
                          isSent ? 'bg-blue-100 ml-2' : 'bg-gray-200 mr-2'
                        }`}
                      >
                        {/* Sender name - show current user name for sent messages, contact name for received */}
                        <div className="text-xs font-semibold mb-1">
                          {isSent ? 'You' : selectedContact?.label.split(' (')[0]}
                        </div>
                        {/* Edit/Delete icons (only show for your own messages) */}
                        {isSent && (
                          <div className="absolute right-2 top-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition z-10">
                            <button
                              onClick={() => handleEditMessage(message)}
                              className="p-1 hover:bg-blue-200 rounded"
                              title="Edit"
                            >
                              {/* Pencil Icon */}
                              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 16 16"><path d="M11 3l2 2M3 11l6-6 2 2-6 6H3v-2z"/></svg>
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(message)}
                              className="p-1 hover:bg-red-200 rounded"
                              title="Delete"
                            >
                              {/* Trash Icon */}
                              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 16 16"><path d="M6 6v6M10 6v6M4 4h8M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/></svg>
                            </button>
                          </div>
                        )}
                        {/* Edit UI or message content */}
                        {editingMessageId === message.id ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              saveEditMessage(message.id);
                            }}
                            className="flex items-center space-x-2"
                          >
                            <input
                              value={editingContent}
                              onChange={e => setEditingContent(e.target.value)}
                              className="border p-1 rounded text-sm flex-1"
                              autoFocus
                            />
                            <button type="submit" className="text-blue-600 font-bold">Save</button>
                            <button type="button" className="text-gray-500" onClick={() => setEditingMessageId(null)}>Cancel</button>
                          </form>
                        ) : (
                          message.content && <p className="message text-sm">{message.content}</p>
                        )}
                        {message.fileUrl && (
                          <div className="mt-2">
                            {message.fileType && message.fileType.startsWith('image/') ? (
                              // For images, display them directly
                              <div className="relative w-40 h-40 overflow-hidden rounded-md">
                                <Image
                                  src={getFileUrl(message.fileUrl) || ''}
                                  alt={message.fileName || "Attachment"}
                                  width={160}
                                  height={160}
                                  className="object-cover"
                                  unoptimized
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                                  {message.fileName || "Image"}
                                </div>
                              </div>
                            ) : (
                              // For other files, show a download link
                              <a 
                                href={getFileUrl(message.fileUrl) || '#'} 
                                download={message.fileName}
                                className="flex items-center space-x-2 bg-gray-100 p-2 rounded-md hover:bg-gray-200 transition"
                              >
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-gray-600">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                <span className="text-xs font-medium truncate max-w-[120px]">
                                  {message.fileName || "Download file"}
                                </span>
                              </a>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(message.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )})}
                </div>
              </main>

              <footer className="w-full max-w-4xl mt-4">
                <div className="flex items-center bg-white shadow-md rounded-md p-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-grow p-2 border rounded-md outline-none"
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <input
                    type="file"
                    className="ml-2 border rounded-md p-1 text-sm text-gray-700 bg-gray-100 cursor-pointer hover:bg-gray-200"
                    onChange={handleFileChange}
                  />
                  <button
                    onClick={handleSendMessage}
                    className="ml-2 p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    Send
                  </button>
                </div>
              </footer>
            </>
          ) : (
            <div className="w-full max-w-4xl mt-4 bg-white shadow-md rounded-md p-8 text-center">
              <div className="text-xl font-semibold mb-2">Select a contact to start chatting</div>
              <p className="text-gray-600">
                Choose from the available contacts above to begin a conversation.
              </p>
            </div>
          )}
        </>
      )}

      {/* Add DialogBox at the end */}
      <DialogBox
        isOpen={isDialogOpen}
        title={dialogTitle}
        message={dialogMessage}
        type={dialogType}
        confirmText={confirmText}
        cancelText={cancelText}
        onConfirm={handleDialogConfirm}
        onCancel={handleDialogCancel}
      />
    </div>
  )
}