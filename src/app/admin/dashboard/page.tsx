"use client";
import React, { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Bookings from "@/components/custom/admin/bookings";
import toast from "react-hot-toast";

const Dashboard = () => {
  const [bookingsCount, setBookingsCount] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [cancelledCount, setCancelledCount] = useState<number>(0);

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
      <Tabs defaultValue="Bookings" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="Bookings">
            Bookings 
            <span className="text-yellow-400 font-extrabold">
              ({bookingsCount})
            </span>
          </TabsTrigger>
          <TabsTrigger value="Completed">
            Completed 
            <span className="text-green-400 font-extrabold">
              ({completedCount})
            </span>
          </TabsTrigger>
          <TabsTrigger value="Cancelled">
            Cancelled 
            <span className="text-gray-400 font-extrabold">
              ({cancelledCount})
            </span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="Bookings">
          <Bookings params="pending" />
        </TabsContent>
        <TabsContent value="Completed">
          <Bookings params="completed" />
        </TabsContent>
        <TabsContent value="Cancelled">
          <Bookings params="cancelled" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
