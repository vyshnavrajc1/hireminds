import Link from "next/link";

export default function Home(){
    return(
        <div className="min-h-screen flex flex-col justify-center items-center text-center">
            <h1 className="text-6xl text-white font-bold mb-6">
                Welcome To <span className="text-blue-600">Hireminds</span> 
            </h1>
            <p className="text-1xl max-w-3xl mb-4 p-1">
                The Agentic AI Hiring & Talent Evaluation Platform. We evaluate skills, not just resumes, ensuring ethical, explainable, and human-centered hiring.
            </p>
            <Link
            href="/login"
            className="text-1xl text-white bg-blue-600 p-2 font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
                Login portal
            </Link>
        </div>
    )
}