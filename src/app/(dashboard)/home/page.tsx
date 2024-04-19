"use client";
import Image from "next/image";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import Experiences from "./../../../components/custom/experiences";
import Services from "@/components/custom/services";
import Footer from "@/components/custom/footer";
import BookingForm from "@/components/custom/bookingForm";
import Link from "next/link";
import Contact from "@/components/custom/contact";

// Define interface for AC technician
interface Technician {
  name: string;
  image: string;
  experience: Experience[];
  services: string[];
  summery: string;
}

// Define component props
interface LandingPageProps {
  technician: Technician;
}

interface Experience {
  logo: string;
  company: string;
  years: string;
  work: object;
  image: string;
}

const Home = () => {
  // State for form fields
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    address: "",
    date: "",
    preferredTime: "",
  });

  const technician: Technician = {
    name: "Hi, I'm Moin",
    image: "/moin.png",
    summery: `An highly skilled AC Technician with over 5 years of experience in the
    installation, repair, and maintenance of AC systems. I will troubleshoot and diagnosis of AC problems, responding to emergency repair requests.`,
    experience: [
      {
        logo: "/logo",
        company: "Urbun Company",
        years: "3",
        work: {
          description:
            "Install and repair air conditioning systems, Perform routine maintenance on AC equipment.",
          complaints: "150",
          ratings: [1, 1, 1, 1, 1],
        },
        image: "/ac3.jpg",
      },
      {
        logo: "/logo",
        company: "Voltas Service Center",
        years: "2",
        work: {
          description:
            "Install and repair air conditioning systems, Perform routine maintenance on AC equipment.",
          complaints: "100",
          ratings: [1, 1, 1, 1, 0.5],
        },
        image: "/ac2.jpg",
      },
    ],
    services: [
      "AC Repair.",
      "AC Gas Filling.",
      "AC Installation.",
      "AC Cooling Issues.",
    ],
  };

  // Function to handle form submission
  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Here you can implement form submission logic
    console.log("Form submitted with data:", formData);
    // Placeholder for API call or other logic
  };

  // Function to handle form field changes
  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  return (
    <div>
      <div className="flex justify-between p-3">
        <div className="w-3/5">
          <h1 className="text-2xl font-bold mb-2">{technician.name}</h1>
          <div className="text-primary text-[13px] text-justify pr-2 font-medium">
            {technician.summery}
          </div>
        </div>
        <div className="max-w-sm rounded overflow-hidden shadow-lg flex">
          <Image
            width={136}
            height={100}
            src={technician.image}
            alt={technician.name}
          />
        </div>
      </div>
      <div className="flex p-3 justify-between">
        <Button variant={"outline"}><Link href="#contact">Contact Me</Link></Button>
        <Button variant={"default"} asChild>
          <Link href="#bookingForm">Book a Service Now</Link>
        </Button>
      </div>
      {/* services */}
      <Services id="services" services={technician.services} />
      {/* Experience */}
      <Experiences id="experiences" experience={technician.experience} />
      <BookingForm />
      <Contact/>
      <Footer />
    </div>
  );
};

export default Home;
