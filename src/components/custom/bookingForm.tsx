"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import toast from "react-hot-toast";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  mobile: z.string().min(10, {
    message: "Mobile Number must be at least 10 characters.",
  }),
  email: z
    .string({
      required_error: "Please type a valid email.",
    }).email(),
  serviceType: z.string({
    required_error: "Please select a valid service.",
  }),
  acType: z.string({
    required_error: "Please select a AC Type.",
  }),
  address: z.string().min(10, {
    message: "Please type a correct Address",
  }),
});

export default function BookingForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      mobile: "",
      email: "",
      serviceType: "",
      acType: "",
      address: ""
    },
  });

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    let res = await fetch('/api/users/bookRequest', {
      method: "POST",
      body: JSON.stringify(values)
    })
    let data = await res.json();
    if(data.status === "success"){
      toast.success(data.message)
      console.log(data)
      form.reset()
    }else if(data.status === "error"){
      toast.error(data.message)
    }

  }

  const getUserLocation = () => {
    if('geolocation' in navigator) {
      // Retrieve latitude & longitude coordinates from `navigator.geolocation` Web API
      navigator.geolocation.getCurrentPosition(({ coords }) => {
          const { latitude, longitude } = coords;
          console.log(latitude, longitude)
          // setLocation({ latitude, longitude });
      })
    }
  }

  return (
    <div id="bookingForm" >
    <div className="px-3 py-6 text-white bg-primary">
      <div className="text-lg font-semibold">
        Fill out form to book service now
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input className="text-primary" placeholder="" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mobile"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile Number: </FormLabel>
                <FormControl>
                  <Input className="text-primary" placeholder="" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email:</FormLabel>
                <FormControl>
                  <Input className="text-primary" placeholder="" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="serviceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="text-primary">
                      <SelectValue placeholder="Please select a service" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem className="text-primary" value="installation">
                      AC Installation
                    </SelectItem>
                    <SelectItem className="text-primary" value="repair">
                      AC Repair
                    </SelectItem>
                    <SelectItem className="text-primary" value="gasfilling">
                      AC GAS Filling
                    </SelectItem>
                    <SelectItem className="text-primary" value="coolingissue">
                      AC Cooling Issue
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="serviceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>AC Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="text-primary">
                      <SelectValue placeholder="Please select AC type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem className="text-primary" value="window ac">
                      Window AC
                    </SelectItem>
                    <SelectItem className="text-primary" value="split ac">
                      Split AC
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address (Google Map Location) </FormLabel>
                <FormControl>
                  <Input
                    className="text-primary"
                    placeholder="Please share google map location"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-center">
            <Button className="px-10 " variant={"secondary"} type="submit">
              Submit
            </Button>
          </div>
        </form>
      </Form>
      {/* <Button onClick={getUserLocation}>Get Location</Button> */}
    </div>
    </div>
  );
}
