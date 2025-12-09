export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50">
      <div className="text-center max-w-2xl mx-auto px-6">
        <h1 className="text-5xl font-bold text-slate-900 mb-4">Find My Tutor</h1>
        <p className="text-xl text-slate-600 mb-8">Connect with expert tutors for personalized learning journeys</p>
        <a
          href="/login"
          className="inline-block px-8 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors duration-200"
        >
          Get Started →
        </a>
      </div>
    </div>
  )
}
