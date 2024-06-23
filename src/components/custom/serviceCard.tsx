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
import servicesdata from "../../db/servicesdata.json"

interface IService {
  image: string;
  acType: string;
  serviceType: string;
  price: string;
  desc?: string[];
}

const ServiceCard = () => {
  const [data, setData] = useState<IService[]>(servicesdata);

  if(!data){
    return <div className="w-full h-60 flex justify-center items-center">
      <Loading label="Loading..."/>
    </div>
  }

  return (
    <div className="w-full">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 justify-center items-center p-0 w-full md:w-1/2 md:m-auto">
        {data &&
          data.map((element: IService, index: any) => (
            <Card
              key={index}
              className="flex sm:col-span-2 md:col-span-1 lg:col-span-1 md:h-full"
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
                      <Button variant={"default"} className="h-8 w-full" asChild>
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
