"use client";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RegisterSchema } from "@/schema/auth";
import { useState, useTransition } from "react";
import { RegisterAction } from "@/actions/auth";
import axios from 'axios';
import { useRouter } from "next/navigation";
import { AiOutlineReload } from "react-icons/ai";
import toast from 'react-hot-toast';

const Register = () => {

  const [btnLoading, setBtnLoading] = useState(false)
  const router = useRouter()

  const form = useForm<z.infer<typeof RegisterSchema>>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      username: "",
      email: "",
      password: ""
    },
  });

  const onSubmit = async (values: z.infer<typeof RegisterSchema>) => {
    setBtnLoading(true)
    try {
      let res = await axios.post("/api/users/signup", values)
      if(res.data.status === "success"){
        router.push("/login")
      }else if(res.data.status === "failed"){
        setBtnLoading(false)
        toast.error(res.data.message)
      }
    } catch(error: any){
      setBtnLoading(false)
      toast.error(error.message)
    }
  };

  return (
    <div className="w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
      <div className="hidden bg-muted lg:block">
        <Image
          src="/pexels-ovan-57690.jpg"
          alt="Image"
          width="1920"
          height="1080"
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Register</h1>
            <p className="text-balance text-muted-foreground">
              Enter your email below to register to your account
            </p>
          </div>
          <div className="grid gap-4">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid gap-2">
                  <FormField control={form.control} name="username" render={({field})=>(
                        <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                                <Input 
                                {...field}
                                    placeholder="abcd"
                                    type="text" 
                                />
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}/>
                </div>
                <div className="grid gap-2">
                  <FormField control={form.control} name="email" render={({field})=>(
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input 
                                {...field}
                                    placeholder="abcd@gmail.com"
                                    type="email" 
                                />
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}/>
                </div>
                <div className="grid gap-2">
                  <FormField control={form.control} name="password" render={({field})=>(
                      <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                              <Input 
                              {...field}
                                  placeholder="******"
                                  type="password" 
                              />
                          </FormControl>
                          <FormMessage/>
                      </FormItem>
                  )}/>
                </div>
                <Button type="submit" className="w-full" disabled={btnLoading}>
                  {btnLoading ? (
                    <>
                      <AiOutlineReload className="mr-2 h-4 w-4 animate-spin" />
                      "Please wait"{" "}
                    </>
                  ) : (
                    "Register"
                  )}
                </Button>
                <Button variant="outline" className="w-full">
                  Register with Google
                </Button>
              </form>
            </Form>
          </div>
          <div className="mt-4 text-center text-sm">
            already have an account?{" "}
            <Link href="/login" className="underline">
              Login Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
