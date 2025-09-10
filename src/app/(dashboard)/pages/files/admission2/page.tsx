'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Phone, Mail, Globe, Facebook } from 'lucide-react';

interface FormSectionProps {
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}

const FormSection: React.FC<FormSectionProps> = ({ title, isOpen, onToggle, children }) => {
    return (
        <div className="border rounded-lg overflow-hidden mb-4">
            <button 
                onClick={onToggle}
                className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 focus:outline-none flex justify-between items-center"
            >
                <span className="text-lg font-semibold">{title}</span>
                <span className="transform transition-transform duration-200 text-xl">
                    {isOpen ? '−' : '+'}
                </span>
            </button>
            {isOpen && (
                <div className="p-4 border-t">
                    {children}
                </div>
            )}
        </div>
    );
};

const AdmissionForm = () => {
  const [openSection, setOpenSection] = useState('');
  const [headTeacherName, setHeadTeacherName] = useState('Mr. Sssemanda Issa');
  const [dob, setDob] = useState('');
  const [age, setAge] = useState(0);
  const [dadPhoto, setDadPhoto] = useState<string | null>(null);
  const [studentPhoto, setStudentPhoto] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  
  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? '' : section);
  };

  useEffect(() => {
    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      const calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDifference = today.getMonth() - birthDate.getMonth();
      if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
        setAge(calculatedAge - 1);
      } else {
        setAge(calculatedAge);
      }
    } else {
      setAge(0);
    }
  }, [dob]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setConfirmationMessage('Your submission has been received!');
    
    // You can add a timeout to clear the message after a few seconds if desired
    setTimeout(() => {
      setConfirmationMessage('');
    }, 5000); // Message will disappear after 5 seconds
  };

  return (
    <div className="max-w-5xl mx-auto p-4 bg-white">
      <form onSubmit={handleSubmit}>
      {/* School Header - Modified to include student photo display */}
      <div className="mb-6 p-6 border rounded-lg shadow-sm">
        <div className="flex justify-between">
          <div className="text-center flex-grow">
            <div className="w-32 h-32 mx-auto mb-4">
              <Image 
                src="/richdadjrschool-logo.png"
                alt="School Logo" 
                className="w-full h-full object-contain"
                width={128}
                height={128}
              />
            </div>
            <h1 className="text-2xl font-bold mb-2">
              RICH DAD JUNIOR SCHOOL
            </h1>
            <p className="text-gray-500">
              A mixed Day and Boarding, Day Care Centre Nursery and Primary School
            </p>
            <p className="text-gray-500">
              Registered by the Ministry of Education and Sports
            </p>
            <div className="text-center text-sm space-y-1">
              <p className="tracking-wide">P.O. Box 11276 KAMPALA - UGANDA</p>
              <p className="flex items-center justify-center gap-2">
                <Phone size={16} className="text-gray-600" />
                <span className="font-bold">Tel:</span> 0781 50 69 26 / 0756 82 31 10
              </p>
              <p className="flex items-center justify-center gap-2">
                <Mail size={16} className="text-gray-600" />
                <span className="font-bold">Email:</span> richdadjuniorschool2017@gmail.com
              </p>
              <p className="flex items-center justify-center gap-2">
                <Globe size={16} className="text-gray-600" />
                <span className="font-bold">Website:</span> www.richdadjuniorschool.com
              </p>
              <p className="flex items-center justify-center gap-2">
                <Facebook size={16} className="text-gray-600" />
                <span className="font-bold">Facebook:</span> Rich Dad Junior School
              </p>
            </div>
          </div>
          {studentPhoto && (
            <div className="w-52 h-52 flex-shrink-0 mt-10">
              <Image 
                src={studentPhoto} 
                alt="Student's Photo" 
                className="w-full h-full object-cover rounded-lg" 
                width={128}
                height={128}
              />
            </div>
          )}
        </div>
      </div>

      {/* School Pay Code */}
      <div className="mb-6">
        <div className="flex justify-between items-center border border-gray-300 p-4 bg-blue-50">
          <div className="flex items-center">
            <label className="text-blue-700 font-medium mr-4">Admission Number:</label>
            <input 
              type="text" 
              value="RDJS001" 
              readOnly 
              className="w-32 border border-blue-300 rounded p-2 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        
          <div className="flex items-center">
            <label className="text-blue-700 font-medium mr-4">School Pay Code:</label>
            <input 
              type="number" 
              className="w-32 border border-blue-300 rounded p-2 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter code"
              min="0"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Admission Letter */}
        <FormSection 
          title="PART ONE: ADMISSION LETTER" 
          isOpen={openSection === 'admission'} 
          onToggle={() => toggleSection('admission')}
        >
          <div className="space-y-4">
            <h4 className="font-medium">Dear Parent / Guardian,</h4>
            <p className="text-gray-700">I am delighted to inform you that your son/daughter,</p>
            <div className="flex space-x-4">
              <div className="flex-1 space-y-2">
                <label className="block text-sm font-medium">Student First Name</label>
                <input type="text" className="w-full border rounded p-2" />
              </div>
              <div className="flex-1 space-y-2">
                <label className="block text-sm font-medium">Middle Number</label>
                <input type="text" className="w-full border rounded p-2" />
              </div>
              <div className="flex-1 space-y-2">
                <label className="block text-sm font-medium">Last Name</label>
                <input type="text" className="w-full border rounded p-2" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">LIN Number</label>
              <input type="text" className="w-full border rounded p-2" />
            </div>
            <div className="space-y-4">
              <p>Has been offered a study post at Rich Dad Junior School - Entebbe Road this (date):
                <input type="date" className="border-b border-black mx-2 p-1" />
              </p>
              <p>He / She is expected to report for effective learning on
                <input type="date" className="border-b border-black mx-2 p-1" />
                and he / she will be received at 7:00 a.m. so as to prepare and set the mind for normal routine lessons which begin at 7:30 a.m.
                <strong> Please take note</strong> that the applicant is expected to report within the first week of admission and failure to do so forfeits the vacancy.
              </p>
              <p className="mt-4 font-semibold">Your child is expected to bring the following on the date of reporting:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>This admission booklet well filled in</li>
                <li>A genuinely and fully completed medical form</li>
                <li>2 passport-size photos for both parents / guardians</li>
                <li>3 passport-size coloured photos for the applicant</li>
              </ul>
              <p className="mt-4">
                I wish you a visionary and happy stay at Rich Dad Junior School.
              </p>
              <p className="mt-4 font-semibold">Yours in service</p>
              <p className="mt-2 font-bold text-blue-800">{headTeacherName}</p>
              
              <p className="mt-2 font-bold">HEAD TEACHER</p>
            </div>
          </div>
        </FormSection>

        {/* Bio Data */}
        <FormSection 
          title="PART TWO: CHILD'S BIO-DATA" 
          isOpen={openSection === 'biodata'} 
          onToggle={() => toggleSection('biodata')}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium whitespace-nowrap">Surname</label>
                <input type="text" className="w-full border rounded p-2" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium whitespace-nowrap">First Name</label>
                <input type="text" className="w-full border rounded p-2" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium whitespace-nowrap">Other Names</label>
                <input type="text" className="w-full border rounded p-2" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <label className="block text-sm font-medium whitespace-nowrap">Date of Birth</label>
                <input 
                  type="date" 
                  className="w-full border rounded p-2" 
                  value={dob} 
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="block text-sm font-medium whitespace-nowrap">Age</label>
                <input 
                  type="number" 
                  className="w-full border rounded p-2" 
                  value={age} 
                  readOnly
                />
              </div>
            </div>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <label className="block text-sm font-medium whitespace-nowrap">Zone / Village/Cell</label>
                <input type="text" className="w-full border rounded p-2" />
              </div>
              <div className="flex items-center space-x-2">
                <label className="block text-sm font-medium whitespace-nowrap">Sub-county / Division</label>
                <input type="text" className="w-full border rounded p-2" />
              </div>
              <div className="flex items-center space-x-2">
                <label className="block text-sm font-medium whitespace-nowrap">Home District / Municipality</label>
                <input type="text" className="w-full border rounded p-2" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <label className="block text-sm font-medium whitespace-nowrap">Previous Residence if Change in the last 6 months</label>
              <input type="text" className="w-full border rounded p-2" />
            </div>
            <div className="flex items-center space-x-2">
              <label className="block text-sm font-medium whitespace-nowrap">Previous School</label>
              <input type="text" className="w-full border rounded p-2" />
            </div>
            <div className="flex items-center space-x-2">
              <label className="block text-sm font-medium whitespace-nowrap">Previous Class if any</label>
              <input type="text" className="w-full border rounded p-2" />
            </div>
            <div className="flex items-center space-x-2">
              <label className="block text-sm font-medium whitespace-nowrap">Location of the Previous School</label>
              <input type="text" className="w-full border rounded p-2" />
            </div>
            <div className="space-y-4">
              <h4 className="font-medium">Orphan Status</h4>
              <div className="grid grid-cols-2 gap-4">
                {['Father died', 'Mother died', 'Both parents died', 'Don\'t know them'].map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <input type="checkbox" className="border rounded" />
                    <label className="text-sm">{status}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Birth Position (tick)</h4>
              <div className="w-full overflow-hidden border rounded">
                <table className="w-full table-auto">
                  <tbody>
                    <tr>
                      <td className="border p-2">
                        <div className="flex items-center space-x-2">
                          <input type="radio" name="birthPosition" className="border rounded" />
                          <label className="text-sm">First</label>
                        </div>
                      </td>
                      <td className="border p-2">
                        <div className="flex items-center space-x-2">
                          <input type="radio" name="birthPosition" className="border rounded" />
                          <label className="text-sm">Second</label>
                        </div>
                      </td>
                      <td className="border p-2">
                        <div className="flex items-center space-x-2">
                          <input type="radio" name="birthPosition" className="border rounded" />
                          <label className="text-sm">Third</label>
                        </div>
                      </td>
                      <td className="border p-2">
                        <div className="flex items-center space-x-2">
                          <input type="radio" name="birthPosition" className="border rounded" />
                          <label className="text-sm mr-1">Others</label>
                          <input 
                            type="text" 
                            className="border rounded p-1 w-16 text-sm"
                            placeholder="e.g. 5th" 
                          />
                        </div>
                        
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Religion</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  "Christianity / Church of the Province of Uganda",
                  "Islam",
                  "Christianity / SDA",
                  "Christianity / Catholicism",
                  "Christianity / Pentecostal",
                  "Christianity / Orthodox",
                  "Buddhism",
                  "Hinduism"
                ].map((religion) => (
                  <div key={religion} className="flex items-center space-x-2">
                    <input type="radio" name="religion" className="border rounded" />
                    <label className="text-sm">{religion}</label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-medium">Number of Brothers and Sisters</h4>
              <div className="w-full overflow-hidden border rounded">
                <table className="w-full table-auto">
                  <tbody>
                    <tr>
                      <td className="border p-2">
                          <div className="flex items-center space-x-2">
                          <label className="text-sm mr-1">Brothers</label>
                          <input 
                            type="text" 
                            className="border rounded p-1 w-16 text-sm"
                            placeholder="" 
                          />
                        </div>
                      </td>
                      <td className="border p-2">
                        <div className="flex items-center space-x-2">
                          <label className="text-sm mr-1">Sisters</label>
                          <input 
                            type="text" 
                            className="border rounded p-1 w-16 text-sm"
                            placeholder="" 
                          />
                        </div>
                      </td>
                      <td className="border p-2">
                        <div className="flex items-center space-x-2">
                          <label className="text-sm mr-1">None</label>
                          <input 
                            type="text" 
                            className="border rounded p-1 w-16 text-sm"
                            placeholder="" 
                          />
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4 mt-6">
              <h4 className="font-medium">Students Passport Photo</h4>
              <div className="w-40 h-40 mx-auto border-2 border-dashed rounded-lg flex flex-col items-center justify-center bg-gray-50">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  id="studentPhoto" 
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      const file = files[0];
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setStudentPhoto(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }} 
                />
                {studentPhoto ? (
                  <div className="relative w-full h-full">
                    <Image 
                      src={studentPhoto} 
                      alt="Student's Photo" 
                      className="w-full h-full object-cover rounded-lg" 
                      width={128}
                      height={128}
                    />
                    <button
                      onClick={() => setStudentPhoto(null)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label 
                    htmlFor="studentPhoto" 
                    className="flex flex-col items-center cursor-pointer p-4"
                  >
                    <svg 
                      className="w-8 h-8 text-gray-400 mb-2" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M12 4v16m8-8H4" 
                      />
                    </svg>
                    <span className="text-sm text-gray-500">Upload Photo</span>
                    <span className="text-xs text-gray-400 mt-1">(Click to browse)</span>
                  </label>
                )}
              </div>
            </div>
          </div>
        </FormSection>

        {/* Family Relationships */}
        <FormSection 
          title="PART THREE: FAMILY RELATIONSHIPS" 
          isOpen={openSection === 'family'} 
          onToggle={() => toggleSection('family')}
        >
          <div className="space-y-6">
            {/* Mother's Information */}
            <div className="space-y-4">
              <h4 className="font-medium">Mothers Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div className="space-y-2 flex items-center no-wrap">
                  <label className="block text-sm font-medium w-1/3">Full Name</label>
                  <input type="text" className="w-2/3 border rounded p-2" />
                </div>
                <div className="space-y-2 flex items-center no-wrap">
                  <label className="block text-sm font-medium w-1/3">Current Residence</label>
                  <input type="text" className="w-2/3 border rounded p-2" />
                </div>
                <div className="space-y-2 flex items-center no-wrap">
                  <label className="block text-sm font-medium w-1/3">Telephone</label>
                  <input type="tel" className="w-2/3 border rounded p-2" />
                </div>
                <div className="space-y-2 flex items-center no-wrap">
                  <label className="block text-sm font-medium w-1/3">Email Address</label>
                  <input type="email" className="w-2/3 border rounded p-2" />
                </div>
                <div className="space-y-2 flex items-center no-wrap">
                  <label className="block text-sm font-medium w-1/3">Any social media account (facebook, WhatsApp no. etc.)</label>
                  <input type="text" className="w-2/3 border rounded p-2" />
                </div>
                <div className="space-y-2 flex items-center no-wrap">
                  <label className="block text-sm font-medium w-1/3">Occupation</label>
                  <input type="text" className="w-2/3 border rounded p-2" />
                </div>
                <div className="space-y-2 flex items-center no-wrap">
                  <label className="block text-sm font-medium w-1/3">Work Place and Address</label>
                  <input type="text" className="w-2/3 border rounded p-2" />
                </div>
                <div className="space-y-2 flex items-center no-wrap">
                  <label className="block text-sm font-medium w-1/3">Office Tel</label>
                  <input type="tel" className="w-2/3 border rounded p-2" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Marital Status (tick)</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['Single Mother', 'Married', 'Divorced', 'Widowed'].map((status, index) => (
                    <div key={status} className="flex items-center space-x-2">
                      <input type="radio" name="maritalStatus" value={status} className="border rounded" />
                      <label className="text-sm">{status}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">N.O.K (next of kin)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 flex items-center">
                    <label className="block text-sm font-medium w-1/3">a) Name</label>
                    <input type="text" className="w-2/3 border rounded p-2" />
                  </div>
                  <div className="space-y-2 flex items-center">
                    <label className="block text-sm font-medium w-1/3">Tel</label>
                    <input type="tel" className="w-2/3 border rounded p-2" />
                  </div>
                  <div className="space-y-2 flex items-center">
                    <label className="block text-sm font-medium w-1/3">b) Name</label>
                    <input type="text" className="w-2/3 border rounded p-2" />
                  </div>
                  <div className="space-y-2 flex items-center">
                    <label className="block text-sm font-medium w-1/3">Tel</label>
                    <input type="tel" className="w-2/3 border rounded p-2" />
                  </div>
                </div>
              </div>
            </div>

            {/* Father's Information */}
            <div className="space-y-4">
              <h4 className="font-medium">Fathers Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div className="space-y-2 flex items-center no-wrap">
                  <label className="block text-sm font-medium w-1/3">Full Name</label>
                  <input type="text" className="w-2/3 border rounded p-2" />
                </div>
                <div className="space-y-2 flex items-center no-wrap">
                  <label className="block text-sm font-medium w-1/3">Tel. Contact</label>
                  <input type="tel" className="w-2/3 border rounded p-2" />
                </div>
                <div className="space-y-2 flex items-center no-wrap">
                  <label className="block text-sm font-medium w-1/3">E-mail Address</label>
                  <input type="email" className="w-2/3 border rounded p-2" />
                </div>
                <div className="space-y-2 flex items-center no-wrap">
                  <label className="block text-sm font-medium w-1/3">Residential Address / Current</label>
                  <input type="text" className="w-2/3 border rounded p-2" />
                </div>
                <div className="space-y-2 flex items-center no-wrap">
                  <label className="block text-sm font-medium w-1/3">Occupation</label>
                  <input type="text" className="w-2/3 border rounded p-2" />
                </div>
                <div className="space-y-2 flex items-center no-wrap">
                  <label className="block text-sm font-medium w-1/3">Work Place</label>
                  <input type="text" className="w-2/3 border rounded p-2" />
                </div>
                <div className="space-y-2 flex items-center no-wrap">
                  <label className="block text-sm font-medium w-1/3">Office Tel Contact</label>
                  <input type="tel" className="w-2/3 border rounded p-2" />
                </div>
                <div className="space-y-2 flex items-center no-wrap">
                  <label className="block text-sm font-medium w-1/3">Location of Work Place</label>
                  <input type="text" className="w-2/3 border rounded p-2" />
                </div>
                <div className="space-y-2 flex items-center no-wrap">
                  <label className="block text-sm font-medium w-1/3">Any social media account (facebook, WhatsApp no. etc.)</label>
                  <input type="text" className="w-2/3 border rounded p-2" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Fathers Marital Status (tick)</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['Single Father', 'Married', 'Divorced', 'Widowed'].map((status) => (
                    <div key={status} className="flex items-center space-x-2">
                      <input type="radio" name="fathersMaritalStatus" value={status} className="border rounded" />
                      <label className="text-sm">{status}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">N.O.K (next of kin)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 flex items-center">
                    <label className="block text-sm font-medium w-1/3">i. Name</label>
                    <input type="text" className="w-2/3 border rounded p-2" />
                  </div>
                  <div className="space-y-2 flex items-center">
                    <label className="block text-sm font-medium w-1/3">Tel</label>
                    <input type="tel" className="w-2/3 border rounded p-2" />
                  </div>
                  <div className="space-y-2 flex items-center">
                    <label className="block text-sm font-medium w-1/3">ii. Name</label>
                    <input type="text" className="w-2/3 border rounded p-2" />
                  </div>
                  <div className="space-y-2 flex items-center">
                    <label className="block text-sm font-medium w-1/3">Tel</label>
                    <input type="tel" className="w-2/3 border rounded p-2" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FormSection>

        {/* Part FOUR: Health Records */}
        <FormSection 
        title="PART FOUR: PUPIL'S HEALTH HISTORY/ RECORDS (fill in as required)" 
        isOpen={openSection === 'health'} 
        onToggle={() => toggleSection('health')}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Any Physical Disability?</label>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <input type="radio" name="disability" className="border rounded" />
                <label className="text-sm">Yes</label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="radio" name="disability" className="border rounded" />
                <label className="text-sm">No</label>
              </div>
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <label className="text-sm font-medium whitespace-nowrap ">If yes, please specify:</label>
              <input 
                type="text" 
                className="border rounded p-2 w-full"
                placeholder="If yes, please specify"
              />
            </div>
            <p className="text-sm text-gray-500">
              (note: you can attach any evident medical document if the impairment is concealed)
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Pupils Personal / Family Doctor Information</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <label className="block text-sm font-medium w-1/3">Doctors Name</label>
                <input placeholder="Doctor's Name" className="w-2/3 p-2 border rounded" />
              </div>
              <div className="flex items-center space-x-2">
                <label className="block text-sm font-medium w-1/3">Tel</label>
                <input placeholder="Tel" className="w-2/3 p-2 border rounded" />
              </div>
              <div className="flex items-center space-x-2">
                <label className="block text-sm font-medium w-1/3">E-mail Address</label>
                <input placeholder="E-mail Address" className="w-2/3 p-2 border rounded" />
              </div>
              <div className="flex items-center space-x-2">
                <label className="block text-sm font-medium w-1/3">Doctors Social Network Account</label>
                <input placeholder="Doctor's Social Network Account (facebook / WhatsApp)" className="w-2/3 p-2 border rounded" />
              </div>
              <div className="flex items-center space-x-2">
                <label className="block text-sm font-medium w-1/3">Special Childs Health Facility</label>
                <input placeholder="Special Child's Health Facility" className="w-2/3 p-2 border rounded" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Any types of food stuffs the child does not eat ?</h4>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <input type="radio" name="food-restriction" className="border rounded" />
                <label className="text-sm">Yes</label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="radio" name="food-restriction" className="border rounded" />
                <label className="text-sm">No</label>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm">If yes, specify/name them:</label>
              <input placeholder="a)" className="w-full p-2 border rounded" />
              <input placeholder="b)" className="w-full p-2 border rounded" />
              <input placeholder="c)" className="w-full p-2 border rounded" />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Have you suffered from any chronic diseases?</h4>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <input type="radio" name="chronic-diseases" className="border rounded" />
                <label className="text-sm">Yes</label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="radio" name="chronic-diseases" className="border rounded" />
                <label className="text-sm">No</label>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm">If yes, specify/name them:</label>
              <input placeholder="a)" className="w-full p-2 border rounded" />
              <input placeholder="b)" className="w-full p-2 border rounded" />
              <input placeholder="c)" className="w-full p-2 border rounded" />
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-medium">Are you on Medication ?</h4>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <input type="radio" name="medication" className="border rounded" />
                <label className="text-sm">Yes</label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="radio" name="medication" className="border rounded" />
                <label className="text-sm">No</label>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm">If yes, specify below:</label>
              <input placeholder="a)" className="w-full p-2 border rounded" />
              <input placeholder="b)" className="w-full p-2 border rounded" />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <label className="block text-sm font-medium whitespace-nowrap">Medical Check-up Frequency</label>
            <input 
              placeholder="How often do you go for the medical check-up?"
              className="w-full p-2 border rounded" 
            />
          </div>
        </div>
    
        <h2 className="text-xl font-bold mt-4 mb-2">MEDICAL FORM FOR ADMISSION (FITNESS)</h2>
  
        <div className="space-y-4">
          <p className="text-sm text-gray-600 italic">To be filled by the Doctor in presence of a parent and child</p>
          
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <div className="space-y-2">
              <label className="block text-sm font-medium">Pupils Name</label>
              <input type="number" className="w-full border rounded p-2" />
            </div>
       
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Weight (kg)</label>
                  <input type="number" className="w-full border rounded p-2" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Sex</label>
                  <select className="w-full border rounded p-2">
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Age (years)</label>
                  <input type="number" className="w-full border rounded p-2" />
                </div>
              </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Medical History</h4>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              {[
                'History of Epilepsy',
                'History of Candidiasis (girl)',
                'History of Typhoid',
                'History of Hepatitis'
              ].map((label) => (
                <div key={label} className="space-y-2 flex items-center">
                  <label className="block text-sm font-medium w-1/3">{label}</label>
                  <input type="text" className="w-2/3 border rounded p-2" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Does the child ave any of the following impairments/ Deformities</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['Limbs', 'Visual/Vision', 'Hearing', 'Others'].map((label) => (
                <div key={label} className="flex items-center space-x-2">
                  <input type="checkbox" className="border rounded" />
                  <label className="text-sm">{label}</label>
                </div>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <label className="block text-sm font-medium whitespace-nowrap">Specify other impairments if any</label>
              <input type="text" className="w-full border rounded p-2" />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Kindly comment on the results got after testing the following ?</h4>
            <div className="grid grid-cols-1 gap-1">
              {[
                'I. Blood Analysis',
                'II. Stool Analysis',
                'III. Kidney',
                'IV. Stomach',
                'V. Urine Analysis',
                'VI. Chest',
                'VII. Any Fibroids Tested and Scanned (girl)',
                "VIII. Doctor's General Remarks"
              ].map((label) => (
                <div key={label} className="flex items-center space-x-2">
                  <label className="block text-sm font-medium w-1/3">{label}</label>
                  <textarea 
                    className="w-2/3 border rounded p-2" 
                    rows={label === "VIII. Doctors General Remarks" ? 3 : 2}
                  ></textarea>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Doctors Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Doctor's Name",
                'Signature',
                'Contact Number',
                'E-mail',
                'Social Network Account',
                'Hospital/Health Centre'
              ].map((label) => (
                <div key={label} className="space-y-2">
                  <label className="block text-sm font-medium">{label}</label>
                  <input 
                    type={label === 'Contact Number' ? 'tel' : 'text'} 
                    className="w-full border rounded p-2" 
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </FormSection>

        {/* School Curriculum */}
        <FormSection 
          title="PART FIVE: THE SCHOOL'S CURRICULUM" 
          isOpen={openSection === 'curriculum'} 
          onToggle={() => toggleSection('curriculum')}
        >
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium">Nursery</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>The whole learning frame work</li>
                <li>Public address training</li>
                <li>Swimming</li>
                <li>Sports day activities</li>
                <li>Computer recognition for use (Top class)</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Primary One to Primary Three</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>English</li>
                <li>Literacy 1 (science)</li>
                <li>Literacy 1 (social studies)</li>
                <li>Literacy 2 (reading and writing)</li>
                <li>Religious education</li>
                <li className="pl-4">- Islamic (IRE)</li>
                <li className="pl-4">- Christianity (CRE)</li>
                <li>Home organization and management</li>
                <li>Numbers (Mathematics)</li>
                <li>Integrated production skills (drawing and shading)</li>
                <li>PAPE (music, dance and drama)</li>
                <li>PAPE (physical education)</li>
                <li>Lugha ya Kiswahili (Swahili)</li>
                <li>Arabic</li>
                <li>Luganda</li>
                <li>French</li>
                <li>Swimming</li>
                <li>Computer literacy (use and operation)</li>
                <li>Sports day events</li>
                <li>Public address training (speech activities)</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Primary Four</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>Computer literacy (introduction to ICT)</li>
                <li>English</li>
                <li>Mathematics</li>
                <li>Social studies</li>
                <li>Science</li>
                <li>Religious education</li>
                <li className="pl-4">- Islamic (IRE)</li>
                <li className="pl-4">- Christianity (CRE)</li>
                <li>Hand writing</li>
                <li>Reading</li>
                <li>Swimming</li>
                <li>CAPE (art / music)</li>
                <li>Home organization, management and agriculture</li>
                <li>Speech activities (public address)</li>
                <li>Sports day events</li>
                <li>Scouting and girl guiding</li>
                <li>Lugha ya Kiswahili</li>
                <li>Arabic</li>
                <li>Luganda</li>
                <li>French</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Primary Five to Primary Seven</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>English</li>
                <li>Mathematics</li>
                <li>Integrated science</li>
                <li>Social studies</li>
                <li>Religious education</li>
                <li className="pl-4">- Islamic (IRE)</li>
                <li className="pl-4">- Christianity (CRE)</li>
                <li>Computer lessons (ICT and application)</li>
                <li>Home organization, management and basic agriculture skills</li>
                <li>Sports day events and swimming</li>
                <li>Public address</li>
              </ul>
            </div>

            <div className="mt-4">
              <p className="text-sm text-gray-600 italic">Note: From primary one to primary seven classes, a hand watch is part of our daily wear</p>
            </div>
          </div>
        </FormSection>

        {/* School Routine */}
        <FormSection 
          title="PART SIX: OUR SCHOOL ROUTINE (OPERATIONAL DAYS / TIME)" 
          isOpen={openSection === 'routine'} 
          onToggle={() => toggleSection('routine')}
        >
          <div className="space-y-4">
            <p>School days (week days) Monday - Friday</p>
            <p>The school officially opens at 7.00 a.m. and closes at 5.00 p.m.</p>
            <p>Nursery - P.1 (Infants)</p>
            <p>They arrive at school at 7.30 in the morning and lessons begin at 8.00 a.m.</p>
            <p>Primary two to primary seven arrive at school at 7.00 in the morning and lessons begin at 7.30 a.m.</p>
          </div>
        </FormSection>

        {/* School Rules */}
        <FormSection 
          title="PART SEVEN: SCHOOL RULES AND REGULATIONS" 
          isOpen={openSection === 'rules'} 
          onToggle={() => toggleSection('rules')}
        >
          <div className="space-y-6">
            <p className="text-sm text-gray-600">
              These rules and regulations are a key guideline to successful and harmonious living in the school life while at Rich Dad Junior School.
            </p>
            <p>True and genuine education is based on shaping of character concurrently with learning academic subjects. Educationists therefore, guide learners to respect and follow Rich Dad Junior School rules and regulations so as to build honesty, helpfulness, co-operation, efficiency and good manners leading to good character building.</p>

            <div className="space-y-4">
              <h4 className="font-medium">Language Use and Communication</h4>
              <div className="space-y-2">
                <p>1A LANGUAGE: Rich Dad Junior School curriculum caters for five languages taught practically during their respective lessons, but the medium of communication throughout the school and after those other four languages is strictly English only.</p>
                <p>1B VULGAR LANGUAGE, LOOSE TALK, GOSSIPING AND ARROGANCE: These are strictly not allowed at school and involving oneself in one of them is punishable.</p>
                <p>1C POLITE LANGUAGE: This is the only language needed at Rich Dad Junior School. Any impolite language detected will be highly discouraged and the subject (learner) will be called to the disciplinary committee for affirmative action of change.</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Attendance</h4>
              <div className="space-y-2">
                <p>2A ATTENDANCE: Every learner at Rich Dad Junior School is expected to be regular in attending the lessons daily and following the opening and closing routine of the school. This includes all the lessons and other school activities as guided / directed by the officers - in - charge (OCs)</p>
                <p>2B ABSENTEEISM: There is zero tolerance to absenteeism, a killer factor of performance in class. Any pupil who falls victim of this with false excuse will face a suitable recovery measure and if it persists, he / she will be advised to look for another school.</p>
                <p className="italic">Please note: Genuine absenteeism follows a clear flow of communication from the home of the child to school.</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">School Gatherings</h4>
              <div className="space-y-2">
                <p>2C SCHOOL GATHERINGS:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>All prayer sessions of the pupils respective religion are mandatory / compulsory. They include all the five salat (prayers) of Muslims daily, Juma prayers for Muslims every Friday and Spiritual Alert Hour (SAH) for all denominations and religions every Friday from midday to 1.00 p.m.</li>
                  <li>Assemblies, parades and roll calls must be attended by all pupils who are called upon by any authorized person(s) unless specific and defined permission is given.</li>
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Food and Water for Drinking</h4>
              <div className="space-y-2">
                <p>3A: The school provides both of these essentials / necessities. They are of very high and recommendable quality in line with different nationalities (people) in the school. Refusal to eat or drink water at school will call for investigation and if found intentional, a warning / punishment will be given.</p>
                <p>3B: All meals served at school suit every one due to the wide range of foodstuffs prepared, so they are compulsory to every pupil.</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Time and Routine</h4>
              <div className="space-y-2">
                <p>4A: Pupils must arrive at school in the time stated for arrival in the routine.</p>
                <p>4B: A child who arrives beyond / past the routine time stated will be transported back home and asked to come back to school with the parent the following day.</p>
                <p>4C: All learners must be in the class room at the time a lesson commences.</p>
                <p>4D: The maximum time of late response to any call for any activity at school is five (5 minutes). Any pupil who comes later than that is given a serious caution / even punishment.</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Academics</h4>
              <div className="space-y-2">
                <p>5A HANDWRITING: Our handwriting format is looking at every letter of a word you write and it can easily be changed into a geometrical circle (circular -print hand writing). All our learners are trained and helped to write in the same way. Any pupil who obstinately refutes this faces the academic and disciplinary committees for correction and guide measures.</p>
                <p>5B WORK AND CLEANLINESS: All our pupils shall always present a change of their hand writing work from good to better until best or more is achieved. They must therefore display clean, complete, correct and tidy work in a clean book to the teacher in charge.</p>
                <p>5C READING AND REVISION: A pupil at Rich Dad is a reader and therefore a leader of others in information and the way conclusions and approaches are designed for life and success. All pupils must therefore attend all reading lessons and public speeches / address sessions and study tours for the confidence we desire. Any pupil shunning such a development will be talked to in the presence of their parents. Showing a care free attitude to change might lead to dismissal.</p>
                <p>5D EXAMINATIONS: All pupils must do examinations and tests prepared by the school to check on their potential and progress for recommendations and promotions and they must be in full charge of keeping their past papers for future reference and revision in their box files.</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Discipline and Conduct</h4>
              <p>Indiscipline and activities that are intolerable include:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Indecency</li>
                <li>Using abusive language</li>
                <li>Fighting of any form</li>
                <li>Nicknaming fellow pupils</li>
                <li>Stealing of any nature</li>
                <li>Making noise unnecessarily</li>
                <li>Refusal to greet others and elders</li>
                <li>Disrespecting elders, teachers and democratically chosen prefects and class captains</li>
                <li>Stubbornness of any form</li>
                <li>Playing bad games</li>
                <li>Involving in trade of any kind at school</li>
                <li>Escaping from school</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Security and Uniformity</h4>
              <p>Our uniform as designed with a security reflector for traffic security at night, no pupil is allowed to add anything to our known designs. Any pupil found wearing a mismatching design (s) of our uniform shall be driven back home with a caution.</p>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Conclusion</h4>
              <p>Breaching any of the regulations stated will call for a hearing / disciplinary action / punishment for changes, and if the vice persists, the pupil may be suspended or even expelled from school. This will depend on the weight and times of error. Only acts of indecency will call for an indefinite Suspension or Expulsion.</p>
            </div>
          </div>
        </FormSection>
           {/* Declaration Section */}
        <FormSection 
          title="DECLARATION AND SIGNATURES" 
          isOpen={openSection === 'declaration'} 
          onToggle={() => toggleSection('declaration')}
        >
          <div className="space-y-6">
            <p className="text-sm">
              I hereby declare that I will abide by the above rules and regulations as set and followed at <span className="font-bold">RICH DAD JUNIOR SCHOOL.</span>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="border p-4">
                  <p className="text-center mb-2">Dads Passport Photo</p>
                  <p className="text-center mb-2">Upload Photo</p>
                  <div className="w-32 h-32 mx-auto border-2 border-dashed rounded flex items-center justify-center">
                    <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        id="dadPhoto" 
                        onChange={(e) => {
                            const files = e.target.files; // Get the files
                            if (files && files.length > 0) { // Check if files is not null and has at least one file
                                const file = files[0];
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    setDadPhoto(reader.result as string); // Set the uploaded image as state
                                };
                                reader.readAsDataURL(file);
                            }
                        }} 
                    />
                    <label htmlFor="dadPhoto" className="text-sm text-gray-500 cursor-pointer">x</label>
                    {dadPhoto && ( // Display the uploaded image if it exists
                      <Image 
                        src={dadPhoto} 
                        alt="Dad's Photo" 
                        className="w-full h-full object-cover" 
                        width={128} // Specify width
                        height={128} // Specify height
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="border p-4">
                  <p className="text-center mb-2">Dads Passport Photo</p>
                  <p className="text-center mb-2">Upload Photo</p>
                  <div className="w-32 h-32 mx-auto border-2 border-dashed rounded flex items-center justify-center">
                    <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        id="dadPhoto" 
                        onChange={(e) => {
                            const files = e.target.files; // Get the files
                            if (files && files.length > 0) { // Check if files is not null and has at least one file
                                const file = files[0];
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    setDadPhoto(reader.result as string); // Set the uploaded image as state
                                };
                                reader.readAsDataURL(file);
                            }
                        }} 
                    />
                    <label htmlFor="dadPhoto" className="text-sm text-gray-500 cursor-pointer">x</label>
                    {dadPhoto && ( // Display the uploaded image if it exists
                      <Image 
                        src={dadPhoto} 
                        alt="Dad's Photo" 
                        className="w-full h-full object-cover" 
                        width={128} // Specify width
                        height={128} // Specify height
                      />
                    )}
                  </div>
                  </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="border p-4">
                <p className="text-center mb-2">Photocopy of National ID Must be Attached (Dad)</p>
                <input type="file" accept="image/*" className="mt-2" id="nationalIdDad" />
              </div>
              <div className="border p-4">
                <p className="text-center mb-2">Photocopy of National ID Must be Attached (Mom)</p>
                <input type="file" accept="image/*" className="mt-2" id="nationalIdMom" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Parent/Guardian Signature</label>
                <input type="text" className="w-full border rounded p-2" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Date</label>
                <input type="date" className="w-full border rounded p-2" />
              </div>
            </div>
          </div>
        </FormSection>

      </div>

      {/* Submit Button and Confirmation Message */}
      <div className="mt-4 flex flex-col items-center">
        <button 
          type="submit" 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Submit Application
        </button>

        {/* Confirmation Message - only shows when confirmationMessage has a value */}
        {confirmationMessage && (
          <div className="mt-4 p-4 bg-green-100 text-green-700 rounded">
            {confirmationMessage}
          </div>
        )}
      </div>
    </form>
  </div>
);
};

export default AdmissionForm;