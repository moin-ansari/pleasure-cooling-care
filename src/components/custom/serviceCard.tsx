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

interface IService {
  image: string;
  acType: string;
  serviceType: string;
  price: string;
}

const ServiceCard = () => {
  const [data, setData] = useState<IService[]>();

  useEffect(() => {
    setData([
      {
        image: "/ac_repair.jpg",
        acType: "Split AC",
        serviceType: "Installation",
        price: "1399",
      },
      {
        image: "/ac_repair.jpg",
        acType: "Split AC",
        serviceType: "Uninstalltion",
        price: "649",
      },
      {
        image: "/ac_repair.jpg",
        acType: "Window AC",
        serviceType: "Installation",
        price: "699",
      },
      {
        image: "/ac_repair.jpg",
        acType: "Window AC",
        serviceType: "Uninstallation",
        price: "699",
      },
      {
        image: "/ac_repair.jpg",
        acType: "Split AC",
        serviceType: "Foam jet service",
        price: "549",
      },
      {
        image: "/ac_repair.jpg",
        acType: "Split AC",
        serviceType: "Jet service",
        price: "499",
      },
      {
        image: "/ac_repair.jpg",
        acType: "Window AC",
        serviceType: "Foam jet service",
        price: "479",
      },
      {
        image: "/ac_repair.jpg",
        acType: "Split AC",
        serviceType: "Jet service",
        price: "429",
      },
      {
        image: "/ac_repair.jpg",
        acType: "Split AC/ Window AC",
        serviceType: "Gas filling",
        price: "2449",
      },
      {
        image: "/ac_repair.jpg",
        acType: "Split AC/ Window AC",
        serviceType: "Repair",
        price: "Depends on spair parts cost",
      },
    ]);
  }, []);

  return (
    <div className="w-full">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 justify-center items-center p-0 w-full">
        {data &&
          data.map((element: IService, index: any) => (
            <Card
              key={index}
              className="flex sm:col-span-2 md:col-span-1 lg:col-span-1 h-[163px]"
              x-chunk="dashboard-05-chunk-0"
            >
              <CardContent className="w-1/2">
                <div className="max-w-sm rounded overflow-hidden flex p-3 pr-0 h-full">
                  <Image
                    width={100}
                    height={100}
                    className="w-full rounded"
                    src={element.image}
                    alt="prototype"
                  />
                </div>
              </CardContent>
              <div className="w-1/2 flex flex-col justify-between">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm flex justify-between">
                    <span>{element.acType}</span>
                  </CardTitle>
                  <CardDescription className="max-w-lg text-balance leading-relaxed">
                    <div>
                      <span className="font-semibold">Service: </span>
                      <span>{element.serviceType}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Price: </span>
                      <span>₹ {element.price}</span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardFooter className="p-3 pt-0">
                  <Button variant={"outline"} className="h-8 w-full" asChild>
                    <Link href="#bookingForm">Book Request</Link>
                  </Button>
                </CardFooter>
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
};

export default ServiceCard;
