import mongoose, { Schema, Document } from "mongoose";

// Define custom type for status
type BookingStatus = "pending" | "completed" | "cancelled";

// Define interface for BookRequest document
interface IBookRequest extends Document {
  name: string;
  mobile: string;
  email: string;
  serviceType: string;
  acType: string;
  address: string;
  date: Date;
  time: string;
  status: BookingStatus;
}

// Define schema
const BookRequestSchema: Schema<IBookRequest> = new Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    minlength: [2, 'Name must be at least 2 characters']
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    minlength: [10, 'Mobile number must be at least 10 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    validate: {
      validator: (value: string) => {
        return /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(value);
      },
      message: 'Please enter a valid email'
    }
  },
  serviceType: {
    type: String,
    required: [true, 'Service type is required']
  },
  acType: {
    type: String,
    required: [true, 'AC type is required']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    minlength: [10, 'Address must be at least 10 characters']
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  time: {
    type: String,
    required: [true, 'Time is Required']
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ["pending", "completed", "cancelled"] as BookingStatus[],
  }
});

// Check if the model already exists before defining it
const BookRequest = mongoose.models.bookRequests || mongoose.model<IBookRequest>("bookRequests", BookRequestSchema);

export default BookRequest;
