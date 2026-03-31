"use client";

import React, { useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { getAuthHeadersMultipart, getUserId } from "@/lib/auth";

export default function ApplyPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const jobId = params?.id as string;
    const jobTitle = searchParams?.get("jobTitle") || "this position";

    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        phone_number: "",
        github_url: ""
    });
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (!file.name.toLowerCase().endsWith(".pdf")) {
                setError("Please upload a valid PDF file.");
                setResumeFile(null);
                return;
            }
            setError(null);
            setResumeFile(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!resumeFile) {
            setError("Please upload your resume.");
            return;
        }

        setLoading(true);

        const submitData = new FormData();
        submitData.append("full_name", formData.full_name);
        submitData.append("email", formData.email);
        submitData.append("phone_number", formData.phone_number);
        if (formData.github_url && formData.github_url.trim() !== "") {
            submitData.append("github_url", formData.github_url);
        }
        submitData.append("status", "pending");
        submitData.append("job_id", jobId);
        
        const candidateId = (getUserId() ?? 2).toString();
        submitData.append("candidate_id", candidateId);
        submitData.append("resume", resumeFile);

        try {
            const response = await fetch("http://127.0.0.1:8000/api/applications/", {
                method: "POST",
                headers: getAuthHeadersMultipart(),
                body: submitData,
            });

            if (response.ok) {
                setSuccess(true);
            } else {
                const errorData = await response.json().catch(() => ({}));
                setError(errorData.detail || "Failed to submit application. Please try again.");
            }
        } catch (err) {
            console.error("Error submitting application:", err);
            setError("A network error occurred while submitting your application.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 py-20 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
                <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-10 text-center transform transition-all">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                        <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Application Submitted!</h2>
                    <p className="text-lg text-gray-600 mb-8">
                        Thank you for applying to the <span className="font-semibold">{jobTitle}</span> position. Our AI system is currently reviewing your resume!
                    </p>
                    <button
                        onClick={() => router.push("/candidate/portal")}
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 w-full md:w-auto transition-colors"
                    >
                        Return to Job Portal
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Header Context */}
                <div className="bg-white rounded-t-xl shadow-sm border border-gray-200 border-b-0 p-8 text-center bg-gradient-to-br from-blue-50 to-white">
                    <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-2">You are applying for</p>
                    <h1 className="text-3xl font-extrabold text-gray-900">{jobTitle}</h1>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-b-xl shadow-md border border-gray-200 p-8 sm:p-10">
                    {error && (
                        <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Name Input */}
                        <div>
                            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">Full Name</label>
                            <div className="mt-1">
                                <input
                                    type="text"
                                    name="full_name"
                                    id="full_name"
                                    required
                                    value={formData.full_name}
                                    onChange={handleInputChange}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>

                        {/* Email & Phone Input */}
                        <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                                <div className="mt-1">
                                    <input
                                        type="email"
                                        name="email"
                                        id="email"
                                        required
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                                        placeholder="john@example.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">Phone Number</label>
                                <div className="mt-1">
                                    <input
                                        type="tel"
                                        name="phone_number"
                                        id="phone_number"
                                        required
                                        value={formData.phone_number}
                                        onChange={handleInputChange}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                                        placeholder="(555) 123-4567"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Links */}
                        <div>
                            <label htmlFor="github_url" className="block text-sm font-medium text-gray-700">GitHub Profile <span className="text-gray-400 font-normal">(Optional)</span></label>
                            <div className="mt-1">
                                <input
                                    type="url"
                                    name="github_url"
                                    id="github_url"
                                    value={formData.github_url}
                                    onChange={handleInputChange}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                                    placeholder="https://github.com/johndoe"
                                />
                            </div>
                        </div>

                        {/* File Upload */}
                        <div className="pt-4 border-t border-gray-200">
                            <label htmlFor="resume" className="block text-sm font-medium text-gray-700 mb-2">
                                Upload Resume
                            </label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="space-y-1 text-center">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <div className="flex text-sm text-gray-600 justify-center">
                                        <label htmlFor="resume" className="relative cursor-pointer bg-white rounded-md p-1 font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 shadow-sm border border-gray-200">
                                            <span>Select a file</span>
                                            <input id="resume" name="resume" type="file" className="sr-only" accept=".pdf" onChange={handleFileChange} />
                                        </label>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">PDF only up to 10MB</p>
                                    {resumeFile && (
                                        <p className="text-sm font-semibold text-green-600 mt-2 flex items-center justify-center">
                                            <span>Selected: {resumeFile.name}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-6 flex items-center justify-end space-x-4 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={() => router.push("/candidate/portal")}
                                disabled={loading}
                                className="bg-white hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-6 border border-gray-300 rounded-lg shadow-sm transition-colors duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="relative bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-8 rounded-lg shadow-sm transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center min-w-[160px] justify-center"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Evaluating AI Match...
                                    </>
                                ) : (
                                    "Submit Application"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
