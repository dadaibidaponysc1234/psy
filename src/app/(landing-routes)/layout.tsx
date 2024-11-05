import Footer from "@/components/footer";
import NavBar from "@/components/nav";
import { ReactNode } from "react";

const LandingLayout = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <NavBar />
      <div className="flex flex-col min-h-dvh flex-grow">{children}</div>
      <Footer />
    </>
  );
};

export default LandingLayout;
