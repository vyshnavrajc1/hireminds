"use client"
import Link from "next/link";
import { useEffect, useState } from "react";
import { getAuthHeaders, getUserId } from "@/lib/auth";

// --- Types ---
interface FairnessAudit {
  score: number;
  findings: { category: string; message: string; severity: string }[];
  recommendations: string;
  type: string;
}

interface SWOTAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

interface DecisionVerdict {
  recommendation: string | null;
  summary: string | null;
  swot: SWOTAnalysis | null;
  overall_score: number | null;
}

interface Job {
  id: number;
  title: string;
  department: string;
  location: string;
  assessment_difficulty: string;
  interview_focus: string;
  salary_range: string;
  description: string;
  fairness_audits?: FairnessAudit[];
}

interface EvaluationFeedback {
  skill: string;
  score: number;
  reason: string;
}

interface Evaluation {
  id: number;
  interviewer: string;
  round_type: string;
  score: number;
  feedback: EvaluationFeedback[];
  conducted_at: string;
}

interface Candidate {
  id: number;
  full_name: string;
  email: string;
  phone_number: string;
  github_url: string;
  status: string;
  applied_at: string;
  evaluations: Evaluation[];
  fairness_audits?: FairnessAudit[];
  decision_verdict?: DecisionVerdict;
}

interface InterviewQuestion {
  id: number;
  skill_name: string;
  question_text: string;
  expected_answer: string;
}

