"use client"
import { useEffect, useState } from "react";

export default function Portal() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const response = await fetch("http://127.0.0.1:8000/api/jobs/");
                if (response.ok) {
                    const data = await response.json();
                    setJobs(data);
                } else {
                    console.error("Failed to fetch jobs");
                }
            } catch (error) {
                console.error("Error connecting to the API:", error);
            } finally {
                setLoading(false);
            }
        }
        
        fetchJobs();
    }, []);

    // Navigate to application form with job ID
    const handleApply = (jobId: number, jobTitle: string) => {
        window.location.href = `/apply/${jobId}?jobTitle=${encodeURIComponent(jobTitle)}`;
    };

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                
                {/* Header Section */}
                <div className="mb-10 text-center">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
                        Job Portal
                    </h1>
                    <p className="text-lg text-gray-600">Find and apply for your next big opportunity.</p>
                </div>

                {/* Loading & Empty States */}
                {loading ? (
                    <div className="text-center text-xl text-gray-500 mt-20">Loading available jobs...</div>
                ) : jobs.length === 0 ? (
                    <div className="text-center text-xl text-gray-500 mt-20">No jobs posted yet. Check back later!</div>
                ) : (
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Job Grid comment moved INSIDE the valid JSX div */}
                        {jobs.map((job) => (
                            <div 
                                key={job.id} 
                                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col hover:shadow-md transition-shadow duration-200"
                            >
                                {/* Card Top: Title & Department */}
                                <div className="flex justify-between items-start mb-4">
                                    <h2 className="text-xl font-bold text-gray-900 line-clamp-2 pr-4">
                                        {job.title}
                                    </h2>
                                    <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
                                        {job.department}
                                    </span>
                                </div>

                                {/* Card Middle: Meta details & Description */}
                                <div className="flex-grow">
                                    <div className="flex items-center text-sm text-gray-500 mb-4 space-x-4">
                                        <span className="flex items-center">
                                            📍 {job.location}
                                        </span>
                                        <span className="flex items-center">
                                            💰 {job.salary_range}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 mb-6 line-clamp-3">
                                        {job.description}
                                    </p>
                                </div>

                                {/* Card Bottom: Apply Button */}
                                <button 
                                    onClick={() => handleApply(job.id, job.title)}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200"
                                >
                                    Apply Now
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}