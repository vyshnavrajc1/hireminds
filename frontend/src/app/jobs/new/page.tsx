"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuthHeaders, getUserId } from "@/lib/auth";

// Interface for TypeScript to understand our Skill objects
interface Skill {
  id: number;
  name: string;
  weight: number;
}

export default function CreateJobPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);
  const [isFetchingSkills, setIsFetchingSkills] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  
  // Step 1 State (Job Details & Agent Config)
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("Engineering");
  const [location, setLocation] = useState("Remote");
  const [salary, setSalary] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [difficulty, setDifficulty] = useState("Medium (Standard)");
  const [strictness, setStrictness] = useState("Standard Evaluation");
  
  // Step 2 State (AI Profile)
  const [skills, setSkills] = useState<Skill[]>([]);

  // 1. POST request to create the job
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingJob(true);
    
    // Read the logged-in user ID from localStorage (fallback to 1 if missing)
    const hrId = getUserId() ?? 1;
    
    const newJobData = {
      title: jobTitle,
      department: department,
      location : location,
      salary_range: salary,
      description: jobDescription,
      assessment_difficulty: difficulty,  // FIXED: backend expects 'assessment_difficulty'
      interview_focus: strictness,
      hr_id: hrId
    };

    try {
      // Create new job via API
      const response = await fetch("http://127.0.0.1:8000/api/jobs/", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(newJobData),
      });

      if (!response.ok) throw new Error("Failed to create job");
      
      const data = await response.json();
      setJobId(data.id); // Save the returned Job ID
      setStep(2); // Move to next step
      
    } catch (error) {
      console.error("Backend not connected, using fallback.", error);
      // Fallback for Ideathon testing if API isn't ready
      setTimeout(() => {
        setJobId("MOCK-JOB-123");
        setStep(2);
      }, 1500);
    } finally {
      setIsSubmittingJob(false);
    }
  };

  // Add these new states near your other state declarations
  const [loadingText, setLoadingText] = useState("Agent is analyzing the Job Description...");

  // 2. GET request to fetch skills with POLLING
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (step === 2 && jobId) {
      setIsFetchingSkills(true);

      // Cycle through "AI thinking" messages to keep the user engaged
      const loadingMessages = [
        "Agent is analyzing the Job Description...",
        "Extracting core competencies...",
        "Assigning evidence weights...",
        "Finalizing Role Profile..."
      ];
      let msgIndex = 0;
      const msgInterval = setInterval(() => {
        msgIndex = (msgIndex + 1) % loadingMessages.length;
        setLoadingText(loadingMessages[msgIndex]);
      }, 4000);

      const fetchSkills = async () => {
        try {
          const response = await fetch(`http://127.0.0.1:8000/api/jobs/${jobId}/skills`, {
            headers: getAuthHeaders(),
          });
          
          // If backend returns 202 (Accepted/Processing) or 404 (Not Found Yet)
          if (response.status === 202 || response.status === 404) {
            console.log("AI is still processing... waiting.");
            return; // Exit this attempt, the interval will try again in 3 seconds
          }

          if (!response.ok) throw new Error("Failed to fetch skills");
          
          const fetchedSkills = await response.json();
          
          // If the backend returns an empty array, it might still be processing
          if (fetchedSkills && fetchedSkills.length > 0) {
            setSkills(fetchedSkills);
            setIsFetchingSkills(false);
            clearInterval(pollInterval); // STOP POLLING! The data is here.
            clearInterval(msgInterval);  // Stop changing the loading text
          }
          
        } catch (error) {
          console.error("Backend error or not connected. Using fallback.", error);
          
          // Fallback mock skills if API completely fails during Ideathon
          clearInterval(pollInterval);
          clearInterval(msgInterval);
          setTimeout(() => {
            setSkills([
              { id: 1, name: "API Design", weight: 30 },
              { id: 2, name: "Database Operations", weight: 25 },
              { id: 3, name: "System Design", weight: 25 },
              { id: 4, name: "Communication", weight: 20 },
            ]);
            setIsFetchingSkills(false);
          }, 3000); // Simulate a 3-second wait for the fallback
        }
      };

      // Initial fetch attempt
      fetchSkills();
      
      // Setup the polling interval to check every 3 seconds (3000ms)
      pollInterval = setInterval(fetchSkills, 3000);

      // Cleanup function when component unmounts
      return () => {
        clearInterval(pollInterval);
        clearInterval(msgInterval);
      };
    }
  }, [step, jobId]);

  // 3. Final Publish (Save updated weights)
  const handlePublish = async () => {
    try {
      // Optional: PUT request to save the user's adjusted weights
      await fetch(`/api/jobs/${jobId}/skills`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills }),
      });
    } catch (error) {
      console.log("Mock publish complete");
    }
    router.push("/dashboard");
  };

  // Helper to handle slider changes
  const updateSkillWeight = (id: number, newWeight: number) => {
    setSkills(skills.map(skill => skill.id === id ? { ...skill, weight: newWeight } : skill));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-800 transition-colors">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 border-l border-gray-300 pl-4">
            Create Job Requisition
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className={`px-3 py-1 rounded-full ${step === 1 ? "bg-blue-100 text-blue-700" : "text-gray-500"}`}>
            1. Job & Agent Details
          </span>
          <span className="text-gray-300">-----</span>
          <span className={`px-3 py-1 rounded-full ${step === 2 ? "bg-blue-100 text-blue-700" : "text-gray-500"}`}>
            2. AI Role Profile
          </span>
        </div>
      </header>

      {/* Main Form Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-8 text-gray-700">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          
          {/* STEP 1: Standard Details & Agent Config */}
          {step === 1 && (
            <form onSubmit={handleCreateJob} className="p-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800">Basic Information</h2>
                <p className="text-sm text-gray-500">Provide the standard details and configure the AI agents.</p>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                  <input
                    type="text" required
                    value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Backend Engineer"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select 
                    value={department} onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Product">Product</option>
                    <option value="Design">Design</option>
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location / Setup</label>
                  <select 
                    value={location} onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Salary Range</label>
                  <input
                    type="text" 
                    value={salary} onChange={(e) => setSalary(e.target.value)}
                    placeholder="$120k - $150k"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="mb-8 border-t border-gray-100 pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Description (Required)
                </label>
                <textarea
                  required
                  value={jobDescription} onChange={(e) => setJobDescription(e.target.value)}
                  rows={6}
                  placeholder="Paste the job description here. The Role Intelligence Agent will extract core skills and weights automatically."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              {/* Agent Instructions Moved to Step 1 */}
              <div className="mb-8 border-t border-gray-100 pt-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Agent Configurations</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Agent Difficulty</label>
                    <select 
                      value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option>Easy (Screening)</option>
                      <option>Medium (Standard)</option>
                      <option>Hard (Deep Tech)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Interview Agent Focus</label>
                    <select 
                      value={strictness} onChange={(e) => setStrictness(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option>Standard Evaluation</option>
                      <option>Strict on Core Tech</option>
                      <option>Heavy on Problem Solving</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-t border-gray-100 pt-6">
                <button
                  type="submit"
                  disabled={isSubmittingJob || !jobTitle || !jobDescription}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-70"
                >
                  {isSubmittingJob ? (
                    <>
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                      Submitting Job...
                    </>
                  ) : (
                    "Create Job & Extract Skills →"
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: AI Configuration (Human-in-the-loop) */}
          {step === 2 && (
            <div className="p-8">
              <div className="mb-8 border-b border-gray-100 pb-6">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-gray-800">Role Intelligence Output</h2>
                </div>
                <p className="text-sm text-gray-500">
                  The AI has extracted the following skill weights for the <span className="font-semibold text-gray-700">{jobTitle}</span> role. Adjust them as needed before publishing.
                </p>
              </div>

              {/* Loading State for Skills */}
              {isFetchingSkills ? (
                <div className="flex flex-col items-center justify-center py-12 text-blue-600">
                  <span className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></span>
                  <p className="text-sm font-medium text-gray-600 transition-opacity duration-500">
                    {loadingText}
                  </p>
                </div>
              ) : (
                <div className="mb-8 bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Extracted Skills & Evidence Weights</h3>
                  <div className="space-y-5">
                    {skills.map((skill) => (
                      <div key={skill.id}>
                        <div className="flex justify-between text-sm font-medium mb-1">
                          <span className="text-gray-800">{skill.name}</span>
                          <span className="text-blue-600">{skill.weight}%</span>
                        </div>
                        <input
                          type="range"
                          min="0" max="100"
                          value={skill.weight}
                          onChange={(e) => updateSkillWeight(skill.id, parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                    ))}
                    {skills.length === 0 && (
                      <p className="text-sm text-gray-500 italic">No skills found. Please check your backend connection.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between border-t border-gray-100 pt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition"
                >
                  ← Edit Job Details
                </button>
                <button
                  onClick={handlePublish}
                  disabled={isFetchingSkills}
                  className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition shadow-sm disabled:opacity-50"
                >
                  Publish
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}