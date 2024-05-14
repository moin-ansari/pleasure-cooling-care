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
  desc?: string[];
}

const ServiceCard = () => {
  const [data, setData] = useState<IService[]>([
    {
      image: "/ac_repair.jpg",
      acType: "Split / Window",
      serviceType: "AC Repair",
      price: "299",
      desc: [
        "Detailed issue diagnosis and spare parts cost will be calculated on same day",
        "Visit charges of ₹299 will be adjusted in the final bill"
      ]
    },
    {
      image: "/ac_repair.jpg",
      acType: "",
      serviceType: "Gas leak fix & refill",
      price: "2449",
      desc: [
        "Thorough diagnosis, leak identification & fixing, gas refill to avoid leakages",
      ]
    },
    {
      image: "/ac_repair.jpg",
      acType: "Split / Window",
      serviceType: "Anti-rust deep clean AC service",
      price: "649",
      desc: [
        "Prevents frequent gas leakages through a unique anti-rust spray"
      ]
    },
    {
      image: "/ac_repair.jpg",
      acType: "Split / Window",
      serviceType: "AC Service Lite",
      price: "399",
      desc: [
        "Basic cleaning with water jet technology"
      ]
    },
    {
      image: "/ac_repair.jpg",
      acType: "Split",
      serviceType: "AC Install",
      price: "1399",
      desc: [
        "Drilling, Wiring connections, installation of units & pipe fixes",
        "Cooling rate & device checks followed by cleanup of service area",
        "Gas check to prevent leakages"
      ]
    },
    {
      image: "/ac_repair.jpg",
      acType: "Split",
      serviceType: "AC Uninstall",
      price: "649",
      desc: [
        "Uninstallation of indoor & outdoor units",
        "AC packing, Cleanup of service area"
      ]
    },
    {
      image: "/ac_repair.jpg",
      acType: "Window",
      serviceType: "AC Install",
      price: "699",
      desc: [
        "Drilling, Wiring connections, installation of unit & pipe fixes",
        "Cooling rate & device checks followed by cleanup of service area",
        "Gas check to prevent leakages"
      ]
    },
    {
      image: "/ac_repair.jpg",
      acType: "Window",
      serviceType: "AC Uninstall",
      price: "399",
      desc: [
        "Uninstallation of unit",
        "AC packing, Cleanup of service area"
      ]
    }
  ]);

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
                    <CardTitle className="text-sm tracking-normal">
                      <span>{element.serviceType} </span>
                      { element.acType && <span className="text-xs">({element.acType})</span>}
                      {/* <span>{element.serviceType}</span> */}
                    </CardTitle>
                    <div className="leading-relaxed">
                      <div className="pb-3">
                        <span className="font-semibold text-sm tracking-normal">Price : </span>
                        <span className="text-sm text-green-500 font-semibold tracking-normal">₹ {element.price}</span>
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
