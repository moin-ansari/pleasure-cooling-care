"use client";
import Image from "next/image";
import React, { useState } from "react";
import Experiences from "./../../../components/custom/experiences";
import Services from "@/components/custom/services";
import Footer from "@/components/custom/footer";
import BookingForm from "@/components/custom/bookingForm";
import Contact from "@/components/custom/contact";
import HeroSection from "@/components/custom/hero";
import me from "../../../db/me.data.json"
interface Technician {
  name: string;
  image: string;
  experience: Experience[];
  services: string[];
}
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
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    address: "",
    date: "",
    preferredTime: "",
  });

  const technician: Technician = me;

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

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
      {/* <div className="flex justify-between p-3">
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
      </div> */}
      <HeroSection/>
      {/* services */}
      <Services id="services"/>
      {/* Experience */}
      <Experiences id="experiences" experience={technician.experience} />
      <BookingForm />
      <Contact/>
      <Footer />
    </div>
  );
};

export default Home;
