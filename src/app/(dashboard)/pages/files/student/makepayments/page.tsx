"use client";
import React from 'react';
import { env } from '@/env';
import Image from 'next/image';
import { 
  CreditCard, 
  Smartphone, 
  Building2, 
  ChevronDown, 
  Check, 
  AlertCircle, 
  Loader2, 
  ArrowLeft,
  Clock,
  CheckCircle2
} from 'lucide-react';

interface StudentInfo {
  id: string;
  name: string;
  faculty: string;
  program: string;
  cohort: string;
  studentNo: string;
  profileImage: string;
}

type PaymentMethod = 'Mobile Money' | 'Card Payment' | 'USSD' | 'Bank Payment / Agent Banking';
type PaymentStatus = 'idle' | 'processing' | 'success' | 'error';

const Dialog = ({ message, onClose }: { message: string; onClose?: () => void }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
      <p className="text-center text-gray-800 mb-4">{message}</p>
      {onClose && (
        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium">
            Close
          </button>
        </div>
      )}
    </div>
  </div>
);

const PaymentForm = (): JSX.Element => {
  const [showDialog, setShowDialog] = React.useState(false);
  const [dialogMessage, setDialogMessage] = React.useState('');
  const [activeMethod, setActiveMethod] = React.useState<PaymentMethod>('Mobile Money');
  const [currentStep, setCurrentStep] = React.useState(1);
  const [paymentStatus, setPaymentStatus] = React.useState<PaymentStatus>('idle');
  
  // Form fields
  const [mobileNumber, setMobileNumber] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [reason, setReason] = React.useState('Fees Payments');
  const [cardNumber, setCardNumber] = React.useState('');
  const [cardName, setCardName] = React.useState('');
  const [expiryDate, setExpiryDate] = React.useState('');
  const [cvv, setCvv] = React.useState('');
  const [bankName, setBankName] = React.useState('');
  const [accountNumber, setAccountNumber] = React.useState('');
  const [reference, setReference] = React.useState('');

  const studentInfo: StudentInfo = {
    id: 'VU-BSF-2407-0444-DAY',
    name: 'Mr Mahad NYANZI',
    faculty: 'Faculty of Science and Technology',
    program: 'Bachelor of Science in Software Engineering',
    cohort: 'BSF JUL/2024 1.2',
    studentNo: '240718108',
    profileImage: '/avatar.png'
  };

  const handlePayment = async () => {
    setPaymentStatus('processing');
    
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setDialogMessage('Please log in to make a payment');
      setShowDialog(true);
      setPaymentStatus('idle');
      return;
    }

    try {
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount,
          method: activeMethod,
          studentId: studentInfo.id,
          ...(activeMethod === 'Mobile Money' && { mobileNumber }),
          ...(activeMethod === 'Card Payment' && { 
            cardNumber,
            cardName,
            expiryDate,
            cvv
          }),
          ...(activeMethod === 'Bank Payment / Agent Banking' && {
            bankName,
            accountNumber,
            reference
          })
        })
      });

      const data = await response.json();
      
      if (data.status?.returnCode === '401') {
        localStorage.removeItem('accessToken');
        setDialogMessage('Session expired. Please log in again.');
        setShowDialog(true);
        setPaymentStatus('idle');
        return;
      }

      setPaymentStatus('success');
      setDialogMessage('Payment successful! A receipt has been sent to your email.');
      setShowDialog(true);
      setTimeout(() => {
        setShowDialog(false);
        resetForm();
      }, 2000);
    } catch (error) {
      setPaymentStatus('error');
      setDialogMessage('Payment failed. Please try again.');
      setShowDialog(true);
    }
  };

  const handleCopyUssd = (code: string) => {
    navigator.clipboard.writeText(code);
    setDialogMessage('USSD code copied to clipboard!');
    setShowDialog(true);
    setTimeout(() => setShowDialog(false), 2000);
  };

  const resetForm = () => {
    setMobileNumber('');
    setAmount('');
    setReason('Fees Payments');
    setCardNumber('');
    setCardName('');
    setExpiryDate('');
    setCvv('');
    setBankName('');
    setAccountNumber('');
    setReference('');
    setCurrentStep(1);
    setPaymentStatus('idle');
  };

  const handleMethodChange = (method: PaymentMethod) => {
    setActiveMethod(method);
    resetForm();
  };

  const handleNextStep = () => {
    if (currentStep < getMaxSteps()) {
      setCurrentStep(currentStep + 1);
    } else {
      handlePayment();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getMaxSteps = () => {
    switch (activeMethod) {
      case 'Mobile Money':
        return 3;
      case 'Card Payment':
        return 2;
      case 'USSD':
        return 2;
      case 'Bank Payment / Agent Banking':
        return 3;
      default:
        return 1;
    }
  };

  const validateCurrentStep = () => {
    if (activeMethod === 'Mobile Money') {
      if (currentStep === 1) {
        return mobileNumber.length >= 10 && amount.trim() !== '';
      }
      if (currentStep === 2) {
        return reason.trim() !== '';
      }
    }
    
    if (activeMethod === 'Card Payment') {
      if (currentStep === 1) {
        return cardNumber.length >= 16 && cardName.trim() !== '' && expiryDate.length >= 5 && cvv.length >= 3 && amount.trim() !== '';
      }
    }
    
    if (activeMethod === 'USSD') {
      if (currentStep === 1) {
        return amount.trim() !== '' && reason.trim() !== '';
      }
    }
    
    if (activeMethod === 'Bank Payment / Agent Banking') {
      if (currentStep === 1) {
        return bankName.trim() !== '' && amount.trim() !== '';
      }
      if (currentStep === 2) {
        return accountNumber.trim() !== '' && reference.trim() !== '';
      }
    }
    
    return true;
  };

  const renderSteps = () => {
    const maxSteps = getMaxSteps();
    
    return (
      <div className="flex items-center justify-center mb-6">
        {Array.from({ length: maxSteps }).map((_, index) => (
          <React.Fragment key={index}>
            <div 
              className={`flex items-center justify-center h-8 w-8 rounded-full ${
                currentStep > index + 1 ? 'bg-blue-500' : 
                currentStep === index + 1 ? 'bg-blue-500' : 'bg-gray-200'
              }`}
            >
              {currentStep > index + 1 ? (
                <Check className="h-5 w-5 text-white" />
              ) : (
                <span className={`text-sm ${currentStep === index + 1 ? 'text-white' : 'text-gray-600'}`}>
                  {index + 1}
                </span>
              )}
            </div>
            {index < maxSteps - 1 && (
              <div className={`w-12 h-1 ${currentStep > index + 1 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderButtonsNav = () => {
    if (paymentStatus !== 'idle') return null;

    return (
      <div className="mt-6 flex justify-between">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={handlePrevStep}
            className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </button>
        ) : (
          <div></div> 
        )}
        <button
          type="button"
          disabled={!validateCurrentStep()}
          onClick={handleNextStep}
          className={`px-4 py-2 rounded ${
            validateCurrentStep()
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {currentStep === getMaxSteps() ? 'Make Payment' : 'Next'}
        </button>
      </div>
    );
  };

  const renderMobileMoneyStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 1: Enter Payment Details</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
              <input
                type="tel"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter mobile number"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount in UGX</label>
              <input
                type="number"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="text-sm text-amber-700 mt-1">*Dollar Rate: $1 = UGX 3705</p>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 2: Payment Details</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <div className="relative">
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  <option value="Fees Payments">Fees Payments</option>
                  <option value="Examination Fees">Examination Fees</option>
                  <option value="Registration Fees">Registration Fees</option>
                  <option value="Other">Other</option>
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-md">
              <h4 className="font-medium text-blue-800">Payment Summary</h4>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Mobile Number:</span>
                  <span className="text-sm font-medium">{mobileNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Amount:</span>
                  <span className="text-sm font-medium">UGX {Number(amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Student ID:</span>
                  <span className="text-sm font-medium">{studentInfo.id}</span>
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 3: Confirm Payment</h3>
            <div className="bg-blue-50 p-4 rounded-md">
              <h4 className="font-medium text-blue-800">Payment Details</h4>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Mobile Number:</span>
                  <span className="text-sm font-medium">{mobileNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Amount:</span>
                  <span className="text-sm font-medium">UGX {Number(amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Reason:</span>
                  <span className="text-sm font-medium">{reason}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Student ID:</span>
                  <span className="text-sm font-medium">{studentInfo.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Student Name:</span>
                  <span className="text-sm font-medium">{studentInfo.name}</span>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-md">
              <div className="flex items-start">
                <AlertCircle className="text-yellow-500 mr-2 mt-0.5 h-5 w-5 flex-shrink-0" />
                <p className="text-sm text-yellow-700">
                  You will receive a prompt on your mobile phone to authorize this payment. Please check your phone.
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderCardPaymentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 1: Enter Card Details</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').substring(0, 16))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="MM/YY"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 3))}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount in UGX</label>
              <input
                type="number"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="text-sm text-amber-700 mt-1">*Dollar Rate: $1 = UGX 3705</p>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 2: Confirm Payment</h3>
            <div className="bg-blue-50 p-4 rounded-md">
              <h4 className="font-medium text-blue-800">Payment Details</h4>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Card Number:</span>
                  <span className="text-sm font-medium">**** **** **** {cardNumber.slice(-4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Cardholder:</span>
                  <span className="text-sm font-medium">{cardName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Amount:</span>
                  <span className="text-sm font-medium">UGX {Number(amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Student ID:</span>
                  <span className="text-sm font-medium">{studentInfo.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Student Name:</span>
                  <span className="text-sm font-medium">{studentInfo.name}</span>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-md">
              <div className="flex items-start">
                <AlertCircle className="text-yellow-500 mr-2 mt-0.5 h-5 w-5 flex-shrink-0" />
                <p className="text-sm text-yellow-700">
                  You might be redirected to your banks 3D Secure authentication page.
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderUSSDStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 1: Enter Payment Details</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount in UGX</label>
              <input
                type="number"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="text-sm text-amber-700 mt-1">*Dollar Rate: $1 = UGX 3705</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <div className="relative">
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  <option value="Fees Payments">Fees Payments</option>
                  <option value="Examination Fees">Examination Fees</option>
                  <option value="Registration Fees">Registration Fees</option>
                  <option value="Other">Other</option>
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        );
      case 2:
        const generatedUssdCode = `*165*3*1*${studentInfo.studentNo}#`;
        
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 2: Dial USSD Code</h3>
            <div className="bg-blue-50 p-4 rounded-md">
              <h4 className="font-medium text-blue-800">Payment Details</h4>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Amount:</span>
                  <span className="text-sm font-medium">UGX {Number(amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Reason:</span>
                  <span className="text-sm font-medium">{reason}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Student ID:</span>
                  <span className="text-sm font-medium">{studentInfo.id}</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-100 p-4 rounded-md text-center">
              <p className="text-sm text-gray-600 mb-2">Dial the following USSD code on your phone:</p>
              <p className="text-xl font-bold text-gray-800 mb-2">{generatedUssdCode}</p>
              <button 
                className="text-blue-600 text-sm font-medium flex items-center mx-auto"
                onClick={() => handleCopyUssd(generatedUssdCode)}
              >
                <CreditCard className="h-4 w-4 mr-1" /> Copy code
              </button>
            </div>
            <div className="bg-yellow-50 p-4 rounded-md">
              <div className="flex items-start">
                <AlertCircle className="text-yellow-500 mr-2 mt-0.5 h-5 w-5 flex-shrink-0" />
                <p className="text-sm text-yellow-700">
                  After dialing the code, follow the prompts on your phone to complete the payment.
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderBankPaymentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 1: Select Bank</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
              <div className="relative">
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                >
                  <option value="">Select a bank</option>
                  <option value="Stanbic Bank">Stanbic Bank</option>
                  <option value="Centenary Bank">Centenary Bank</option>
                  <option value="DFCU Bank">DFCU Bank</option>
                  <option value="Equity Bank">Equity Bank</option>
                  <option value="Absa Bank">Absa Bank</option>
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount in UGX</label>
              <input
                type="number"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="text-sm text-amber-700 mt-1">*Dollar Rate: $1 = UGX 3705</p>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 2: Enter Account Details</h3>
            <div className="bg-blue-50 p-4 rounded-md mb-4">
              <p className="text-sm text-blue-800">
                Make a deposit to the following university account:
              </p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Account Name:</span>
                  <span className="text-sm font-medium">Victoria University</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Account Number:</span>
                  <span className="text-sm font-medium">0140012345678</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Bank:</span>
                  <span className="text-sm font-medium">{bankName}</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Account Number (Optional)</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference/Transaction Number*</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter reference number from bank slip"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
              <p className="text-sm text-gray-500 mt-1">Enter the transaction reference number from your bank deposit slip</p>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 3: Confirm Details</h3>
            <div className="bg-blue-50 p-4 rounded-md">
              <h4 className="font-medium text-blue-800">Payment Details</h4>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Bank:</span>
                  <span className="text-sm font-medium">{bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Amount:</span>
                  <span className="text-sm font-medium">UGX {Number(amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Reference:</span>
                  <span className="text-sm font-medium">{reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Student ID:</span>
                  <span className="text-sm font-medium">{studentInfo.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Student Name:</span>
                  <span className="text-sm font-medium">{studentInfo.name}</span>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-md">
              <div className="flex items-start">
                <AlertCircle className="text-yellow-500 mr-2 mt-0.5 h-5 w-5 flex-shrink-0" />
                <p className="text-sm text-yellow-700">
                  Your payment will be verified within 24 hours. You will receive a confirmation email once verified.
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderFormContent = () => {
    if (paymentStatus === 'processing') {
      return (
        <div className="text-center py-10">
          <Loader2 className="animate-spin h-12 w-12 mx-auto text-blue-500 mb-4" />
          <h3 className="text-lg font-semibold">Processing Payment</h3>
          <p className="text-gray-500 mt-2">Please wait while we process your payment...</p>
        </div>
      );
    }

    if (paymentStatus === 'success') {
      return (
        <div className="text-center py-10">
          <div className="bg-green-100 rounded-full p-3 inline-block mb-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold text-green-700">Payment Successful!</h3>
          <p className="text-gray-600 mt-2">Thank you for your payment of UGX {Number(amount).toLocaleString()}</p>
          <p className="text-gray-600">A receipt has been sent to your email.</p>
          <button
            className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            onClick={resetForm}
          >
            Make Another Payment
          </button>
        </div>
      );
    }

    if (paymentStatus === 'error') {
      return (
        <div className="text-center py-10">
          <div className="bg-red-100 rounded-full p-3 inline-block mb-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-red-700">Payment Failed</h3>
          <p className="text-gray-600 mt-2">Something went wrong with your payment. Please try again.</p>
          <button
            className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            onClick={() => setPaymentStatus('idle')}
          >
            Try Again
          </button>
        </div>
      );
    }

    switch (activeMethod) {
      case 'Mobile Money':
        return renderMobileMoneyStep();
      case 'Card Payment':
        return renderCardPaymentStep();
      case 'USSD':
        return renderUSSDStep();
      case 'Bank Payment / Agent Banking':
        return renderBankPaymentStep();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {showDialog && (
        <Dialog 
          message={dialogMessage}
          onClose={() => setShowDialog(false)}
        />
      )}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Student Info Section */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{studentInfo.name}</h2>
                <p className="text-gray-600">{studentInfo.studentNo}</p>
                <p className="text-gray-600">{studentInfo.faculty}</p>
                <p className="text-gray-600">{studentInfo.program}</p>
                <p className="text-gray-600">Cohort: {studentInfo.cohort}</p>
              </div>
              <div className="relative h-20 w-20">
                <Image
                  src={studentInfo.profileImage}
                  alt="Student profile"
                  fill
                  className="rounded-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Payment Method</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Mobile Money */}
              <button
                className={`p-4 rounded-lg border ${
                  activeMethod === 'Mobile Money'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                } transition-colors`}
                onClick={() => setActiveMethod('Mobile Money')}
              >
                <Smartphone className="h-6 w-6 text-blue-500 mb-2" />
                <span className="block font-medium">Mobile Money</span>
              </button>

              {/* Card Payment */}
              <button
                className={`p-4 rounded-lg border ${
                  activeMethod === 'Card Payment'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                } transition-colors`}
                onClick={() => setActiveMethod('Card Payment')}
              >
                <CreditCard className="h-6 w-6 text-blue-500 mb-2" />
                <span className="block font-medium">Card Payment</span>
              </button>

              {/* USSD */}
              <button
                className={`p-4 rounded-lg border ${
                  activeMethod === 'USSD'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                } transition-colors`}
                onClick={() => setActiveMethod('USSD')}
              >
                <Clock className="h-6 w-6 text-blue-500 mb-2" />
                <span className="block font-medium">USSD</span>
              </button>

              {/* Bank Payment */}
              <button
                className={`p-4 rounded-lg border ${
                  activeMethod === 'Bank Payment / Agent Banking'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                } transition-colors`}
                onClick={() => setActiveMethod('Bank Payment / Agent Banking')}
              >
                <Building2 className="h-6 w-6 text-blue-500 mb-2" />
                <span className="block font-medium">Bank Payment</span>
              </button>
            </div>
          </div>

          {/* Payment Form */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{activeMethod}</h3>
            
            {paymentStatus === 'idle' && renderSteps()}
            
            {renderFormContent()}
            
            {renderButtonsNav()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;
