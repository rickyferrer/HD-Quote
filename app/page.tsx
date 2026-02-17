'use client';

import { useState } from 'react';
import StepIndicator from '@/components/StepIndicator';
import DxfUploader from '@/components/DxfUploader';
import PartConfigurator from '@/components/PartConfigurator';
import ContactForm from '@/components/ContactForm';
import EstimateResult from '@/components/EstimateResult';
import type {
  ParsedDxf,
  MaterialOption,
  OrderType,
  QuoteEstimate,
  QuoteResponse,
} from '@/lib/types';
import pricingData from '@/data/pricing.json';

const materials = pricingData.materials as MaterialOption[];

export default function Home() {
  const [step, setStep] = useState(1);

  // Step 1: Upload
  const [dxfBase64, setDxfBase64] = useState('');
  const [dxfFileName, setDxfFileName] = useState('');
  const [parsedDxf, setParsedDxf] = useState<ParsedDxf | null>(null);
  const [fileUploaded, setFileUploaded] = useState(false);

  // Step 2: Configure
  const [material, setMaterial] = useState(materials[0].name);
  const [gauge, setGauge] = useState(materials[0].gauges[0].label);
  const [quantity, setQuantity] = useState(1);
  const [hasBending, setHasBending] = useState(false);
  const [numberOfBends, setNumberOfBends] = useState(1);
  const [orderType, setOrderType] = useState<OrderType>('new');

  // Step 3: Contact
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});

  // Step 4: Result
  const [estimate, setEstimate] = useState<QuoteEstimate | null>(null);
  const [manualReview, setManualReview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleFileLoaded = (
    file: File,
    base64: string,
    parsed: ParsedDxf | null
  ) => {
    setDxfBase64(base64);
    setDxfFileName(file.name);
    setParsedDxf(parsed);
    setFileUploaded(true);
  };

  const validateContact = (): boolean => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Name is required';
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    setContactErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateContact()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dxfBase64,
          dxfFileName,
          parsedDxf,
          material,
          gauge,
          quantity,
          hasBending,
          numberOfBends: hasBending ? numberOfBends : 0,
          orderType,
          name: name.trim(),
          email: email.trim(),
          company: company.trim(),
          phone: phone.trim(),
          notes: notes.trim(),
        }),
      });

      const data: QuoteResponse = await response.json();

      if (!response.ok) {
        setSubmitError(data.message || 'Something went wrong. Please try again.');
        return;
      }

      if (data.estimate) {
        setEstimate(data.estimate);
      }
      setManualReview(data.manualReview ?? false);
      setStep(4);
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1e3a5f] text-white">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center gap-4">
          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">HD Sheet Metal & Fabrication</h1>
            <p className="text-blue-200 text-sm">Instant Quote Estimator</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <StepIndicator currentStep={step} />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Upload Your DXF File</h2>
              <p className="text-gray-500 mb-6">
                Upload your part file and we&apos;ll calculate an instant estimate.
              </p>
              <DxfUploader onFileLoaded={handleFileLoaded} parsedDxf={parsedDxf} />
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!fileUploaded}
                  className="px-8 py-3 bg-[#1e3a5f] text-white rounded-lg font-medium hover:bg-[#2d5a8e] disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Configure Your Part</h2>
              <p className="text-gray-500 mb-6">
                Select the material, thickness, and other options.
              </p>
              <PartConfigurator
                materials={materials}
                material={material}
                gauge={gauge}
                quantity={quantity}
                hasBending={hasBending}
                numberOfBends={numberOfBends}
                orderType={orderType}
                onMaterialChange={setMaterial}
                onGaugeChange={setGauge}
                onQuantityChange={setQuantity}
                onHasBendingChange={setHasBending}
                onNumberOfBendsChange={setNumberOfBends}
                onOrderTypeChange={setOrderType}
              />
              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="px-8 py-3 bg-[#1e3a5f] text-white rounded-lg font-medium hover:bg-[#2d5a8e] transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Contact */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Contact Information</h2>
              <p className="text-gray-500 mb-6">
                Tell us how to reach you with your confirmed quote.
              </p>
              <ContactForm
                name={name}
                email={email}
                company={company}
                phone={phone}
                notes={notes}
                onNameChange={setName}
                onEmailChange={setEmail}
                onCompanyChange={setCompany}
                onPhoneChange={setPhone}
                onNotesChange={setNotes}
                errors={contactErrors}
              />

              {submitError && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                  {submitError}
                </div>
              )}

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-[#1e3a5f] text-white rounded-lg font-medium hover:bg-[#2d5a8e] disabled:opacity-60 transition flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    'Get Your Estimate'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Result */}
          {step === 4 && (
            <EstimateResult
              estimate={estimate}
              parsedDxf={parsedDxf}
              material={material}
              gauge={gauge}
              quantity={quantity}
              email={email}
              manualReview={manualReview}
            />
          )}
        </div>
      </div>
    </main>
  );
}
