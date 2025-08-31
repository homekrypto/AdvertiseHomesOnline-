import UserRegistration from "@/components/UserRegistration";

export default function Register() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Join AdvertiseHomes.Online
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Create your account and start listing properties with our comprehensive real estate platform. 
            Choose from our tiered subscription plans designed for individual agents to large agencies.
          </p>
        </div>
        
        <UserRegistration />
        
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Already have an account?{" "}
            <a 
              href="/api/login" 
              className="text-blue-600 hover:text-blue-700 font-medium"
              data-testid="link-login"
            >
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}