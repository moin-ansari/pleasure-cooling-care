"use client";
import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-hot-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AiOutlineReload } from "react-icons/ai";

const Bookings = (query: any) => {
  console.log(query);
  const [data, setData] = useState<any>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `/api/users/getBookings?bookings=${query.query}`,
          {
            method: "POST",
          }
        );
        const jsonData = await response.json();

        if (jsonData.status !== "success") {
          toast.error("Could not get data");
        }

        console.log(jsonData.data);

        setData([...jsonData.data]);
        console.log(data);
      } catch (error: any) {
        toast.error("Error fetching data:", error);
      }
    };

    fetchData();
    console.log(data);
  }, []);

  if (!data.length) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center">
        <AiOutlineReload className="mr-2 h-4 w-4 animate-spin" />
        Please wait
      </div>
    );
  }

  return (
    <Card x-chunk="dashboard-05-chunk-3">
      {/* <CardHeader className="px-7">
        <CardTitle>Orders</CardTitle>
        <CardDescription>Recent orders from your store.</CardDescription>
      </CardHeader> */}
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="p-2">Customer</TableHead>
              <TableHead className="p-2">Type</TableHead>
              <TableHead className="p-2">Service</TableHead>
              <TableHead className="p-2">Date</TableHead>
              <TableHead className="p-2 text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data &&
              data.map((elem: any) => (
                <TableRow className="bg-accent p-2">
                  <TableCell className="p-2">
                    <div className="font-medium">{elem.name}</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      {elem.email}
                    </div>
                  </TableCell>
                  <TableCell className="p-2">{elem.acType}</TableCell>
                  <TableCell className="p-2">{elem.serviceType}</TableCell>
                  <TableCell className="p-2">2023-06-23</TableCell>
                  <TableCell className="p-2 text-right">$250.00</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default Bookings;