export default function Dashboard() {
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidateError, setCandidateError] = useState<string | null>(null);

  // --- Interview State ---
  const [interviewingCandidate, setInterviewingCandidate] = useState<Candidate | null>(null);
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestion[]>([]);
  const [answers, setAnswers] = useState<{ [id: number]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchJobs();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/auth/${getUserId()}`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setUserName(data.name);
        setUserRole(data.role === 'hr' ? 'HR Manager' : data.role);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/jobs/hr/${getUserId()}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async (jobId: number) => {
    setLoadingCandidates(true);
    setCandidateError(null);
    try {
      const response = await fetch(`http://localhost:8000/api/jobs/${jobId}/candidates`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch candidates");
      const data = await response.json();
      setCandidates(data);
    } catch (error: any) {
      setCandidateError(error.message);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleJobClick = (job: Job) => {
    setSelectedJob(job);
    fetchCandidates(job.id);
  };

  const handleStartInterview = async (candidate: Candidate) => {
    setInterviewingCandidate(candidate);
    setInterviewQuestions([]);
    setAnswers({});
    setLoadingQuestions(true);
    
    try {
      const response = await fetch(`http://localhost:8000/api/jobs/${selectedJob?.id}/questions`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch questions");
      const data = await response.json();
      setInterviewQuestions(data);
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleAnswerChange = (questionId: number, text: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: text }));
  };

  const handleSubmitInterview = async () => {
    if (!selectedJob || !interviewingCandidate) return;

    setIsSubmitting(true);
    try {
      // Build payload matching the backend InterviewSubmission schema exactly
      const payload = {
        application_id: interviewingCandidate.id,
        job_id: selectedJob.id,
        answers: interviewQuestions.map(q => ({
          skill_name: q.skill_name,
          question_text: q.question_text,
          expected_answer: q.expected_answer,
          candidate_answer: answers[q.id] || ""
        }))
      };

      const response = await fetch("http://localhost:8000/api/applications/interview/evaluate", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Failed to submit interview");
      
      // Refresh candidates to see updated scores
      await fetchCandidates(selectedJob.id);
      setInterviewingCandidate(null);
      alert("Interview evaluation successfully processed by AI Brain!");
    } catch (error) {
      console.error("Error submitting interview:", error);
      alert("Error submitting interview evaluation");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 border-solid mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Powering up HireMinds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Hire<span className="text-blue-600">Minds</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-gray-900">{userName || "Loading..."}</span>
            <span className="text-[10px] uppercase font-black text-blue-600 tracking-widest">{userRole || "HR"}</span>
          </div>
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-lg">
            {userName ? userName.charAt(0).toUpperCase() : ""}
          </div>
        </div>
      </nav>

      <main className="p-8 max-w-[1600px] mx-auto">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-4xl font-black text-gray-900 mb-2">HR Dashboard</h2>
            <p className="text-gray-500 font-medium">Analyze and manage your talent pipeline with Agentic Intelligence.</p>
          </div>
          <Link
            href="/jobs/new"
            className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-xl font-bold transition-all shadow-xl shadow-gray-200 flex items-center"
          >
            <span className="mr-2 text-xl">+</span> Post New Job
          </Link>
        </div>

        {!selectedJob ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {jobs.map((job) => (
              <div 
                key={job.id} 
                onClick={() => handleJobClick(job)}
                className="group bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest border border-blue-100">
                    {job.department}
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest border border-emerald-100">
                    {job.location}
                  </span>
                </div>
                
                <h3 className="text-2xl font-black text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">{job.title}</h3>
                
                <div className="space-y-2 mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center text-sm">
                    <span className="font-semibold text-gray-700 w-32">Difficulty:</span>
                    <span className="text-gray-600">{job.assessment_difficulty}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="font-semibold text-gray-700 w-32">Focus:</span>
                    <span className="text-gray-600">{job.interview_focus}</span>
                  </div>
                  {job.fairness_audits && job.fairness_audits.length > 0 && (
                    <div className="flex items-center text-sm pt-2">
                       <span className="font-semibold text-gray-700 w-32">Fairness Audit:</span>
                       <span className={`font-bold px-2 py-0.5 rounded ${job.fairness_audits[0].score >= 90 ? 'text-green-600 bg-green-50' : job.fairness_audits[0].score >= 70 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'}`}>
                         {job.fairness_audits[0].score}/100
                       </span>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-2 w-full text-center text-sm font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Review Applicants →
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom duration-500">
            <button 
              onClick={() => setSelectedJob(null)}
              className="mb-8 text-gray-500 font-bold hover:text-black flex items-center gap-2 transition-colors group"
            >
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to All Jobs
            </button>
            
            <div className="flex justify-between items-center mb-10 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-4xl font-black text-gray-900">{selectedJob.title}</h3>
                  <span className="bg-blue-100 text-blue-700 text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest">{selectedJob.location}</span>
                </div>
                <p className="text-gray-500 font-medium">Tracking {candidates.length} active candidates for this role</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-extrabold text-blue-600">{candidates.length}</div>
                <div className="text-sm text-gray-500 font-medium tracking-wide uppercase mt-1">Total Applicants</div>
              </div>
            </div>

            {loadingCandidates ? (
               <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                 <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
                 <p className="text-gray-500 text-lg">Fetching candidates...</p>
               </div>
            ) : candidateError ? (
               <div className="p-6 bg-red-50 text-red-700 rounded-lg border border-red-200 font-medium flex items-center">
                 <svg className="w-6 h-6 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 {candidateError}
               </div>
            ) : candidates.length === 0 ? (
               <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                 <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                 <h3 className="text-lg font-medium text-gray-900">No applicants yet</h3>
                 <p className="text-gray-500 mt-1">Candidates haven't submitted their resumes to this opening.</p>
               </div>
            ) : (
               <div className="space-y-6">
                 {candidates.map(candidate => (
                   <div key={candidate.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200 transition-all">
                     
                     <div className="flex justify-between items-start mb-4">
                       <div>
                         <h3 className="text-2xl font-bold text-gray-900">{candidate.full_name}</h3>
                         <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600 font-medium">
                           <a href={`mailto:${candidate.email}`} className="flex items-center hover:text-blue-600 transition-colors bg-gray-50 px-3 py-1.5 rounded-md border border-gray-100">
                             <span className="mr-2 opacity-60">✉️</span> {candidate.email}
                           </a>
                           <span className="flex items-center bg-gray-50 px-3 py-1.5 rounded-md border border-gray-100">
                             <span className="mr-2 opacity-60">📞</span> {candidate.phone_number}
                           </span>
                           {candidate.github_url && (
                             <a href={candidate.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-blue-600 transition-colors bg-gray-50 px-3 py-1.5 rounded-md border border-gray-100">
                               <span className="mr-2 opacity-60">💻</span> GitHub Profile
                             </a>
                           )}
                         </div>
                       </div>
                       
                       <div className="flex flex-col items-end gap-3">
                         <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                           {candidate.status}
                         </span>
                         
                         <button
                           onClick={() => handleStartInterview(candidate)}
                           className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg shadow-sm font-bold text-sm transition-colors flex items-center transition-transform hover:scale-105 active:scale-95"
                         >
                           <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                           Conduct Interview
                         </button>
                         <span className="text-xs text-gray-400 mt-1 font-medium">
                           Applied: {new Date(candidate.applied_at).toLocaleDateString()}
                         </span>
                       </div>
                     </div>

                     {/* 💡 THE DECISION AGENT: FINAL VERDICT MODULE */}
                     {candidate.decision_verdict && candidate.decision_verdict.recommendation && (
                       <div className="mb-10 mt-8 bg-white rounded-2xl border-2 border-purple-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top duration-500">
                         <div className={`p-6 flex flex-col md:flex-row items-center justify-between gap-6 ${
                           candidate.decision_verdict.recommendation === 'HIRE' ? 'bg-gradient-to-r from-green-50 to-emerald-50' : 
                           candidate.decision_verdict.recommendation === 'STRONG MAYBE' ? 'bg-gradient-to-r from-amber-50 to-orange-50' : 
                           'bg-gradient-to-r from-red-50 to-rose-50'
                         }`}>
                           <div className="flex items-center gap-6">
                             <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-lg border-2 ${
                               candidate.decision_verdict.recommendation === 'HIRE' ? 'bg-white border-green-200 text-green-600' : 
                               candidate.decision_verdict.recommendation === 'STRONG MAYBE' ? 'bg-white border-amber-200 text-amber-600' : 
                               'bg-white border-red-200 text-red-600'
                             }`}>
                               {candidate.decision_verdict.recommendation === 'HIRE' ? '✅' : 
                                candidate.decision_verdict.recommendation === 'STRONG MAYBE' ? '⚖️' : '❌'}
                             </div>
                             <div>
                               <div className="flex items-center gap-2 mb-1">
                                 <span className="text-xs font-bold uppercase tracking-widest text-purple-600">Decision Agent Verdict</span>
                                 <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">v2.5 Flash</span>
                               </div>
                               <h3 className={`text-3xl font-black ${
                                 candidate.decision_verdict.recommendation === 'HIRE' ? 'text-green-800' : 
                                 candidate.decision_verdict.recommendation === 'STRONG MAYBE' ? 'text-amber-800' : 
                                 'text-red-800'
                               }`}>
                                 {candidate.decision_verdict.recommendation.replace('_', ' ')}
                               </h3>
                               <p className="text-gray-600 max-w-xl text-sm leading-relaxed mt-2 font-medium">
                                 {candidate.decision_verdict.summary}
                               </p>
                             </div>
                           </div>
                           <div className="text-center md:text-right bg-white/40 backdrop-blur-sm p-4 rounded-xl border border-white/60">
                             <div className={`text-5xl font-black ${
                               (candidate.decision_verdict.overall_score ?? 0) >= 80 ? 'text-green-600' : 
                               (candidate.decision_verdict.overall_score ?? 0) >= 60 ? 'text-amber-500' : 'text-red-500'
                             }`}>
                               {candidate.decision_verdict.overall_score}<span className="text-xl opacity-50">%</span>
                             </div>
                             <div className="text-[10px] font-black uppercase tracking-tighter text-gray-400 mt-1">Aggregated AI Match</div>
                           </div>
                         </div>

                         {/* SWOT ANALYSIS GRID */}
                         {candidate.decision_verdict.swot && (
                           <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-white">
                             <div className="bg-green-50/30 p-5 rounded-2xl border border-green-100/50 hover:shadow-md transition-shadow">
                               <div className="flex items-center gap-2 mb-3">
                                 <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold">S</span>
                                 <span className="font-bold text-green-800 uppercase tracking-widest text-[10px]">Strengths</span>
                               </div>
                               <ul className="space-y-2">
                                 {candidate.decision_verdict.swot.strengths.map((s, i) => (
                                   <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                                     <span className="text-green-500 mt-0.5">✓</span> {s}
                                   </li>
                                 ))}
                               </ul>
                             </div>
                             
                             <div className="bg-red-50/30 p-5 rounded-2xl border border-red-100/50 hover:shadow-md transition-shadow">
                               <div className="flex items-center gap-2 mb-3">
                                 <span className="bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold">W</span>
                                 <span className="font-bold text-red-800 uppercase tracking-widest text-[10px]">Weaknesses</span>
                               </div>
                               <ul className="space-y-2">
                                 {candidate.decision_verdict.swot.weaknesses.map((w, i) => (
                                   <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                                     <span className="text-red-500 mt-0.5">⚠</span> {w}
                                   </li>
                                 ))}
                               </ul>
                             </div>

                             <div className="bg-blue-50/30 p-5 rounded-2xl border border-blue-100/50 hover:shadow-md transition-shadow">
                               <div className="flex items-center gap-2 mb-3">
                                 <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold">O</span>
                                 <span className="font-bold text-blue-800 uppercase tracking-widest text-[10px]">Opportunities</span>
                               </div>
                               <ul className="space-y-2">
                                 {candidate.decision_verdict.swot.opportunities.map((o, i) => (
                                   <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                                     <span className="text-blue-500 mt-0.5">↗</span> {o}
                                   </li>
                                 ))}
                               </ul>
                             </div>

                             <div className="bg-orange-50/30 p-5 rounded-2xl border border-orange-100/50 hover:shadow-md transition-shadow">
                               <div className="flex items-center gap-2 mb-3">
                                 <span className="bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold">T</span>
                                 <span className="font-bold text-orange-800 uppercase tracking-widest text-[10px]">Threats</span>
                               </div>
                               <ul className="space-y-2">
                                 {candidate.decision_verdict.swot.threats.map((t, i) => (
                                   <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                                     <span className="text-orange-500 mt-0.5">!</span> {t}
                                   </li>
                                 ))}
                               </ul>
                             </div>
                           </div>
                         )}
                       </div>
                     )}
                     
                     {/* Embedded AI Evaluations Module */}
                     {candidate.evaluations && candidate.evaluations.length > 0 && (
                       <div className="mt-8">
                         <div className="flex items-center mb-4">
                           <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                           <h4 className="font-bold text-gray-800 px-4 flex items-center uppercase tracking-wide text-sm">
                             <span className="bg-gradient-to-tr from-purple-500 to-blue-500 text-white p-1 rounded-md mb-0.5 mr-2 shadow-sm text-xs w-6 h-6 flex items-center justify-center">✦</span>
                             AI Match Evaluations
                           </h4>
                           <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                         </div>
                         {candidate.evaluations.map(ev => (
                           <div key={ev.id} className="bg-gradient-to-br from-blue-50/50 to-white rounded-xl p-5 border border-blue-100/60 shadow-inner mb-4">
                             <div className="flex justify-between items-center mb-4 border-b border-blue-100/50 pb-3">
                               <div>
                                 <span className="font-semibold text-gray-800 text-lg block">{ev.round_type}</span>
                                 <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">via {ev.interviewer}</span>
                               </div>
                               <div className="text-right">
                                 <div className={`text-3xl font-black ${ev.score >= 80 ? 'text-green-600' : ev.score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                                   {ev.score}<span className="text-lg text-gray-400 font-medium">/100</span>
                                 </div>
                                 <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-1">Match Score</div>
                               </div>
                             </div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               {ev.feedback.map((f, idx) => (
                                 <div key={idx} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                   <div className="flex justify-between items-start mb-2">
                                     <strong className="text-gray-900 font-bold pr-2">{f.skill}</strong>
                                     <span className={`px-2 py-0.5 rounded text-xs font-bold ${f.score >= 80 ? 'bg-green-100 text-green-700' : f.score >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                       {f.score}/100
                                     </span>
                                   </div>
                                   <p className="text-gray-600 text-sm leading-relaxed">{f.reason}</p>
                                 </div>
                               ))}
                             </div>
                           </div>
                         ))}
                       </div>
                     )}

                     {/* Bias & Fairness Audit Module */}
                     {candidate.fairness_audits && candidate.fairness_audits.length > 0 && (
                       <div className="mt-10 pt-10 border-t border-gray-100">
                         <div className="flex items-center mb-6">
                           <h4 className="font-bold text-gray-800 flex items-center uppercase tracking-widest text-sm bg-red-50 text-red-700 px-4 py-2 rounded-full border border-red-100 shadow-sm">
                             <span className="mr-2">⚖️</span> 
                             Agentic Bias & Fairness Audit
                           </h4>
                         </div>

                         {candidate.fairness_audits.map((audit, idx) => (
                           <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6 shadow-sm">
                             <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                               <span className="font-bold text-gray-700">{audit.type === 'CANDIDATE_AUDIT' ? 'Evaluation Fairness Check' : 'JD Alignment Audit'}</span>
                               <div className="flex items-center">
                                 <span className="text-sm text-gray-500 mr-3">Audit Score:</span>
                                 <span className={`font-black text-xl ${audit.score >= 90 ? 'text-green-600' : audit.score >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
                                   {audit.score}/100
                                 </span>
                               </div>
                             </div>
                             
                             <div className="p-5">
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                 {audit.findings.map((finding, fidx) => (
                                   <div key={fidx} className="flex items-start p-3 bg-gray-50 rounded-lg border border-gray-100">
                                     <div className={`w-2 h-2 rounded-full mt-2 mr-3 shrink-0 ${finding.severity === 'High' ? 'bg-red-500' : finding.severity === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                                     <div>
                                       <strong className="text-xs uppercase text-gray-400 block mb-1 font-bold">{finding.category}</strong>
                                       <p className="text-sm text-gray-700 leading-tight">{finding.message}</p>
                                     </div>
                                   </div>
                                 ))}
                               </div>
                               
                               <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                 <span className="text-xs font-bold text-blue-800 uppercase tracking-widest block mb-2">Fairness Engine Recommendation:</span>
                                 <p className="text-gray-700 text-sm leading-relaxed italic">"{audit.recommendations}"</p>
                               </div>
                             </div>
                           </div>
                         ))}
                       </div>
                     )}
                     
                   </div>
                 ))}
               </div>
            )}

            {/* --- Interview Modal --- */}
            {interviewingCandidate && (
              <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-300">
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md">Round 2: Technical Live</span>
                        </div>
                        <h2 className="text-3xl font-black">Conduct Interview</h2>
                        <p className="text-purple-100 mt-1 font-medium italic opacity-90">Evaluating {interviewingCandidate.full_name} for "{selectedJob?.title}"</p>
                      </div>
                      <button 
                        onClick={() => setInterviewingCandidate(null)}
                        className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
                      >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-10 space-y-10">
                    {loadingQuestions ? (
                       <div className="text-center py-10">
                          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-purple-600 mx-auto mb-4"></div>
                          <p className="text-gray-500 font-medium">Generating structured interview questions...</p>
                       </div>
                    ) : interviewQuestions.length === 0 ? (
                       <div className="text-center py-10 bg-purple-50 rounded-2xl border border-purple-100">
                         <p className="text-purple-700 font-bold mb-2">No interview questions found.</p>
                         <p className="text-purple-500 text-sm">Please make sure the Job has finished its initial AI processing.</p>
                       </div>
                    ) : (
                       interviewQuestions.map((q, idx) => (
                        <div key={q.id} className="relative group">
                          <div className="absolute -left-6 top-0 bottom-0 w-1 bg-purple-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="flex justify-between items-start mb-4">
                            <span className="bg-purple-50 text-purple-700 text-[10px] font-black px-3 py-1.5 rounded-lg border border-purple-100 shadow-sm transform -rotate-1">QUESTION #{idx + 1}</span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">{q.skill_name}</span>
                          </div>
                          <h4 className="text-xl font-bold text-gray-900 mb-6 leading-snug">{q.question_text}</h4>
                          
                          <div className="space-y-4">
                             <div className="flex flex-col gap-2">
                               <label className="text-xs font-black text-gray-400 uppercase tracking-tighter">Candidate Answer Transcript</label>
                               <textarea 
                                 className="w-full p-5 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-purple-100 focus:border-purple-600 outline-none transition-all placeholder:text-gray-300 font-medium text-gray-700 shadow-inner"
                                 rows={4}
                                 placeholder="Type or paste the candidate's response here..."
                                 value={answers[q.id] || ""}
                                 onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                               />
                             </div>
                             
                             <details className="group">
                               <summary className="text-xs font-bold text-purple-600 cursor-pointer hover:underline list-none flex items-center gap-2">
                                 <span className="bg-purple-100 p-1 rounded-md group-open:rotate-180 transition-transform">▼</span>
                                 Show AI-Expected Ideal Answer
                               </summary>
                               <div className="mt-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 text-sm text-gray-600 leading-relaxed italic border-l-4 border-l-emerald-400">
                                 {q.expected_answer}
                               </div>
                             </details>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
                    <button 
                      onClick={() => setInterviewingCandidate(null)}
                      className="px-8 py-3 text-gray-500 font-bold hover:text-black transition-colors"
                    >
                      Discard & Cancel
                    </button>
                    <button 
                      onClick={handleSubmitInterview}
                      disabled={isSubmitting || interviewQuestions.length === 0}
                      className={`px-10 py-3 rounded-xl font-black shadow-xl transition-all flex items-center gap-3 ${
                        (isSubmitting || interviewQuestions.length === 0)
                          ? "bg-gray-300 cursor-not-allowed" 
                          : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:scale-105 active:scale-95 shadow-purple-200"
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></div>
                          Finishing Audit...
                        </>
                      ) : "Confirm & Evaluate with AI"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}