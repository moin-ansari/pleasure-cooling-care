"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MdArrowBackIos } from "react-icons/md";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Separator } from "@/components/ui/separator";
import { MdOutlineCancel } from "react-icons/md";
import { FaRegCheckCircle } from "react-icons/fa";
import { useState, useEffect } from "react";
import { toast } from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import Loading from "@/components/custom/loading";

interface IBooking {
    _id: string;
    name: string;
    mobile: string;
    email: string;
    serviceType: string;
    acType: string;
    address: string;
    status: string;
    price?: string;
    streetAddress: string;
    city: string,
    zipcode: string;
    state: string;
    country: string;
    "__v": number
}
  

export default function Page({ params }: { params: { id: string } }) {
  const [data, setData] = useState<IBooking>();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `/api/users/getBookings/${params.id}`,
          {
            method: "POST",
          }
        );
        const jsonData = await response.json();

        if (jsonData.status !== "success") {
          toast.error("Error fetching data");
        }
        else{
            setData(jsonData.data)
        }

      } catch (error: any) {
        toast.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  if (!data) {
    return <div className="w-ful h-[400px] flex items-center justify-center">
        <Loading label="Please Wait..."/>
    </div>;
  }

  const handleAction = async (  type: "cancel" | "complete" ) => {
    try {
        const response = await fetch(
          `/api/users/updateBooking/${params.id}?action=${type}`,
          {
            method: "PUT",
          }
        );
        const jsonData = await response.json();

        if (jsonData.status !== "success") {
          toast.error("Error while updating data");
        }
        else{
            setData(jsonData.data)
        }

      } catch (error: any) {
        toast.error("Error fetching data:", error);
      }
  }

  return (
    <div className="p-3">
      <Card className="overflow-hidden" x-chunk="dashboard-05-chunk-4">
        <CardHeader className="flex flex-row items-start bg-muted/50">
          <div className="grid gap-0.5">
            <CardTitle className="group flex items-center gap-2 text-lg">
              Order {params.id}
            </CardTitle>
            <CardDescription className="flex justify-between items-center">
                <span>Date: November 23, 2023</span>
                <Badge className={data.status == 'pending'? "bg-yellow-500": data.status == 'completed' ? "bg-green-500": "bg-red-500"}>{data.status}</Badge>
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-3">
              <div className="font-semibold">Address Information</div>
              <address className="grid gap-0.5 not-italic text-muted-foreground">
                <span>{data.streetAddress} {data.city} {data.state} {data.country} {data.zipcode}</span>
              </address>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="grid gap-3">
            <div className="font-semibold">Customer Information</div>
            <dl className="grid gap-3">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Customer</dt>
                <dd>{data.name}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Phone</dt>
                <dd>
                  <a href="tel:">+91 {data.mobile}</a>
                </dd>
              </div>
            </dl>
          </div>
          <Separator className="my-4" />
          <div className="grid gap-3">
            <div className="font-semibold">Order Details</div>
            <ul className="grid gap-3">
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">Service Type</span>
                <span>{data.serviceType}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">AC Type</span>
                <span>{data.acType}</span>
              </li>
            </ul>
            <Separator className="my-2" />
            <ul className="grid gap-3">
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>0.00</span>
              </li>
              <li className="flex items-center justify-between font-semibold">
                <span className="text-muted-foreground">Total</span>
                <span>$329.00</span>
              </li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-row items-center justify-between border-t bg-muted/50 px-6 py-3">
          <Button disabled={data.status == "cancelled" || data.status == "completed" } onClick={()=>handleAction("cancel")} variant={"outline"} className="text-red-600 flex items-center">
              <span>
                <MdOutlineCancel className="mr-1" />
              </span>{" "}
              <span>Cancel</span>
          </Button>
          <Button disabled={data.status == "cancelled" || data.status == "completed"}  onClick={()=>handleAction("complete")} variant={"default"} className="bg-green-600 flex items-center">
              <span>
                <FaRegCheckCircle className="mr-1" />
              </span>{" "}
              <span>Complete</span>
          </Button>
        </CardFooter>
      </Card>
      <div className="flex justify-center pt-3">
        <Button variant={"outline"}>
          <Link href="/admin/bookings" className="flex items-center">
            {" "}
            <span>
              <MdArrowBackIos />
            </span>{" "}
            <span>Back to Bookings</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
