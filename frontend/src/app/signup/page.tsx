"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { link } from "fs";
import { json } from "stream/consumers";

export default function LoginPage(){
  const router = useRouter()
  const [role,setRole] = useState<"candidate" | "hr">("candidate")
  const [fullName, setFullName] = useState("")
  const [email,setEmail] = useState("")
  const [password,setPassword] = useState("") 

  const handleSignup = async (e: React.FormEvent)=>{
    e.preventDefault();
    const response = await fetch("http://127.0.0.1:8000/api/auth/signup",{
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body : JSON.stringify({"role": role, "name": fullName, "email": email, "password": password})
    })
    if(response.ok){
      if(role == "hr")
        router.push("/dashboard")
      else
        router.push("/candidate/portal")
    }else{
      console.log(response)
    }
  }
  return(
    <div className="min-h-screen bg-gray-50 flex  items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg p-1">

          <h1 className="text-blue-900 font-bold text-3xl mb-2 mt-2 text-center">
            Hireminds
          </h1>

          <div
          className="flex bg-gray-100 p-1 rounded-lg mb-6"
          >
            <button
          onClick={()=> setRole("candidate")}
          className={`flex-1 py-1 text-sm font-medium rounded-md ${
            role == "candidate"?
            "bg-white text-blue-700":"text-gray-500 hover:text-gray-700"
          }`}
          >
            Candidate
          </button>
          <button
          onClick={()=> setRole("hr")}
          className={`flex-1 py-1 text-sm font-medium rounded-md ${
            role == "hr"?
            "bg-white text-blue-700":"text-gray-500 hover:text-gray-700"
          }`}
          >
            HR
          </button>
          </div>

          <form onSubmit={handleSignup} className=" pl-6 pr-6">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input type="text"
                required
                value={fullName}
                onChange={(e)=>setFullName(e.target.value)}
                className="w-full px-4 py-2 text-gray-700 border border-gray-300 mb-2"
                placeholder="name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input type="email"
                required
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
                className="w-full px-4 py-2 text-gray-700 border border-gray-300 mb-2"
                placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input type="password"
                required
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                className="w-full px-4 py-2 text-gray-700 border border-gray-300 mb-3"
                placeholder="password"
                />
              </div>

              

              <button 
              type="submit"
              className="w-full text-white text-md font-bold bg-blue-500  px-2 py-2 rounded-sm hover:bg-blue-700 " 
              >
                Signup as {role === "hr" ? "HR" : "Candidate"}
              </button>
          </form>

          <div className=" px-6 py-4 text-center text-gray-600 ">
            <p>
              Already have an account? <Link
              href="/login"
              className="text-blue-600"
              >
              Login
              </Link>
            </p>
          </div>
        </div>
    </div>
  );
}