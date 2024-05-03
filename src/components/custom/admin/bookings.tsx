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
import { useRouter } from 'next/navigation';

const Bookings = ({params}: any) => {
  const [data, setData] = useState<any>([]);
  const router = useRouter()
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `/api/users/getBookings?bookings=${params}`,
          {
            method: "POST",
          }
        );
        const jsonData = await response.json();

        if (jsonData.status !== "success") {
          toast.error("Could not get data");
        }
        setData([...jsonData.data]);

      } catch (error: any) {
        toast.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [params]);

  if (!data.length) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center">
        <AiOutlineReload className="mr-2 h-4 w-4 animate-spin" />
        Please wait
      </div>
    );
  }

  const handleRowClick = (id: any) => {
    if(id) router.push(`/admin/bookings/${id}`)
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
            <TableRow className="bg-accent">
              <TableHead className="p-2">Customer</TableHead>
              <TableHead className="p-2">AC</TableHead>
              <TableHead className="p-2">Service</TableHead>
              <TableHead className="p-2">Schedule Date</TableHead>
              <TableHead className="p-2">Request Date</TableHead>
              <TableHead className="p-2">Time</TableHead>
              <TableHead className="p-2 text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data &&
              data.map((elem: any, index: any) => (
                <TableRow className="p-2" key={index} onClick={()=>handleRowClick(elem._id)}>
                  <TableCell className="p-2">
                    <div className="font-medium">{elem.name}</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      {elem.email}
                    </div>
                  </TableCell>
                  <TableCell className="p-2">{elem.acType}</TableCell>
                  <TableCell className="p-2">{elem.serviceType}</TableCell>
                  <TableCell className="p-2">2023-06-23</TableCell>
                  <TableCell className="p-2">2023-06-20</TableCell>
                  <TableCell className="p-2">{elem.time}</TableCell>
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
