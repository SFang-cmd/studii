import NavBar from "@/components/shared/navbar";
import HomeButton from "@/components/home-button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Main Heading */}
        <h1 className="text-8xl md:text-8xl font-bold mb-4" style={{ color: '#495867' }}>
          Studii
        </h1>
        
        {/* Subtitle */}
        <p className="text-xl md:text-2xl mb-6 max-w-2xl font-bold" style={{ color: '#577399' }}>
          Your ultimate no BS SAT tool
        </p>
        
        {/* CTA Button */}
        <HomeButton />
      </main>
    </div>
  );
}
