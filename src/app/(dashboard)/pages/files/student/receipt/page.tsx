"use client";
import React from 'react';
import Image from 'next/image';

const PaymentReceipt = () => {
  const transactionDetails = {
    transactionId: "V-104546",
    date: "22nd Oct 2024, 05:22 PM EAT",
    studentName: "NYANZI Mahad",
    registrationNo: "VU-BSF-2407-0444-DAY",
    studentNo: "240718108",
    nationality: "Ugandan",
    intake: "BSF JUL/2024 1.1",
    amount: "UGX 650,000",
    reason: "Tuition Payment",
    paymentMethod: "Mobile Money",
    phoneNumber: "+256782651854",
  };

  const downloadReceipt = () => {
    const content = `
      Rich Dad Junior School
      Payment Receipt
      -------------------------------
      Transaction ID: ${transactionDetails.transactionId}
      Date: ${transactionDetails.date}
      Student Name: ${transactionDetails.studentName}
      Registration No: ${transactionDetails.registrationNo}
      Student No: ${transactionDetails.studentNo}
      Nationality: ${transactionDetails.nationality}
      Intake: ${transactionDetails.intake}
      Amount: ${transactionDetails.amount}
      Reason: ${transactionDetails.reason}
      Payment Method: ${transactionDetails.paymentMethod}
      Phone Number: ${transactionDetails.phoneNumber}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt_${transactionDetails.transactionId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center">
      <div id="receipt" className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Image 
            src="/richdadjrschool-logo.png" 
            alt="School Logo" 
            width={64}
            height={64}
            className="mx-auto"
            priority
          />
          <h1 className="text-lg font-bold text-gray-800 mt-2">Rich Dad Junior School</h1>
          <p className="text-sm text-gray-600">Plot Entebbe Road, Najjankumbi, Kampala, Uganda</p>
        </div>

        {/* Transaction Details */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-700">Payment Receipt</h2>
          <p className="text-sm text-gray-500">Transaction ID: <span className="font-medium">{transactionDetails.transactionId}</span></p>
          <p className="text-sm text-gray-500">Date: <span className="font-medium">{transactionDetails.date}</span></p>
        </div>

        {/* Student Information */}
        <div className="space-y-1 text-sm text-gray-600">
          <p>Student Name: <span className="font-medium">{transactionDetails.studentName}</span></p>
          <p>Registration No: <span className="font-medium">{transactionDetails.registrationNo}</span></p>
          <p>Student No: <span className="font-medium">{transactionDetails.studentNo}</span></p>
          <p>Nationality: <span className="font-medium">{transactionDetails.nationality}</span></p>
          <p>Intake: <span className="font-medium">{transactionDetails.intake}</span></p>
        </div>

        {/* Payment Details */}
        <div className="space-y-1 text-sm text-gray-600">
          <p>Amount: <span className="font-bold text-green-600">{transactionDetails.amount}</span></p>
          <p>Reason: <span className="font-medium">{transactionDetails.reason}</span></p>
          <p>Payment Method: <span className="font-medium">{transactionDetails.paymentMethod}</span></p>
          <p>Phone Number: <span className="font-medium">{transactionDetails.phoneNumber}</span></p>
        </div>

        {/* Footer */}
        <div className="text-sm text-gray-500 text-center">
          <p>Thank you for your payment!</p>
          <p>
            For help or inquiries, email us at
            <a href="mailto:richdadjuniorschool2017@gmail.com" className="text-blue-500 underline"> richdadjuniorschool2017@gmail.com</a>
            or call <a href="tel:+256759996141" className="text-blue-500 underline">+256 759 996 141</a>.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex justify-center space-x-4">
          <button onClick={downloadReceipt} className="px-4 py-2 bg-blue-500 text-white rounded-md shadow hover:bg-blue-600">
            Download Receipt
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentReceipt;