"use client";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Separator } from "@/components/ui/separator"
import Loading from './loading';

interface IService {
  image: string;
  acType: string;
  serviceType: string;
  price: string;
  additionalCost?: string;
  desc?: string[];
}

const ServiceCard = () => {
  const [data, setData] = useState<IService[]>();

  useEffect(() => {
    setData([
      {
        image: "/ac_repair.jpg",
        acType: "Split AC",
        serviceType: "Install",
        price: "1399",
        desc: [
          "Detailed issue diagnosis with same day resolution",
          "Visit charges of ₹299 will be adjusted in the final bill"
        ]
      },
      {
        image: "/ac_repair.jpg",
        acType: "Split AC",
        serviceType: "Uninstall",
        price: "399",
        desc: [
          "Detailed issue diagnosis with same day resolution",
          "Visit charges of ₹299 will be adjusted in the final bill"
        ]
      },
      {
        image: "/ac_repair.jpg",
        acType: "Window AC",
        serviceType: "Install",
        price: "699",
        desc: [
          "Detailed issue diagnosis with same day resolution",
          "Visit charges of ₹299 will be adjusted in the final bill"
        ]
      },
      {
        image: "/ac_repair.jpg",
        acType: "Window AC",
        serviceType: "Uninstall",
        price: "699",
        desc: [
          "Detailed issue diagnosis with same day resolution",
          "Visit charges of ₹299 will be adjusted in the final bill"
        ]
      },
      {
        image: "/ac_repair.jpg",
        acType: "Split AC",
        serviceType: "Foam jet service",
        price: "549",
        desc: [
          "Detailed issue diagnosis with same day resolution",
          "Visit charges of ₹299 will be adjusted in the final bill"
        ]
      },
      {
        image: "/ac_repair.jpg",
        acType: "Split AC",
        serviceType: "Jet service",
        price: "499",
        desc: [
          "Detailed issue diagnosis with same day resolution",
          "Visit charges of ₹299 will be adjusted in the final bill"
        ]
      },
      {
        image: "/ac_repair.jpg",
        acType: "Window AC",
        serviceType: "Foam jet service",
        price: "479",
        desc: [
          "Detailed issue diagnosis with same day resolution",
          "Visit charges of ₹299 will be adjusted in the final bill"
        ]
      },
      {
        image: "/ac_repair.jpg",
        acType: "Split AC",
        serviceType: "Jet service",
        price: "429",
        desc: [
          "Detailed issue diagnosis with same day resolution",
          "Visit charges of ₹299 will be adjusted in the final bill"
        ]
      },
      {
        image: "/ac_repair.jpg",
        acType: "Split AC/ Window AC",
        serviceType: "Gas filling",
        price: "2449",
        desc: [
          "Detailed issue diagnosis with same day resolution",
          "Visit charges of ₹299 will be adjusted in the final bill"
        ]
      },
      {
        image: "/ac_repair.jpg",
        acType: "Split AC/ Window AC",
        serviceType: "Repair",
        price: "299",
        additionalCost: "spare parts cost",
        desc: [
          "Detailed issue diagnosis with same day resolution",
          "Visit charges of ₹299 will be adjusted in the final bill"
        ]
      },
    ]);
  }, []);

  if(!data){
    return <div className="w-full h-60 flex justify-center items-center">
      <Loading label="Loading..."/>
    </div>
  }

  return (
    <div className="w-full">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 justify-center items-center p-0 w-full">
        {data &&
          data.map((element: IService, index: any) => (
            <Card
              key={index}
              className="flex sm:col-span-2 md:col-span-1 lg:col-span-1"
              x-chunk="dashboard-05-chunk-0"
            >
              <CardContent className="w-full p-3">
                <div className="flex justify-between w-full">
                  <CardHeader className="p-0 pr-3 w-3/5">
                    <CardTitle className="text-sm flex justify-between">
                      <span>{element.serviceType} ({element.acType})</span>
                      {/* <span>{element.serviceType}</span> */}
                    </CardTitle>
                    <div className="leading-relaxed">
                      <div className="pb-3">
                        <span className="font-semibold">Starts at </span>
                        <span className="text-green-500 font-semibold">₹ {element.price}</span>
                      </div>
                      <Separator />
                      <ul className="list-disc p-3 pr-0 text-[10px] italic">
                        { element?.desc && element.desc.map((el, index)=>{
                          return (<li key={index}>{el}</li>)
                        })}
                      </ul>
                    </div>
                  </CardHeader>
                  <div className="w-2/5 rounded overflow-hidden flex flex-col h-full">
                    <Image
                      width={100}
                      height={100}
                      className="w-full rounded"
                      src={element.image}
                      alt="prototype"
                    />
                    <div className="py-3">
                      <Button variant={"outline"} className="h-8 w-full" asChild>
                        <Link href="#bookingForm">Book Request</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
};

export default ServiceCard;
