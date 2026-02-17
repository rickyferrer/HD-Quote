'use client';

interface ContactFormProps {
  name: string;
  email: string;
  company: string;
  phone: string;
  notes: string;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onCompanyChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  errors: Record<string, string>;
}

export default function ContactForm({
  name,
  email,
  company,
  phone,
  notes,
  onNameChange,
  onEmailChange,
  onCompanyChange,
  onPhoneChange,
  onNotesChange,
  errors,
}: ContactFormProps) {
  return (
    <div className="space-y-5">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => onNameChange(e.target.value)}
          placeholder="Your full name"
          className={`w-full px-4 py-3 border rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition ${
            errors.name ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-500">{errors.name}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={e => onEmailChange(e.target.value)}
          placeholder="you@company.com"
          className={`w-full px-4 py-3 border rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition ${
            errors.email ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-500">{errors.email}</p>
        )}
      </div>

      {/* Company */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Company <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="text"
          value={company}
          onChange={e => onCompanyChange(e.target.value)}
          placeholder="Company name"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition"
        />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="tel"
          value={phone}
          onChange={e => onPhoneChange(e.target.value)}
          placeholder="(555) 123-4567"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes / Special Instructions <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
          placeholder="Any special requirements, finish notes, tolerances, etc."
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition resize-none"
        />
      </div>
    </div>
  );
}
