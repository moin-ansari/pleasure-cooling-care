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
import { useState } from "react";
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
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import servicesdata from "../../db/servicesdata.json"
import { MdCheckCircleOutline  } from "react-icons/md";

const serviceTime = [
  "10:00 AM",
  "12:00 PM",
  "02:00 PM",
  "04:00 PM",
  "06:00 PM",
];
interface IServiceType {
  name: string;
  value: string;
  price?: any
}

const serviceTypes: IServiceType[] = [
  {
    name: "AC Repair",
    value: "AC Repair",
    price: {
      "split": 299,
      "window": 299
    }
  },
  {
    name: "Gas leak fix & refill",
    value: "Gas leak fix & refill",
    price: {
      "split": 2449,
      "window": 2449
    }
  },
  {
    name: "Anti-rust deep clean AC service",
    value: "Anti-rust deep clean AC service",
    price: {
      "split": 649,
      "window": 649
    }
  },
  {
    name: "AC Service Lite",
    value: "AC Service Lite",
    price: {
      "split": 399,
      "window": 399
    }
  },
  {
    name: "AC Install",
    value: "AC Install",
    price: {
      "split": 1399,
      "window": 699
    }
  },
  {
    name: "AC Uninstall",
    value: "AC Uninstall",
    price: {
      "split": 649,
      "window": 399
    }
  },
];

const city: string[] = ["Bareilly"];

const state: string[] = ["Uttar Pradesh"];

const country: string[] = ["India"]

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  mobile: z
    .string()
    .min(10, {
      message: "Mobile Number must be at least 10 characters.",
    })
    .max(10),
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
    required_error: "Please pick correct time",
  }),
  streetAddress: z.string().min(5, {
    message: "Please type a correct street Address",
  }),
  city: z.string({
    required_error: "Please type a correct city",
  }),
  state: z.string({
    required_error: "Please type a correct state",
  }),
  zipcode: z.string().min(6, {
    message: "Please type a correct pincode",
  }),
  country: z.string({
    required_error: "Please type a correct zipcode",
  }),
});

export default function BookingForm() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      mobile: "",
      serviceType: "AC Repair",
      acType: "window",
      time: "10:00 AM",
      date: new Date(),
      streetAddress: "",
      city: "Bareilly",
      state: "Uttar Pradesh",
      zipcode: "",
      country: "India",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const price = getPrice(values.acType, values.serviceType);
    if (values) {
      setFormData({...values, price: price});
      setOpen(true);
    }
  }

  const bookRequest = async () => {
    let res = await fetch("/api/users/bookRequest", {
      method: "POST",
      body: JSON.stringify(formData),
    });
    let data = await res.json();
    if (data.status === "success") {
      toast.success(data.message);
      form.reset();
      setBookingSuccess(true)
    } else if (data.status === "error") {
      toast.error(data.message);
      setOpen(false);
    }
  };

  function getPrice(acType:string, serviceType:string) {
    for (const service of serviceTypes) {
        if (service.name === serviceType) {
          return service?.price[acType]
        }
    }
    return 0;
  }

  const getUserLocation = () => {
    if ("geolocation" in navigator) {
      // Retrieve latitude & longitude coordinates from `navigator.geolocation` Web API
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        const { latitude, longitude } = coords;
        console.log(latitude, longitude);
        // setLocation({ latitude, longitude });
      });
    }
  };

  return (
    <div id="bookingForm">
      <div className="px-3 py-6 pt-20 text-white bg-blue-800">
        <div className="text-lg font-semibold sm:w-1/2 sm:m-auto">
          Fill out form to book service now
        </div>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-2 sm:w-1/2 sm:m-auto"
          >
            <div className="flex items-center gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="w-1/2">
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        className="text-primary"
                        placeholder=""
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem className="w-1/2">
                    <FormLabel>Mobile Number </FormLabel>
                    <FormControl>
                      <Input
                        className="text-primary"
                        placeholder=""
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {/* <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input className="text-primary" placeholder="" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          /> */}
            <FormField
              control={form.control}
              name="acType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AC Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value.length? field.value: 'Select AC type'}
                  >
                    <FormControl>
                      <SelectTrigger className="text-primary">
                        <SelectValue placeholder="Select AC type" />
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
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {serviceTypes.map((service, index) => {
                        return (
                          <SelectItem
                            key={index}
                            className="text-primary"
                            value={service.value}
                          >
                            {service.name}
                          </SelectItem>
                        );
                      })}
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
                  <FormItem className="w-1/2 mt-0">
                    <FormLabel>Date</FormLabel>
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
                              format(field.value, "dd/MM/yyyy")
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
                          disabled={(date: any) => date < new Date()}
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
                  <FormItem className="w-1/2 mt-0">
                    <FormLabel>Time</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="text-primary">
                          <SelectValue placeholder="select Time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {serviceTime.map((time, index) => {
                          return (
                            <SelectItem
                              key={index}
                              className="text-primary"
                              value={time}
                            >
                              {time}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="streetAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street/NearBy Location</FormLabel>
                  <FormControl>
                    <Input
                      className="text-primary"
                      placeholder="Fill in detail"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center gap-3">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem className="w-1/2 mt-0">
                    <FormLabel>City</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="text-primary">
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {city.map((city, index) => {
                          return (
                            <SelectItem
                              key={index}
                              className="text-primary"
                              value={city}
                            >
                              {city}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem className="w-1/2 mt-0">
                    <FormLabel>State</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="text-primary">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {state.map((state, index) => {
                          return (
                            <SelectItem
                              key={index}
                              className="text-primary"
                              value={state}
                            >
                              {state}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex items-center gap-3">
              <FormField
                control={form.control}
                name="zipcode"
                render={({ field }) => (
                  <FormItem className="w-1/2 mt-0">
                    <FormLabel>Zip/Postal Code</FormLabel>
                    <FormControl>
                      <Input
                        className="text-primary"
                        placeholder=""
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem className="w-1/2 mt-0">
                    <FormLabel>Country</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="text-primary">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {country.map((country, index) => {
                          return (
                            <SelectItem
                              key={index}
                              className="text-primary"
                              value={country}
                            >
                              {country}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-center pt-7">
              <Button className="px-10 " variant={"secondary"} type="submit">
                Submit
              </Button>
              <AlertDialog open={open}>
                {!bookingSuccess ? 
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      By Confirming your request will be booked, make sure you
                      are available on given time.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setOpen(false)}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={bookRequest}>
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>: 
                <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    <div className="flex flex-col items-center justify-center">
                      <MdCheckCircleOutline className="text-green-500 w-16 h-16"/>
                      <span>Booking Successfull!</span>
                    </div>
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    For booking tracking try contacting us. Our expert will react out to your home, Please be available on time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={() => setOpen(false)}>
                    Back to home
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
                }
              </AlertDialog>
            </div>
          </form>
        </Form>
        {/* <Button onClick={getUserLocation}>Get Location</Button> */}
      </div>
    </div>
  );
}
