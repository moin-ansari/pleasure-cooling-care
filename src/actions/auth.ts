"use server";
import * as z from "zod";
import { LoginSchema, RegisterSchema } from '@/schema/auth';
import axios from "axios";

export const LoginAction = (values: z.infer<typeof LoginSchema>) => {
    // Validate the input values against the schema
    const validatedFields = LoginSchema.safeParse(values);

    // If validation fails, return an error
    if (!validatedFields.success) {
        return false;
    }

    return true;

};

export const RegisterAction = (values: z.infer<typeof RegisterSchema>) => {
    // Validate the input values against the schema
    const validatedFields = RegisterSchema.safeParse(values);

    // If validation fails, return an error
    if (!validatedFields.success) {
        return false;
    }

    return true
};

export const GetUser = () => {
    return "user";
}
