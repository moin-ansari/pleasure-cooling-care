"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Activity,
  CreditCard,
  Users,
  IndianRupee,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button";
import Link from "next/link";

const Dashboard = () => {
  const [bookingsCount, setBookingsCount] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [cancelledCount, setCancelledCount] = useState<number>(0);
  const [priceCount, setPriceCount] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let count1 = await getOrdersCount("pending")
        setBookingsCount(count1);
        let count2 = await getOrdersCount("completed")
        setCompletedCount(count2);
        let count3 = await getOrdersCount("cancelled")
        setCancelledCount(count3);
      } catch (error: any) {
        toast.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  const getOrdersCount = async (query: string) => {
    const response = await fetch(`/api/users/bookingsCount?bookings=${query}`, {
      method: "POST",
    });
    const jsonData = await response.json();

    if (jsonData.status !== "success") {
      toast.error("Error fetching data");
    }
    return jsonData.count;
  };

  return (
    <div className="p-3 w-full">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          <Card x-chunk="dashboard-01-chunk-0" className={`${priceCount>0? 'bg-green-300': 'bg-amber-200'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm tracking-widest font-semibold">
                Total Revenue
              </CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-3 px-6">
              <div className="text-2xl font-bold">₹{priceCount}</div>
              <p className="text-xs text-muted-foreground">
                The revenue you have earned till now
              </p>
            </CardContent>
          </Card>
          <Card x-chunk="dashboard-01-chunk-1" className={`${bookingsCount+completedCount+cancelledCount>0? 'bg-green-300': 'bg-amber-200'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm tracking-widest font-semibold">
                Total Bookings
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-3 px-6 flex justify-between">
              <div>
                <div className="text-2xl font-bold">{bookingsCount+completedCount+cancelledCount}</div>
                  <p className="text-xs text-muted-foreground">
                    All the bookings you get till now
                  </p>
              </div>
                <div className="flex items-end">
                  <Button variant={'secondary'} asChild>
                    <Link href="/admin/bookings">Go to bookings <ChevronRight className="h-4 w-4" /></Link>
                  </Button>
                </div>
            </CardContent>
          </Card>
          <Card x-chunk="dashboard-01-chunk-2" className={`${completedCount>0? 'bg-green-300': 'bg-amber-200'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm tracking-widest font-semibold">Completed Bookings</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-3 px-6">
              <div className="text-2xl font-bold">{completedCount}</div>
              <p className="text-xs text-muted-foreground">
                Total bookings completed till now
              </p>
            </CardContent>
          </Card>
          <Card x-chunk="dashboard-01-chunk-3" className={`${bookingsCount>0? 'bg-green-300': 'bg-amber-200'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm tracking-widest font-semibold">Active Bookings</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-3 px-6">
              <div className="text-2xl font-bold">{bookingsCount}</div>
              <p className="text-xs text-muted-foreground">
                Total new bookings available
              </p>
            </CardContent>
          </Card>
        </div>
    </div>
  );
};

export default Dashboard;
