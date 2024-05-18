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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { Separator } from "@/components/ui/separator";
import { MdOutlineCancel } from "react-icons/md";
import { FaRegCheckCircle } from "react-icons/fa";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import Loading from "@/components/custom/loading";
import { format } from "date-fns";
import CopyButton from "@/components/custom/copy";
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
  city: string;
  zipcode: string;
  state: string;
  country: string;
  requestedDate: Date;
  date: Date;
  __v: number;
}

export default function Page({ params }: { params: { id: string } }) {
  const [data, setData] = useState<IBooking>();
  const [open, setOpen] = useState(false);
  const [operation, setOperation] = useState<string>("");
  const [value, setValue] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/users/getBookings/${params.id}`, {
          method: "POST",
        });
        const jsonData = await response.json();

        if (jsonData.status !== "success") {
          toast.error("Error fetching data");
        } else {
          setData(jsonData.data);
        }
      } catch (error: any) {
        toast.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  if (!data) {
    return (
      <div className="w-ful h-[400px] flex items-center justify-center">
        <Loading label="Please Wait..." />
      </div>
    );
  }

  const handleAction = async (type: string) => {
    try {
      const response = await fetch(
        `/api/users/updateBooking/${params.id}?params=${type},${value}`,
        {
          method: "PUT",
        }
      );
      const jsonData = await response.json();

      if (jsonData.status !== "success") {
        toast.error(jsonData.message);
      } else {
        setData(jsonData.data);
        setOpen(false);
        setValue("");
      }
    } catch (error: any) {
      toast.error("Error update data:", error);
      setOpen(false);
      setValue("");
    }
  };

  return (
    <div className="p-3">
      <Card className="overflow-hidden" x-chunk="dashboard-05-chunk-4">
        <CardHeader className="flex flex-row items-start bg-muted/50">
          <div className="grid gap-0.5">
            <CardTitle className="group flex items-center gap-2 text-lg">
              Order {params.id}
            </CardTitle>
            <div className="flex flex-col">
              <div className="flex">
                <span className="text-lg">
                  Order Date: {format(data.requestedDate, "iii, dd/MM/yyyy")}
                </span>
              </div>
              <div className="flex">
                <span className="text-lg pr-4">Order Status: </span>
                <Badge
                  className={
                    data.status == "pending"
                      ? "bg-yellow-500"
                      : data.status == "completed"
                      ? "bg-green-500"
                      : "bg-red-500"
                  }
                >
                  {data.status}
                </Badge>
              </div>
              <div className="flex">
                <span className="text-lg">
                  Delivery Date: {format(data.date, "iii, dd/MM/yyyy")}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 text-sm">
          <div>
            <div className="font-semibold">Address Information</div>
            <div className="flex justify-between text-muted-foreground">
              <span className="w-1/2">
                {data.streetAddress} {data.city} {data.state} {data.country}{" "}
                {data.zipcode}
              </span>
              <CopyButton
                className="w-1/2"
                textToCopy={`${data.streetAddress} ${data.city} ${data.state} ${data.country} ${data.zipcode}`}
              />
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
          <Button
            disabled={data.status == "cancelled" || data.status == "completed"}
            onClick={() => {
              setOperation("cancel");
              setOpen(true);
            }}
            variant={"outline"}
            className="text-red-600 flex items-center"
          >
            <span>
              <MdOutlineCancel className="mr-1" />
            </span>{" "}
            <span>Cancel</span>
          </Button>
          <div className="flex justify-center pt-7">
            <AlertDialog open={open}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <InputOTP
                    maxLength={6}
                    value={value}
                    onChange={(value) => setValue(value)}
                    className="m-auto"
                    pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                  <div className="text-center text-sm">
                    {value === "" ? (
                      <>Enter your one-time password.</>
                    ) : (
                      <>You entered: {value}</>
                    )}
                  </div>
                  <AlertDialogDescription>
                    By Confirming your request will be {operation}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setOpen(false)}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleAction(operation)}>
                    Confirm
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <Button
            disabled={data.status == "cancelled" || data.status == "completed"}
            onClick={() => {
              setOperation("complete");
              setOpen(true);
            }}
            variant={"default"}
            className="bg-green-600 flex items-center"
          >
            <span>
              <FaRegCheckCircle className="mr-1" />
            </span>{" "}
            <span>Mark Complete</span>
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
