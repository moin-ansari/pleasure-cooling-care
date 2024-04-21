"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { date, z } from "zod";

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
import toast from "react-hot-toast";
import { useState } from 'react';
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
} from "@/components/ui/alert-dialog"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
 
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"


const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  mobile: z.string().min(10, {
    message: "Mobile Number must be at least 10 characters.",
  }).max(10),
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
  date: z.date({
    required_error: "Please pick correct date",
  }),
  time: z.string({
    required_error: "Please pick correct time"
  }),
  address: z.string().min(10, {
    message: "Please type a correct Address",
  }),
});

export default function BookingForm() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({});

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      mobile: "",
      email: "",
      serviceType: "",
      acType: "",
      address: "",
      time: "",
      date: new Date()
    },
  });

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    if(values){
      setFormData(values)
      setOpen(true)
    }

  }

  const bookRequest = async () =>{
    let res = await fetch('/api/users/bookRequest', {
      method: "POST",
      body: JSON.stringify(formData)
    })
    let data = await res.json();
    if(data.status === "success"){
      toast.success(data.message)
      form.reset()
      setOpen(false)
    }else if(data.status === "error"){
      toast.error(data.message)
      setOpen(false)
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
    <div className="px-3 py-6 pt-20 text-white bg-primary">
      <div className="text-lg font-semibold">
        Fill out form to book service now
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
        <div className="flex items-center gap-3">
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
        </div>
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
              name="acType"
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
                      <SelectItem className="text-primary" value="window">
                        Window AC
                      </SelectItem>
                      <SelectItem className="text-primary" value="split">
                        Split AC
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          <div className="flex items-center gap-3">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="w-1/2">
                  <FormLabel>Select Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal text-primary",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date: any) =>
                          date < new Date()
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem className="w-1/2">
                    <FormLabel>Select Time</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="text-primary">
                          <SelectValue placeholder="Please select Time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem className="text-primary" value="10:00:00">
                          10:00 AM
                        </SelectItem>
                        <SelectItem className="text-primary" value="12:00:00">
                          12:00 PM
                        </SelectItem>
                        <SelectItem className="text-primary" value="02:00:00">
                          02:00 PM
                        </SelectItem>
                        <SelectItem className="text-primary" value="04:00:00">
                          04:00 PM
                        </SelectItem>
                        <SelectItem className="text-primary" value="06:00:00">
                          06:00 AM
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
          </div>
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
          <div className="flex justify-center pt-7">
            <Button className="px-10 " variant= {"secondary"} type="submit">
              Submit
            </Button>
            <AlertDialog open={open}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account
                    and remove your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={()=>setOpen(false)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={bookRequest}>
                      Continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

          </div>
        </form>
      </Form>
      {/* <Button onClick={getUserLocation}>Get Location</Button> */}
    </div>
    </div>
  );
}
