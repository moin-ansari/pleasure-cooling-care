"use client"
import React, { useState, useEffect } from "react";
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
import Image from "next/image";
import axios from "axios";
import { useRouter } from 'next/navigation';
  
const Profile = () => {
    const [userData, setUserData] = useState({})
    const router = useRouter();

    useEffect(()=>{
        getUserDetails()
    }, [])

    const getUserDetails = async () => {
        let res = await axios.post("/api/users/profile")
        if(res.data.status == "success"){
          setUserData(res.data.data)
        }
    }

    const handleLogout = async () => {
        let res = await axios.post("/api/users/logout")
        if(res.data.status === "success"){
            router.push("/login")
        }
    }
  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="overflow-hidden rounded-full"
          >
            <Image
              src="/user.png"
              width={36}
              height={36}
              alt="Avatar"
              className="overflow-hidden rounded-full"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Hi, {userData?.username}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuItem>Support</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleLogout}>Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default Profile;
